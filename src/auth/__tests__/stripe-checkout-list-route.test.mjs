/**
 * POST /api/stripe/checkout/list guard rails (TEST-PLAN B3, B6, B7, B8) without Stripe.
 */
import assert from 'node:assert/strict';
import { beforeEach, describe, mock, test } from 'node:test';

const LIST_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const BUYER_ID = '11111111-1111-4111-8111-111111111111';
const OWNER_ID = '22222222-2222-4222-8222-222222222222';

/** @type {object | null} */
let stripeClient = {};
/** @type {{ id: string, email: string } | null} */
let authUser = { id: BUYER_ID, email: 'buyer@test.co' };
/** @type {{ data: object | null, error: object | null }} */
let listResult = { data: null, error: null };
/** @type {{ data: object | null, error: object | null }} */
let snapResult = { data: null, error: null };
/** @type {{ data: object | null, error: object | null }} */
let ownerResult = { data: null, error: null };
/** @type {{ data: object[] | null, error: object | null }} */
let subRowsResult = { data: [], error: null };
/** @type {{ data: object[] | null, error: object | null }} */
let subListsResult = { data: [], error: null };
/** @type {object | null} */
let lastCheckoutCreate = null;

/**
 * @param {{ data: unknown, error?: object | null }} result
 */
function query(result) {
  const api = {
    select() {
      return api;
    },
    eq() {
      return api;
    },
    in() {
      return api;
    },
    maybeSingle: async () => result,
    then(resolve, reject) {
      return Promise.resolve(result).then(resolve, reject);
    },
  };
  return api;
}

function monetizedList(overrides = {}) {
  return {
    id: LIST_ID,
    user_id: OWNER_ID,
    name: 'Lisbon eats',
    paid_access_enabled: true,
    stripe_price_id: 'price_live',
    monthly_amount_cents: 1000,
    currency: 'eur',
    ...overrides,
  };
}

function readyOwner() {
  return {
    stripe_connect_account_id: 'acct_ready',
    stripe_connect_charges_enabled: true,
  };
}

mock.module('src/libs/stripe/stripe-server.js', {
  exports: {
    getStripe: () => stripeClient,
  },
});

mock.module('src/libs/site-url.js', {
  exports: {
    getSiteUrl: () => 'https://justnomnom.com',
  },
});

mock.module('src/libs/posthog/capture-server-event.js', {
  exports: {
    captureServerEvent: async () => {},
  },
});

mock.module('src/libs/supabase/supabase-admin.js', {
  exports: {
    supabaseAdminClient: {
      from(table) {
        if (table === 'lists') return query(listResult);
        if (table === 'list_snapshot_purchases') return query(snapResult);
        if (table === 'customers') return query(ownerResult);
        return query({ data: null, error: null });
      },
    },
  },
});

mock.module('src/libs/supabase/supabase-server-client.js', {
  exports: {
    getSupabaseAuthUser: async () => ({ data: { user: authUser }, error: null }),
    createSupabaseServerClient: async () => ({
      from(table) {
        if (table === 'list_subscriptions') return query(subRowsResult);
        if (table === 'lists') return query(subListsResult);
        return query({ data: null, error: null });
      },
    }),
  },
});

const { POST } = await import('../../app/(frontend)/api/stripe/checkout/list/route.js');

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

describe('POST /api/stripe/checkout/list', { concurrency: false }, () => {
  beforeEach(() => {
    authUser = { id: BUYER_ID, email: 'buyer@test.co' };
    listResult = { data: monetizedList(), error: null };
    snapResult = { data: null, error: null };
    ownerResult = { data: readyOwner(), error: null };
    subRowsResult = { data: [], error: null };
    subListsResult = { data: [], error: null };
    lastCheckoutCreate = null;
    stripeClient = {
      checkout: {
        sessions: {
          create: async (params, opts) => {
            lastCheckoutCreate = { params, opts };
            return { url: 'https://checkout.stripe.com/c/pay/cs_test' };
          },
        },
      },
    };
  });

  test('stripe unset → 503 stripe_not_configured (B8)', async () => {
    stripeClient = null;
    const res = await POST(req({ listId: LIST_ID }));
    assert.equal(res.status, 503);
    assert.equal((await res.json()).error, 'stripe_not_configured');
  });

  test('invalid JSON → 400', async () => {
    const res = await POST(req(null));
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, 'invalid_json');
  });

  test('missing listId → 400', async () => {
    const res = await POST(req({}));
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, 'missing_list_id');
  });

  test('malformed listId → 400', async () => {
    const res = await POST(req({ listId: 'not-a-uuid' }));
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, 'invalid_list_id');
  });

  test('no session → 401', async () => {
    authUser = null;
    const res = await POST(req({ listId: LIST_ID }));
    assert.equal(res.status, 401);
    assert.equal((await res.json()).error, 'unauthorized');
  });

  test('list load error → 500', async () => {
    listResult = { data: null, error: { message: 'db' } };
    const res = await POST(req({ listId: LIST_ID }));
    assert.equal(res.status, 500);
    assert.equal((await res.json()).error, 'list_load_failed');
  });

  test('flag off → 400 list_not_monetized (B3)', async () => {
    listResult = { data: monetizedList({ paid_access_enabled: false }), error: null };
    const res = await POST(req({ listId: LIST_ID }));
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, 'list_not_monetized');
  });

  test('subscription without price → 400 list_not_monetized', async () => {
    listResult = { data: monetizedList({ stripe_price_id: null }), error: null };
    const res = await POST(req({ listId: LIST_ID }));
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, 'list_not_monetized');
  });

  test('snapshot without monthly amount → 400 list_not_monetized', async () => {
    listResult = { data: monetizedList({ monthly_amount_cents: null }), error: null };
    const res = await POST(req({ listId: LIST_ID, type: 'snapshot' }));
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, 'list_not_monetized');
  });

  test('owner load error → 500', async () => {
    ownerResult = { data: null, error: { message: 'db' } };
    const res = await POST(req({ listId: LIST_ID }));
    assert.equal(res.status, 500);
    assert.equal((await res.json()).error, 'owner_load_failed');
  });

  test('charges disabled → 400 creator_not_ready (B6)', async () => {
    ownerResult = {
      data: { stripe_connect_account_id: 'acct_x', stripe_connect_charges_enabled: false },
      error: null,
    };
    const res = await POST(req({ listId: LIST_ID }));
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, 'creator_not_ready');
  });

  test('owner buying own list → 400 cannot_subscribe_own_list', async () => {
    authUser = { id: OWNER_ID, email: 'owner@test.co' };
    const res = await POST(req({ listId: LIST_ID }));
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, 'cannot_subscribe_own_list');
  });

  test('snapshot already purchased → 400', async () => {
    snapResult = { data: { id: 'snap_1' }, error: null };
    const res = await POST(req({ listId: LIST_ID, type: 'snapshot' }));
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, 'already_purchased');
  });

  test('already subscribed to this creator bundle → 400', async () => {
    subRowsResult = { data: [{ list_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' }], error: null };
    subListsResult = {
      data: [{ user_id: OWNER_ID, paid_access_enabled: true }],
      error: null,
    };
    const res = await POST(req({ listId: LIST_ID }));
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, 'already_subscribed');
  });

  test('evil returnPath is sanitized into success/cancel URLs (B7)', async () => {
    const res = await POST(req({ listId: LIST_ID, returnPath: 'https://evil.com' }));
    assert.equal(res.status, 200);
    assert.equal((await res.json()).url, 'https://checkout.stripe.com/c/pay/cs_test');
    assert.match(lastCheckoutCreate.params.success_url, new RegExp(`/lists/${LIST_ID}\\?checkout=success`));
    assert.match(lastCheckoutCreate.params.cancel_url, new RegExp(`/lists/${LIST_ID}\\?checkout=cancel`));
    assert.equal(lastCheckoutCreate.opts.stripeAccount, 'acct_ready');
  });

  test('snapshot checkout returns a session URL', async () => {
    const res = await POST(req({ listId: LIST_ID, type: 'snapshot', returnPath: '/dashboard/lists/x' }));
    assert.equal(res.status, 200);
    assert.equal((await res.json()).url, 'https://checkout.stripe.com/c/pay/cs_test');
    assert.equal(lastCheckoutCreate.params.mode, 'payment');
    assert.match(lastCheckoutCreate.params.success_url, /\/dashboard\/lists\/x\?checkout=success/);
  });

  test('sessions.create throw → 502 checkout_session_failed', async () => {
    stripeClient.checkout.sessions.create = async () => {
      throw new Error('stripe down');
    };
    const res = await POST(req({ listId: LIST_ID }));
    assert.equal(res.status, 502);
    assert.equal((await res.json()).error, 'checkout_session_failed');
  });

  test('session without url → 500 no_session_url', async () => {
    stripeClient.checkout.sessions.create = async () => ({ url: null });
    const res = await POST(req({ listId: LIST_ID }));
    assert.equal(res.status, 500);
    assert.equal((await res.json()).error, 'no_session_url');
  });
});
