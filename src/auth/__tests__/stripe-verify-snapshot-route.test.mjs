/**
 * POST /api/stripe/checkout/verify-snapshot session + persist gates.
 */
import assert from 'node:assert/strict';
import { beforeEach, describe, mock, test } from 'node:test';

const BUYER_ID = '11111111-1111-4111-8111-111111111111';
const LIST_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

/** @type {object | null} */
let stripeClient = {};
/** @type {{ id: string } | null} */
let authUser = { id: BUYER_ID };
/** @type {object | Error} */
let retrievedSession = {};
/** @type {boolean} */
let upsertOk = true;

function paidSnapshot(overrides = {}) {
  return {
    mode: 'payment',
    payment_status: 'paid',
    payment_intent: 'pi_1',
    amount_total: 800,
    currency: 'eur',
    metadata: {
      purchase_type: 'snapshot',
      buyer_user_id: BUYER_ID,
      list_id: LIST_ID,
    },
    ...overrides,
  };
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

mock.module('src/libs/supabase/supabase-server-client.js', {
  exports: {
    getSupabaseAuthUser: async () => ({ data: { user: authUser }, error: null }),
  },
});

mock.module('src/libs/stripe/fetch-list-item-ids-for-snapshot-capture.js', {
  exports: {
    fetchListItemIdsForSnapshotCapture: async () => ['rid-1'],
  },
});

mock.module('src/libs/stripe/upsert-list-snapshot-purchase.js', {
  exports: {
    upsertListSnapshotPurchase: async () => (upsertOk ? { ok: true } : { ok: false, error: 'db' }),
  },
});

const { POST } = await import('../../app/(frontend)/api/stripe/checkout/verify-snapshot/route.js');

/**
 * @param {object | null} body
 */
function req(body) {
  return {
    json: async () => {
      if (body === null) throw new SyntaxError('bad json');
      return body;
    },
  };
}

const VALID = { sessionId: 'cs_test_1', stripeAccountId: 'acct_1' };

describe('POST /api/stripe/checkout/verify-snapshot', { concurrency: false }, () => {
  beforeEach(() => {
    authUser = { id: BUYER_ID };
    upsertOk = true;
    retrievedSession = paidSnapshot();
    stripeClient = {
      checkout: {
        sessions: {
          retrieve: async () => {
            if (retrievedSession instanceof Error) throw retrievedSession;
            return retrievedSession;
          },
        },
      },
    };
  });

  test('stripe unset → 503', async () => {
    stripeClient = null;
    const res = await POST(req(VALID));
    assert.equal(res.status, 503);
    assert.equal((await res.json()).error, 'stripe_not_configured');
  });

  test('no session → 401', async () => {
    authUser = null;
    const res = await POST(req(VALID));
    assert.equal(res.status, 401);
    assert.equal((await res.json()).error, 'unauthorized');
  });

  test('invalid JSON → 400', async () => {
    const res = await POST(req(null));
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, 'invalid_json');
  });

  test('missing fields → 400', async () => {
    const res = await POST(req({ sessionId: 'cs_test_1' }));
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, 'missing_fields');
  });

  test('retrieve throw → 502', async () => {
    retrievedSession = new Error('nope');
    const res = await POST(req(VALID));
    assert.equal(res.status, 502);
    assert.equal((await res.json()).error, 'session_retrieve_failed');
  });

  test('subscription session → 400 wrong_mode', async () => {
    retrievedSession = paidSnapshot({ mode: 'subscription' });
    const res = await POST(req(VALID));
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, 'wrong_mode');
  });

  test('unpaid → 400 not_paid', async () => {
    retrievedSession = paidSnapshot({ payment_status: 'unpaid' });
    const res = await POST(req(VALID));
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, 'not_paid');
  });

  test('wrong purchase_type → 400', async () => {
    retrievedSession = paidSnapshot({ metadata: { purchase_type: 'subscription', buyer_user_id: BUYER_ID, list_id: LIST_ID } });
    const res = await POST(req(VALID));
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, 'wrong_type');
  });

  test('other buyer → 403 forbidden', async () => {
    retrievedSession = paidSnapshot({
      metadata: { purchase_type: 'snapshot', buyer_user_id: '99999999-9999-4999-8999-999999999999', list_id: LIST_ID },
    });
    const res = await POST(req(VALID));
    assert.equal(res.status, 403);
    assert.equal((await res.json()).error, 'forbidden');
  });

  test('missing payment intent → 400', async () => {
    retrievedSession = paidSnapshot({ payment_intent: null });
    const res = await POST(req(VALID));
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, 'no_payment_intent');
  });

  test('upsert fail → 500 persist_failed', async () => {
    upsertOk = false;
    const res = await POST(req(VALID));
    assert.equal(res.status, 500);
    assert.equal((await res.json()).error, 'persist_failed');
  });

  test('paid snapshot for this user → { ok: true }', async () => {
    const res = await POST(req(VALID));
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
  });
});
