/**
 * POST /api/webhooks/stripe: config, signature, idempotency (TEST-PLAN B13/B14).
 */
import assert from 'node:assert/strict';
import { beforeEach, describe, mock, test } from 'node:test';

process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test';

/** @type {object | null} */
let stripeClient = {};
/** @type {Error | null} */
let constructError = null;
/** @type {object} */
let constructedEvent = { id: 'evt_1', type: 'ping.unknown', data: { object: {} } };
/** @type {{ data: object | null, error: object | null }} */
let existingEvent = { data: null, error: null };
/** @type {{ error: object | null }} */
let insertEventResult = { error: null };
/** @type {{ error: object | null }} */
let customerUpdateResult = { error: null };
/** @type {object[]} */
const customerUpdates = [];
/** @type {object[]} */
const snapshotUpserts = [];

/**
 * @param {{ data?: unknown, error?: object | null }} result
 */
function query(result) {
  const api = {
    select() {
      return api;
    },
    eq() {
      return api;
    },
    insert() {
      return api;
    },
    update(payload) {
      customerUpdates.push(payload);
      return api;
    },
    maybeSingle: async () => result,
    then(resolve, reject) {
      return Promise.resolve(result).then(resolve, reject);
    },
  };
  return api;
}

mock.module('src/libs/stripe/stripe-server.js', {
  exports: {
    getStripe: () => stripeClient,
  },
});

mock.module('src/libs/posthog/capture-server-event.js', {
  exports: {
    captureServerEvent: async () => {},
  },
});

mock.module('src/libs/notifications/create-notification.js', {
  exports: {
    insertNotifications: async () => {},
  },
});

mock.module('src/libs/notifications/social-notification-payloads.js', {
  exports: {
    buildListSocialNotificationData: () => ({}),
    resolveOwnerRecipientExcludingActor: () => [],
  },
});

mock.module('src/libs/stripe/upsert-list-snapshot-purchase.js', {
  exports: {
    upsertListSnapshotPurchase: async (payload) => {
      snapshotUpserts.push(payload);
      return { ok: true };
    },
  },
});

mock.module('src/libs/stripe/fetch-list-item-ids-for-snapshot-capture.js', {
  exports: {
    fetchListItemIdsForSnapshotCapture: async () => ['rid-1'],
  },
});

mock.module('src/libs/supabase/supabase-admin.js', {
  exports: {
    supabaseAdminClient: {
      from(table) {
        if (table === 'stripe_events') {
          const api = {
            select() {
              return api;
            },
            eq() {
              return api;
            },
            insert() {
              return {
                then(resolve, reject) {
                  return Promise.resolve(insertEventResult).then(resolve, reject);
                },
              };
            },
            maybeSingle: async () => existingEvent,
          };
          return api;
        }
        if (table === 'customers') return query(customerUpdateResult);
        return query({ data: null, error: null });
      },
    },
  },
});

const { POST } = await import('../../app/(frontend)/api/webhooks/stripe/route.js');

/**
 * @param {string} [signature]
 */
function req(signature = 't=1,v1=abc') {
  return {
    text: async () => '{}',
    headers: {
      get(name) {
        return name.toLowerCase() === 'stripe-signature' ? signature : null;
      },
    },
  };
}

describe('POST /api/webhooks/stripe', { concurrency: false }, () => {
  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    constructError = null;
    constructedEvent = { id: 'evt_1', type: 'ping.unknown', data: { object: {} } };
    existingEvent = { data: null, error: null };
    insertEventResult = { error: null };
    customerUpdateResult = { error: null };
    customerUpdates.length = 0;
    snapshotUpserts.length = 0;
    stripeClient = {
      webhooks: {
        constructEvent: () => {
          if (constructError) throw constructError;
          return constructedEvent;
        },
      },
    };
  });

  test('unset stripe → 503 webhook_not_configured', async () => {
    stripeClient = null;
    const res = await POST(req());
    assert.equal(res.status, 503);
    assert.equal((await res.json()).error, 'webhook_not_configured');
  });

  test('missing signature → 400 (B14)', async () => {
    const res = await POST(req(null));
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, 'missing_signature');
  });

  test('bad signature → 400 invalid_signature (B14)', async () => {
    constructError = new Error('bad sig');
    const res = await POST(req());
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, 'invalid_signature');
  });

  test('duplicate event id → { received, duplicate } (B13)', async () => {
    existingEvent = { data: { id: 'evt_1' }, error: null };
    const res = await POST(req());
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { received: true, duplicate: true });
  });

  test('idempotency lookup error → 500', async () => {
    existingEvent = { data: null, error: { message: 'db' } };
    const res = await POST(req());
    assert.equal(res.status, 500);
    assert.equal((await res.json()).error, 'idempotency_check_failed');
  });

  test('unknown event type is acknowledged and stored', async () => {
    const res = await POST(req());
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { received: true });
  });

  test('insert unique violation → duplicate', async () => {
    insertEventResult = { error: { code: '23505' } };
    const res = await POST(req());
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { received: true, duplicate: true });
  });

  test('insert other error → 500 idempotency_store_failed', async () => {
    insertEventResult = { error: { code: '40P01', message: 'lock' } };
    const res = await POST(req());
    assert.equal(res.status, 500);
    assert.equal((await res.json()).error, 'idempotency_store_failed');
  });

  test('account.updated writes Connect flags (C2)', async () => {
    constructedEvent = {
      id: 'evt_acct',
      type: 'account.updated',
      data: { object: { id: 'acct_1', charges_enabled: true, payouts_enabled: false } },
    };
    const res = await POST(req());
    assert.equal(res.status, 200);
    assert.equal(customerUpdates[0].stripe_connect_charges_enabled, true);
    assert.equal(customerUpdates[0].stripe_connect_payouts_enabled, false);
  });

  test('account.updated db error → 500 handler_failed', async () => {
    constructedEvent = {
      id: 'evt_acct_fail',
      type: 'account.updated',
      data: { object: { id: 'acct_1', charges_enabled: true, payouts_enabled: true } },
    };
    customerUpdateResult = { error: { message: 'db' } };
    const res = await POST(req());
    assert.equal(res.status, 500);
    assert.equal((await res.json()).error, 'handler_failed');
  });

  test('checkout.session.completed snapshot persists captured items (B10)', async () => {
    constructedEvent = {
      id: 'evt_snap',
      type: 'checkout.session.completed',
      account: 'acct_1',
      data: {
        object: {
          mode: 'payment',
          amount_total: 800,
          currency: 'eur',
          payment_intent: 'pi_1',
          metadata: {
            purchase_type: 'snapshot',
            list_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            buyer_user_id: '11111111-1111-4111-8111-111111111111',
          },
        },
      },
    };
    const res = await POST(req());
    assert.equal(res.status, 200);
    assert.equal(snapshotUpserts.length, 1);
    assert.equal(snapshotUpserts[0].listId, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    assert.equal(snapshotUpserts[0].paymentIntentId, 'pi_1');
    assert.deepEqual(snapshotUpserts[0].capturedListItemIds, ['rid-1']);
  });
});
