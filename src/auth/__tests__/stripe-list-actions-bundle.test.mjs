/**
 * syncSubscriberListsBundlePrice: Stripe product/price create and list updates.
 */
import assert from 'node:assert/strict';
import { beforeEach, describe, mock, test } from 'node:test';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const LIST_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const LIST_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

/** @type {{ id: string } | null} */
let authUser = { id: USER_ID };
/** @type {ReturnType<typeof makeSupabaseMock> | null} */
let supabase = null;
/** @type {object | null} */
let stripeClient = null;

mock.module('src/libs/supabase/supabase-server-client.js', {
  exports: {
    createSupabaseServerClient: async () => supabase,
    getSupabaseAuthUser: async () => ({ data: { user: authUser }, error: null }),
  },
});

mock.module('src/libs/stripe/stripe-server.js', {
  exports: {
    getStripe: () => stripeClient,
  },
});

const { syncSubscriberListsBundlePrice, getMyStripeConnectStatus } = await import(
  '../actions/stripe-list-actions.js'
);

/**
 * @param {(ctx: object) => object} handler
 */
function makeSupabaseMock(handler) {
  const calls = [];

  function resolve(ctx) {
    calls.push(ctx);
    return Promise.resolve(handler(ctx)).then((result) => {
      if (result && typeof result === 'object' && ('data' in result || 'error' in result)) {
        return result;
      }
      return { data: result ?? null, error: null };
    });
  }

  function builder(table) {
    const ctx = {
      kind: 'from',
      table,
      op: 'select',
      payload: undefined,
      filter: {},
    };
    const api = {
      select() {
        if (ctx.op !== 'update' && ctx.op !== 'upsert') ctx.op = 'select';
        return api;
      },
      update(payload) {
        ctx.op = 'update';
        ctx.payload = payload;
        return api;
      },
      upsert(payload, opts) {
        ctx.op = 'upsert';
        ctx.payload = payload;
        ctx.upsertOpts = opts;
        return api;
      },
      eq(col, val) {
        ctx.filter[col] = val;
        return api;
      },
      in(col, vals) {
        ctx.inFilter = { col, vals };
        return api;
      },
      maybeSingle() {
        return resolve({ ...ctx, single: 'maybe' });
      },
      then(onFulfilled, onRejected) {
        return resolve({ ...ctx }).then(onFulfilled, onRejected);
      },
    };
    return api;
  }

  return {
    calls,
    from(table) {
      return builder(table);
    },
  };
}

const CONNECTED = {
  stripe_connect_account_id: 'acct_123',
  stripe_connect_charges_enabled: true,
};

describe('syncSubscriberListsBundlePrice Stripe write path', { concurrency: false }, () => {
  beforeEach(() => {
    authUser = { id: USER_ID };
    stripeClient = { prices: {}, products: {} };
    supabase = null;
  });

  test('invalid / out-of-bounds price', async () => {
    assert.deepEqual(await syncSubscriberListsBundlePrice({ monthlyAmountCents: 'x' }), {
      error: 'invalid_price',
    });
    assert.deepEqual(await syncSubscriberListsBundlePrice({ monthlyAmountCents: 1 }), {
      error: 'price_out_of_bounds',
    });
  });

  test('profile_load_failed and lists load_failed', async () => {
    supabase = makeSupabaseMock((ctx) => {
      if (ctx.table === 'customers') return { data: null, error: { message: 'db' } };
      return { data: [], error: null };
    });
    assert.deepEqual(await syncSubscriberListsBundlePrice({ monthlyAmountCents: 499 }), {
      error: 'profile_load_failed',
    });

    supabase = makeSupabaseMock((ctx) => {
      if (ctx.table === 'customers') return { data: CONNECTED, error: null };
      if (ctx.table === 'lists') return { data: null, error: { message: 'db' } };
      return { data: [], error: null };
    });
    assert.deepEqual(await syncSubscriberListsBundlePrice({ monthlyAmountCents: 499 }), {
      error: 'load_failed',
    });
  });

  test('matching published price is a no-op; unpublished rows still get cents', async () => {
    supabase = makeSupabaseMock((ctx) => {
      if (ctx.table === 'customers') return { data: CONNECTED, error: null };
      if (ctx.table === 'lists' && ctx.op === 'select') {
        return {
          data: [
            {
              id: LIST_ID,
              published_at: '2026-01-01',
              paid_access_enabled: true,
              monthly_amount_cents: 499,
              currency: 'eur',
              stripe_price_id: 'price_1',
              stripe_product_id: 'prod_1',
            },
            {
              id: LIST_B,
              published_at: null,
              paid_access_enabled: false,
              monthly_amount_cents: 399,
              currency: 'eur',
              stripe_price_id: null,
              stripe_product_id: null,
            },
          ],
          error: null,
        };
      }
      return { data: null, error: null };
    });
    assert.deepEqual(await syncSubscriberListsBundlePrice({ monthlyAmountCents: 499 }), {
      error: null,
    });
    const unpublished = supabase.calls.find(
      (c) => c.table === 'lists' && c.op === 'update' && c.inFilter?.vals?.includes(LIST_B)
    );
    assert.deepEqual(unpublished.payload, { monthly_amount_cents: 499, currency: 'eur' });
    assert.equal(
      supabase.calls.some((c) => c.table === 'lists' && c.op === 'update' && c.payload?.stripe_price_id),
      false
    );
  });

  test('creates Stripe product + price and stamps published lists', async () => {
    stripeClient = {
      products: {
        create: async (body, opts) => {
          assert.equal(opts.stripeAccount, 'acct_123');
          assert.equal(body.metadata.creator_user_id, USER_ID);
          return { id: 'prod_new' };
        },
      },
      prices: {
        create: async (body, opts) => {
          assert.equal(opts.stripeAccount, 'acct_123');
          assert.equal(body.unit_amount, 599);
          assert.equal(body.currency, 'eur');
          return { id: 'price_new' };
        },
      },
    };
    supabase = makeSupabaseMock((ctx) => {
      if (ctx.table === 'customers') return { data: CONNECTED, error: null };
      if (ctx.table === 'lists' && ctx.op === 'select') {
        return {
          data: [
            {
              id: LIST_ID,
              published_at: '2026-01-01',
              paid_access_enabled: false,
              monthly_amount_cents: 399,
              currency: 'eur',
              stripe_price_id: null,
              stripe_product_id: null,
            },
          ],
          error: null,
        };
      }
      return { data: null, error: null };
    });
    assert.deepEqual(await syncSubscriberListsBundlePrice({ monthlyAmountCents: 599 }), {
      error: null,
    });
    const published = supabase.calls.find(
      (c) => c.table === 'lists' && c.op === 'update' && c.payload?.stripe_price_id === 'price_new'
    );
    assert.equal(published.payload.paid_access_enabled, true);
    assert.equal(published.payload.stripe_product_id, 'prod_new');
  });

  test('stripe_product_failed and save_failed', async () => {
    stripeClient = {
      products: {
        create: async () => {
          throw new Error('stripe_down');
        },
      },
      prices: { create: async () => ({ id: 'x' }) },
    };
    supabase = makeSupabaseMock((ctx) => {
      if (ctx.table === 'customers') return { data: CONNECTED, error: null };
      if (ctx.table === 'lists' && ctx.op === 'select') {
        return {
          data: [
            {
              id: LIST_ID,
              published_at: '2026-01-01',
              paid_access_enabled: false,
              monthly_amount_cents: 399,
              currency: 'eur',
              stripe_price_id: null,
              stripe_product_id: null,
            },
          ],
          error: null,
        };
      }
      return { data: null, error: null };
    });
    assert.deepEqual(await syncSubscriberListsBundlePrice({ monthlyAmountCents: 499 }), {
      error: 'stripe_product_failed',
    });

    stripeClient = {
      products: { create: async () => ({ id: 'prod_new' }) },
      prices: { create: async () => ({ id: 'price_new' }) },
    };
    supabase = makeSupabaseMock((ctx) => {
      if (ctx.table === 'customers') return { data: CONNECTED, error: null };
      if (ctx.table === 'lists' && ctx.op === 'select') {
        return {
          data: [
            {
              id: LIST_ID,
              published_at: '2026-01-01',
              paid_access_enabled: false,
              monthly_amount_cents: 399,
              currency: 'eur',
              stripe_price_id: null,
              stripe_product_id: null,
            },
          ],
          error: null,
        };
      }
      if (ctx.table === 'lists' && ctx.op === 'update') {
        return { data: null, error: { message: 'write' } };
      }
      return { data: null, error: null };
    });
    assert.deepEqual(await syncSubscriberListsBundlePrice({ monthlyAmountCents: 499 }), {
      error: 'save_failed',
    });
  });
});

describe('getMyStripeConnectStatus Stripe refresh', { concurrency: false }, () => {
  beforeEach(() => {
    authUser = { id: USER_ID };
    stripeClient = null;
    supabase = null;
  });

  test('load_failed when customers select errors', async () => {
    stripeClient = { accounts: { retrieve: async () => ({}) } };
    supabase = makeSupabaseMock(() => ({ data: null, error: { message: 'db' } }));
    assert.deepEqual(await getMyStripeConnectStatus(), { error: 'load_failed' });
  });

  test('persists Stripe flags when they differ from the customers row', async () => {
    stripeClient = {
      accounts: {
        retrieve: async (id) => {
          assert.equal(id, 'acct_123');
          return { charges_enabled: true, payouts_enabled: true };
        },
      },
    };
    supabase = makeSupabaseMock((ctx) => {
      if (ctx.table === 'customers' && ctx.single === 'maybe') {
        return {
          data: {
            stripe_connect_account_id: 'acct_123',
            stripe_connect_charges_enabled: false,
            stripe_connect_payouts_enabled: false,
          },
          error: null,
        };
      }
      return { data: null, error: null };
    });
    const status = await getMyStripeConnectStatus();
    assert.equal(status.accountId, 'acct_123');
    assert.equal(status.chargesEnabled, true);
    assert.equal(status.payoutsEnabled, true);
    assert.equal(status.defaultCountry, 'PT');
    const upsert = supabase.calls.find((c) => c.table === 'customers' && c.op === 'upsert');
    assert.equal(upsert.payload.stripe_connect_charges_enabled, true);
    assert.equal(upsert.upsertOpts.onConflict, 'id');
  });

  test('retrieve throw keeps DB flags', async () => {
    stripeClient = {
      accounts: {
        retrieve: async () => {
          throw new Error('stripe_down');
        },
      },
    };
    supabase = makeSupabaseMock(() => ({
      data: {
        stripe_connect_account_id: 'acct_123',
        stripe_connect_charges_enabled: true,
        stripe_connect_payouts_enabled: false,
      },
      error: null,
    }));
    const status = await getMyStripeConnectStatus();
    assert.equal(status.chargesEnabled, true);
    assert.equal(status.payoutsEnabled, false);
    assert.equal(
      supabase.calls.some((c) => c.op === 'upsert'),
      false
    );
  });
});
