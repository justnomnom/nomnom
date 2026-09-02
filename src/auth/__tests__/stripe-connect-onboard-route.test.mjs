/**
 * POST /api/stripe/connect/onboard branches (TEST-PLAN C1) without calling Stripe.
 */
import assert from 'node:assert/strict';
import { beforeEach, describe, mock, test } from 'node:test';

const USER_ID = '11111111-1111-4111-8111-111111111111';

/** @type {object | null} */
let stripeClient = {};
/** @type {{ id: string, email: string } | null} */
let authUser = { id: USER_ID, email: 'creator@test.co' };
/** @type {{ data: object | null, error: object | null }} */
let customerRow = { data: { stripe_connect_account_id: null }, error: null };
/** @type {object | null} */
let upsertError = null;
/** @type {object[]} */
const upserts = [];
/** @type {object | null} */
let lastAccountLink = null;

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
    upsert(payload, opts) {
      upserts.push({ payload, opts });
      return {
        then(resolve, reject) {
          return Promise.resolve({ error: upsertError }).then(resolve, reject);
        },
      };
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

mock.module('src/libs/posthog/capture-server-event.js', {
  exports: {
    captureServerEvent: async () => {},
  },
});

mock.module('src/libs/supabase/supabase-server-client.js', {
  exports: {
    getSupabaseAuthUser: async () => ({ data: { user: authUser }, error: null }),
    createSupabaseServerClient: async () => ({
      from() {
        return query(customerRow);
      },
    }),
  },
});

const { POST } = await import('../../app/(frontend)/api/stripe/connect/onboard/route.js');

describe('POST /api/stripe/connect/onboard', { concurrency: false }, () => {
  beforeEach(() => {
    authUser = { id: USER_ID, email: 'creator@test.co' };
    customerRow = { data: { stripe_connect_account_id: null }, error: null };
    upsertError = null;
    upserts.length = 0;
    lastAccountLink = null;
    stripeClient = {
      accounts: {
        create: async () => ({ id: 'acct_new' }),
        retrieve: async () => ({ charges_enabled: false, details_submitted: false }),
        createLoginLink: async () => ({ url: 'https://connect.stripe.com/express/login' }),
      },
      accountLinks: {
        create: async (params) => {
          lastAccountLink = params;
          return { url: 'https://connect.stripe.com/setup/s/new' };
        },
      },
    };
  });

  test('stripe unset → 503', async () => {
    stripeClient = null;
    const res = await POST();
    assert.equal(res.status, 503);
    assert.equal((await res.json()).error, 'stripe_not_configured');
  });

  test('no session → 401', async () => {
    authUser = null;
    const res = await POST();
    assert.equal(res.status, 401);
    assert.equal((await res.json()).error, 'unauthorized');
  });

  test('customers fetch error → 500 profile_load_failed', async () => {
    customerRow = { data: null, error: { message: 'db' } };
    const res = await POST();
    assert.equal(res.status, 500);
    assert.equal((await res.json()).error, 'profile_load_failed');
  });

  test('new account: creates Express account, saves id, returns onboarding URL', async () => {
    const res = await POST();
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.url, 'https://connect.stripe.com/setup/s/new');
    assert.equal(upserts[0].payload.stripe_connect_account_id, 'acct_new');
    assert.equal(lastAccountLink.account, 'acct_new');
    assert.equal(lastAccountLink.type, 'account_onboarding');
    assert.match(lastAccountLink.return_url, /\/dashboard\/settings\/billing\?connect=return/);
  });

  test('account upsert fail → 500 account_save_failed', async () => {
    upsertError = { message: 'unique' };
    const res = await POST();
    assert.equal(res.status, 500);
    assert.equal((await res.json()).error, 'account_save_failed');
  });

  test('ready Connect account returns Express dashboard login link', async () => {
    customerRow = { data: { stripe_connect_account_id: 'acct_ready' }, error: null };
    stripeClient.accounts.retrieve = async () => ({
      charges_enabled: true,
      details_submitted: true,
    });
    const res = await POST();
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), {
      url: 'https://connect.stripe.com/express/login',
      mode: 'dashboard',
    });
  });

  test('stale account id is reset and a new onboarding link is issued', async () => {
    customerRow = { data: { stripe_connect_account_id: 'acct_gone' }, error: null };
    stripeClient.accountLinks.create = async (params) => {
      lastAccountLink = params;
      if (params.account === 'acct_gone') {
        const err = new Error('No such account');
        err.code = 'resource_missing';
        err.param = 'account';
        throw err;
      }
      return { url: 'https://connect.stripe.com/setup/s/reset' };
    };
    const res = await POST();
    assert.equal(res.status, 200);
    assert.equal((await res.json()).url, 'https://connect.stripe.com/setup/s/reset');
    assert.equal(lastAccountLink.account, 'acct_new');
    assert.equal(upserts.some((u) => u.payload.stripe_connect_account_id === null), true);
  });

  test('accountLinks.create other errors → 502 account_link_failed', async () => {
    customerRow = { data: { stripe_connect_account_id: 'acct_ready' }, error: null };
    stripeClient.accountLinks.create = async () => {
      throw Object.assign(new Error('boom'), { type: 'api_error', code: 'rate_limit' });
    };
    const res = await POST();
    assert.equal(res.status, 502);
    const body = await res.json();
    assert.equal(body.error, 'account_link_failed');
    assert.equal(body.stripe_code, 'rate_limit');
  });
});
