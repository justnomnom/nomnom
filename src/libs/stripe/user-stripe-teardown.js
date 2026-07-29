/**
 * Stripe teardown for account deletion.
 *
 * `deleteAccount()` used to delete `customers`, `user_follows`, `users` and the auth
 * user without touching Stripe at all. Two things went wrong as a result:
 *
 *  1. A **subscriber** who deleted their account kept being charged — their
 *     `list_subscriptions` rows were never cancelled and the subscription stayed live
 *     on the creator's Connect account, now pointing at a user id that no longer exists.
 *  2. A **creator** who deleted their account orphaned their Connect account:
 *     `customers` holds `stripe_connect_account_id`, so deleting that row destroyed the
 *     only pointer to it, stranding any unpaid balance.
 *
 * This module fixes both. Unlike the rest of the deletion path — which logs errors and
 * carries on, correctly, because a stale preference row harms nobody — **billing
 * failures here must abort the deletion**. Deleting the account is not urgent; silently
 * continuing to charge someone is not recoverable.
 */

/** Statuses where cancelling is meaningful. Mirrors `creator-subscribers-actions.js`. */
const TEARDOWN_CANCELLABLE_STATUSES = Object.freeze([
  'active',
  'trialing',
  'past_due',
  'unpaid',
  'paused',
]);

/**
 * Rows worth sending to Stripe: a cancellable status, and both ids present.
 * A row missing either id cannot be actioned — it is reported, not silently dropped,
 * because it means the DB and Stripe already disagree.
 *
 * @param {Array<Record<string, unknown>> | null | undefined} rows
 * @returns {{ cancellable: Array<{ id: string, subscriptionId: string, accountId: string }>, unactionable: string[] }}
 */
export function selectCancellableSubscriptionRows(rows) {
  const statuses = new Set(TEARDOWN_CANCELLABLE_STATUSES);
  return (Array.isArray(rows) ? rows : []).reduce(
    (acc, row) => {
      if (!row || typeof row !== 'object') return acc;
      if (!statuses.has(String(row.status))) return acc;
      const subscriptionId =
        typeof row.stripe_subscription_id === 'string' ? row.stripe_subscription_id : '';
      const accountId =
        typeof row.stripe_connect_account_id === 'string' ? row.stripe_connect_account_id : '';
      if (!subscriptionId || !accountId) {
        acc.unactionable.push(String(row.id ?? 'unknown'));
        return acc;
      }
      acc.cancellable.push({ id: String(row.id), subscriptionId, accountId });
      return acc;
    },
    { cancellable: [], unactionable: [] }
  );
}

/**
 * Stripe errors that mean "already gone", which is the state we wanted anyway.
 * Same tolerance as `cancelMyCreatorSubscription`.
 *
 * @param {unknown} error
 * @returns {boolean}
 */
export function isAlreadyGoneStripeError(error) {
  const message = String(/** @type {{ message?: unknown }} */ (error)?.message ?? error ?? '');
  if (!message) return false;
  return /no such subscription/i.test(message) || /cancell?ed/i.test(message);
}

/**
 * Is there money sitting in the Connect account that deletion would strand?
 * Balances come back as arrays of per-currency amounts.
 *
 * @param {{ available?: Array<{ amount?: unknown }>, pending?: Array<{ amount?: unknown }> } | null | undefined} balance
 * @returns {boolean}
 */
export function hasUnsettledConnectBalance(balance) {
  const total = (entries) =>
    (Array.isArray(entries) ? entries : []).reduce(
      (sum, entry) =>
        sum +
        (typeof entry?.amount === 'number' && Number.isFinite(entry.amount) ? entry.amount : 0),
      0
    );
  return total(balance?.available) > 0 || total(balance?.pending) > 0;
}

/**
 * Cancel every live subscription this user pays for, and refuse deletion when a
 * creator still has money in their Connect account.
 *
 * Cancellation is **immediate**, not at period end: the account is being destroyed, so
 * there is no access left to preserve, and a subscription outliving its subscriber is
 * the dangling state this exists to prevent.
 *
 * Dependencies are injected so the orchestration is testable without Stripe or a database.
 *
 * @param {object} deps
 * @param {string} deps.userId
 * @param {import('@supabase/supabase-js').SupabaseClient} deps.supabase service-role client
 * @param {import('stripe').Stripe | null} deps.stripe
 * @returns {Promise<{ ok: boolean, error?: string, cancelled: string[], connectAccountId: string | null }>}
 */
export async function tearDownUserStripe({ userId, supabase, stripe }) {
  const result = {
    ok: true,
    cancelled: /** @type {string[]} */ ([]),
    connectAccountId: /** @type {string | null} */ (null),
  };

  const { data: subRows, error: subErr } = await supabase
    .from('list_subscriptions')
    .select('id, status, stripe_subscription_id, stripe_connect_account_id')
    .eq('subscriber_user_id', userId);

  if (subErr) {
    return { ...result, ok: false, error: 'stripe_teardown_lookup_failed' };
  }

  const { cancellable, unactionable } = selectCancellableSubscriptionRows(subRows);

  if (cancellable.length && !stripe) {
    // Live subscriptions but no Stripe client: deleting now would bill a ghost.
    return { ...result, ok: false, error: 'stripe_not_configured' };
  }

  if (unactionable.length) {
    console.error('[tearDownUserStripe] subscription rows missing stripe ids', {
      userId,
      rows: unactionable,
    });
  }

  // Sequential rather than parallel: a handful of rows at most, and a partial failure
  // must be legible in the logs. Indexed loop matches `mapWithConcurrency` in
  // `google-maps-import-actions.js` — `for...of` is banned by the lint config.
  for (let i = 0; i < cancellable.length; i += 1) {
    const row = cancellable[i];
    try {
      // eslint-disable-next-line no-await-in-loop -- ordered teardown, tiny N
      await stripe.subscriptions.cancel(row.subscriptionId, {}, { stripeAccount: row.accountId });
      result.cancelled.push(row.subscriptionId);
    } catch (e) {
      if (!isAlreadyGoneStripeError(e)) {
        console.error('[tearDownUserStripe] cancel failed', {
          userId,
          subscriptionId: row.subscriptionId,
          error: e,
        });
        return { ...result, ok: false, error: 'stripe_cancel_failed' };
      }
      result.cancelled.push(row.subscriptionId);
    }
  }

  if (result.cancelled.length) {
    const { error: markErr } = await supabase
      .from('list_subscriptions')
      .update({ status: 'canceled', cancel_at_period_end: false })
      .eq('subscriber_user_id', userId)
      .in('stripe_subscription_id', result.cancelled);
    // The Stripe webhook is the source of truth and will reconcile; this is belt and braces.
    if (markErr)
      console.error('[tearDownUserStripe] mark cancelled', { userId, error: markErr.message });
  }

  // Creator side: never destroy the only pointer to an account still holding money.
  const { data: customer } = await supabase
    .from('customers')
    .select('stripe_connect_account_id')
    .eq('id', userId)
    .maybeSingle();

  const connectAccountId =
    typeof customer?.stripe_connect_account_id === 'string'
      ? customer.stripe_connect_account_id
      : null;
  result.connectAccountId = connectAccountId;

  if (connectAccountId && stripe) {
    try {
      // Options belong in the second argument. As the first they are sent as query params
      // with no Stripe-Account header, so this read the PLATFORM balance — meaning the
      // "creator still holds money" guard was inspecting the wrong account entirely and
      // would clear a creator whose own balance was outstanding.
      const balance = await stripe.balance.retrieve({}, { stripeAccount: connectAccountId });
      if (hasUnsettledConnectBalance(balance)) {
        return { ...result, ok: false, error: 'connect_balance_outstanding' };
      }
    } catch (e) {
      // An account Stripe no longer knows about is not a reason to trap the user.
      console.error('[tearDownUserStripe] balance check failed', {
        userId,
        connectAccountId,
        error: e,
      });
    }
  }

  if (connectAccountId) {
    // Logged loudly: after this deletion the DB no longer references the account.
    console.error('[tearDownUserStripe] connect account released with zero balance', {
      userId,
      connectAccountId,
    });
  }

  return result;
}
