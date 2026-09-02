/**
 * POST /api/stripe/billing-portal ownership and Stripe-session gates.
 */
import assert from 'node:assert/strict';
import { beforeEach, describe, mock, test } from 'node:test';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '22222222-2222-4222-8222-222222222222';
const SUB_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

/** @type {object | null} */
let stripeClient = {};
/** @type {{ id: string } | null} */
let authUser = { id: USER_ID };
/** @type {{ data: object | null, error: object | null }} */
let subRow = { data: null, error: null };
/** @type {Error | null} */
let portalCreateError = null;

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

mock.module('src/libs/site-url.js', {
  exports: {
    getSiteUrl: () => 'https://justnomnom.com',
  },
});

mock.module('src/libs/supabase/supabase-server-client.js', {
  exports: {
    getSupabaseAuthUser: async () => ({ data: { user: authUser }, error: null }),
    createSupabaseServerClient: async () => ({
      from() {
        return query(subRow);
      },
    }),
  },
});

const { POST } = await import('../../app/(frontend)/api/stripe/billing-portal/route.js');

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

function ownRow(overrides = {}) {
  return {
    id: SUB_ID,
    subscriber_user_id: USER_ID,
    stripe_customer_id: 'cus_1',
    stripe_connect_account_id: 'acct_1',
    ...overrides,
  };
}

describe('POST /api/stripe/billing-portal', { concurrency: false }, () => {
  beforeEach(() => {
    authUser = { id: USER_ID };
    subRow = { data: ownRow(), error: null };
    portalCreateError = null;
    stripeClient = {
      billingPortal: {
        sessions: {
          create: async (params, opts) => {
            if (portalCreateError) throw portalCreateError;
            return { url: 'https://billing.stripe.com/p/session', params, opts };
          },
        },
      },
    };
  });

  test('stripe unset → 503', async () => {
    stripeClient = null;
    const res = await POST(req({ listSubscriptionId: SUB_ID }));
    assert.equal(res.status, 503);
    assert.equal((await res.json()).error, 'stripe_not_configured');
  });

  test('no session → 401', async () => {
    authUser = null;
    const res = await POST(req({ listSubscriptionId: SUB_ID }));
    assert.equal(res.status, 401);
    assert.equal((await res.json()).error, 'unauthorized');
  });

  test('invalid JSON → 400', async () => {
    const res = await POST(req(null));
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, 'invalid_json');
  });

  test('missing id → 400 invalid_id', async () => {
    const res = await POST(req({}));
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, 'invalid_id');
  });

  test('load error → 500', async () => {
    subRow = { data: null, error: { message: 'db' } };
    const res = await POST(req({ listSubscriptionId: SUB_ID }));
    assert.equal(res.status, 500);
    assert.equal((await res.json()).error, 'load_failed');
  });

  test('unknown row → 404', async () => {
    subRow = { data: null, error: null };
    const res = await POST(req({ listSubscriptionId: SUB_ID }));
    assert.equal(res.status, 404);
    assert.equal((await res.json()).error, 'not_found');
  });

  test('other subscriber → 403 forbidden', async () => {
    subRow = { data: ownRow({ subscriber_user_id: OTHER_ID }), error: null };
    const res = await POST(req({ listSubscriptionId: SUB_ID }));
    assert.equal(res.status, 403);
    assert.equal((await res.json()).error, 'forbidden');
  });

  test('missing stripe ids → 409 invalid_row', async () => {
    subRow = { data: ownRow({ stripe_customer_id: null }), error: null };
    const res = await POST(req({ listSubscriptionId: SUB_ID }));
    assert.equal(res.status, 409);
    assert.equal((await res.json()).error, 'invalid_row');
  });

  test('portal create throw → 502', async () => {
    portalCreateError = new Error('stripe');
    const res = await POST(req({ listSubscriptionId: SUB_ID }));
    assert.equal(res.status, 502);
    assert.equal((await res.json()).error, 'portal_session_failed');
  });

  test('own subscription → portal URL on the Connect account', async () => {
    const res = await POST(req({ listSubscriptionId: SUB_ID }));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.url, 'https://billing.stripe.com/p/session');
  });
});
