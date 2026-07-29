import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

import {
  tearDownUserStripe,
  isAlreadyGoneStripeError,
  hasUnsettledConnectBalance,
  selectCancellableSubscriptionRows,
} from '../user-stripe-teardown.js';

describe('selectCancellableSubscriptionRows', () => {
  test('keeps rows with a cancellable status and both stripe ids', () => {
    const { cancellable, unactionable } = selectCancellableSubscriptionRows([
      { id: 'a', status: 'active', stripe_subscription_id: 'sub_1', stripe_connect_account_id: 'acct_1' },
      { id: 'b', status: 'trialing', stripe_subscription_id: 'sub_2', stripe_connect_account_id: 'acct_2' },
    ]);
    assert.deepEqual(
      cancellable.map((r) => r.subscriptionId),
      ['sub_1', 'sub_2']
    );
    assert.deepEqual(unactionable, []);
  });

  test('drops already-terminal statuses', () => {
    const { cancellable } = selectCancellableSubscriptionRows([
      { id: 'a', status: 'canceled', stripe_subscription_id: 'sub_1', stripe_connect_account_id: 'acct_1' },
      { id: 'b', status: 'incomplete_expired', stripe_subscription_id: 'sub_2', stripe_connect_account_id: 'acct_2' },
    ]);
    assert.deepEqual(cancellable, []);
  });

  test('reports rows missing stripe ids rather than dropping them silently', () => {
    const { cancellable, unactionable } = selectCancellableSubscriptionRows([
      { id: 'a', status: 'active', stripe_subscription_id: null, stripe_connect_account_id: 'acct_1' },
      { id: 'b', status: 'active', stripe_subscription_id: 'sub_2', stripe_connect_account_id: null },
    ]);
    assert.deepEqual(cancellable, []);
    assert.deepEqual(unactionable, ['a', 'b']);
  });

  test('tolerates junk input', () => {
    assert.deepEqual(selectCancellableSubscriptionRows(null).cancellable, []);
    assert.deepEqual(selectCancellableSubscriptionRows([null, 'x', 42]).cancellable, []);
  });
});

describe('isAlreadyGoneStripeError', () => {
  test('treats missing or already-cancelled subscriptions as success', () => {
    assert.equal(isAlreadyGoneStripeError(new Error('No such subscription: sub_1')), true);
    assert.equal(isAlreadyGoneStripeError(new Error('Subscription is already canceled')), true);
    assert.equal(isAlreadyGoneStripeError(new Error('already cancelled')), true);
  });

  test('does not swallow real failures', () => {
    assert.equal(isAlreadyGoneStripeError(new Error('Rate limit exceeded')), false);
    assert.equal(isAlreadyGoneStripeError(new Error('api_connection_error')), false);
    assert.equal(isAlreadyGoneStripeError(null), false);
  });
});

describe('hasUnsettledConnectBalance', () => {
  test('detects money in available or pending', () => {
    assert.equal(hasUnsettledConnectBalance({ available: [{ amount: 500 }], pending: [] }), true);
    assert.equal(hasUnsettledConnectBalance({ available: [], pending: [{ amount: 1 }] }), true);
  });

  test('zero and empty balances are settled', () => {
    assert.equal(hasUnsettledConnectBalance({ available: [{ amount: 0 }], pending: [{ amount: 0 }] }), false);
    assert.equal(hasUnsettledConnectBalance({}), false);
    assert.equal(hasUnsettledConnectBalance(null), false);
  });

  test('ignores malformed entries instead of throwing', () => {
    assert.equal(hasUnsettledConnectBalance({ available: [{ amount: 'lots' }, null] }), false);
  });
});

// ---------------------------------------------------------------------------
// Orchestration. Deps are injected, so no Stripe and no database here.
// ---------------------------------------------------------------------------

/** Minimal supabase double covering the three queries the teardown makes. */
function fakeSupabase({ subscriptions = [], customer = null, subError = null } = {}) {
  const calls = { updates: [] };
  return {
    calls,
    from(table) {
      if (table === 'list_subscriptions') {
        const builder = {
          select: () => builder,
          eq: () => (subError ? Promise.resolve({ data: null, error: subError }) : builder),
          in(_col, values) {
            calls.updates.push(values);
            return Promise.resolve({ error: null });
          },
          update() {
            return { eq: () => ({ in: builder.in }) };
          },
          then(resolve) {
            return resolve({ data: subscriptions, error: subError });
          },
        };
        return builder;
      }
      if (table === 'customers') {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: () => Promise.resolve({ data: customer, error: null }) }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };
}

function fakeStripe({ cancel, balance = { available: [], pending: [] } } = {}) {
  const cancelled = [];
  return {
    cancelled,
    subscriptions: {
      cancel: async (id, _params, options) => {
        cancelled.push({ id, stripeAccount: options?.stripeAccount });
        if (cancel) return cancel(id);
        return { id, status: 'canceled' };
      },
    },
    balance: { retrieve: async () => balance },
  };
}

describe('tearDownUserStripe', () => {
  test('cancels every live subscription on its own connect account', async () => {
    const supabase = fakeSupabase({
      subscriptions: [
        { id: 'a', status: 'active', stripe_subscription_id: 'sub_1', stripe_connect_account_id: 'acct_1' },
        { id: 'b', status: 'past_due', stripe_subscription_id: 'sub_2', stripe_connect_account_id: 'acct_2' },
      ],
    });
    const stripe = fakeStripe();

    const out = await tearDownUserStripe({ userId: 'u1', supabase, stripe });

    assert.equal(out.ok, true);
    assert.deepEqual(out.cancelled, ['sub_1', 'sub_2']);
    assert.deepEqual(stripe.cancelled, [
      { id: 'sub_1', stripeAccount: 'acct_1' },
      { id: 'sub_2', stripeAccount: 'acct_2' },
    ]);
  });

  test('aborts when a cancel fails, so deletion cannot proceed', async () => {
    const supabase = fakeSupabase({
      subscriptions: [
        { id: 'a', status: 'active', stripe_subscription_id: 'sub_1', stripe_connect_account_id: 'acct_1' },
      ],
    });
    const stripe = fakeStripe({
      cancel: () => {
        throw new Error('Rate limit exceeded');
      },
    });

    const out = await tearDownUserStripe({ userId: 'u1', supabase, stripe });

    assert.equal(out.ok, false);
    assert.equal(out.error, 'stripe_cancel_failed');
  });

  test('an already-cancelled subscription is not a failure', async () => {
    const supabase = fakeSupabase({
      subscriptions: [
        { id: 'a', status: 'active', stripe_subscription_id: 'sub_1', stripe_connect_account_id: 'acct_1' },
      ],
    });
    const stripe = fakeStripe({
      cancel: () => {
        throw new Error('No such subscription: sub_1');
      },
    });

    const out = await tearDownUserStripe({ userId: 'u1', supabase, stripe });

    assert.equal(out.ok, true);
    assert.deepEqual(out.cancelled, ['sub_1']);
  });

  test('refuses to delete when Stripe is unconfigured but live subscriptions exist', async () => {
    const supabase = fakeSupabase({
      subscriptions: [
        { id: 'a', status: 'active', stripe_subscription_id: 'sub_1', stripe_connect_account_id: 'acct_1' },
      ],
    });

    const out = await tearDownUserStripe({ userId: 'u1', supabase, stripe: null });

    assert.equal(out.ok, false);
    assert.equal(out.error, 'stripe_not_configured');
  });

  test('a user with no subscriptions and no connect account tears down cleanly', async () => {
    const out = await tearDownUserStripe({ userId: 'u1', supabase: fakeSupabase(), stripe: null });
    assert.equal(out.ok, true);
    assert.deepEqual(out.cancelled, []);
    assert.equal(out.connectAccountId, null);
  });

  test('blocks deletion while the creator still has money in Connect', async () => {
    const supabase = fakeSupabase({ customer: { stripe_connect_account_id: 'acct_c' } });
    const stripe = fakeStripe({ balance: { available: [{ amount: 4200 }], pending: [] } });

    const out = await tearDownUserStripe({ userId: 'u1', supabase, stripe });

    assert.equal(out.ok, false);
    assert.equal(out.error, 'connect_balance_outstanding');
    assert.equal(out.connectAccountId, 'acct_c');
  });

  test('allows deletion when the connect balance is settled', async () => {
    const supabase = fakeSupabase({ customer: { stripe_connect_account_id: 'acct_c' } });
    const stripe = fakeStripe({ balance: { available: [{ amount: 0 }], pending: [{ amount: 0 }] } });

    const out = await tearDownUserStripe({ userId: 'u1', supabase, stripe });

    assert.equal(out.ok, true);
    assert.equal(out.connectAccountId, 'acct_c');
  });

  test('a subscription lookup failure aborts rather than proceeding blind', async () => {
    const supabase = fakeSupabase({ subError: { message: 'boom' } });
    const out = await tearDownUserStripe({ userId: 'u1', supabase, stripe: fakeStripe() });
    assert.equal(out.ok, false);
    assert.equal(out.error, 'stripe_teardown_lookup_failed');
  });
});
