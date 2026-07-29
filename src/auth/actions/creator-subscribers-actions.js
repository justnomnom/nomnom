'use server';

import { getStripe } from 'src/libs/stripe/stripe-server';
import { supabaseAdminClient } from 'src/libs/supabase/supabase-admin';
import { normalizeCancellationReason } from 'src/libs/stripe/cancellation-reasons';
import { isWellFormedUuid, netCentsAfterPlatformFee } from 'src/libs/stripe/list-stripe-constants';
import {
  fetchAllSupabasePages,
  SUPABASE_DEFAULT_PAGE_SIZE,
} from 'src/lib/supabase-fetch-all-pages';
import {
  getSupabaseAuthUser,
  createSupabaseServerClient,
} from 'src/libs/supabase/supabase-server-client';
import {
  listNameFromSubscriptionRow,
  sendSubscriptionCancelledEmail,
} from 'src/libs/email/subscription-cancelled-email';

/** Stripe subscription statuses where cancel is meaningful. */
const CANCELLABLE_STATUSES = new Set(['active', 'trialing', 'past_due', 'unpaid', 'paused']);

/**
 * Paid lists owned by the current user (ids + names for display).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 */
async function getOwnedListIdNameMap(supabase, userId) {
  const { data: lists, error } = await supabase
    .from('lists')
    .select('id, name')
    .eq('user_id', userId);

  if (error) {
    console.error('[getMyPaidListSubscribers] lists', error);
    return { error: 'load_failed', listIds: [], nameById: {} };
  }

  const rows = lists ?? [];
  const listIds = rows.map((r) => r.id).filter(Boolean);
  const nameById = Object.fromEntries(rows.map((r) => [r.id, r.name ?? '']));
  return { error: null, listIds, nameById };
}

/**
 * Creator: subscribers across all lists you own (paid access rows on Stripe).
 * @returns {Promise<{ error: string | null, rows: Array<object> }>}
 */
export async function getMyPaidListSubscribers() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user?.id) {
    return { error: 'unauthorized', rows: [] };
  }

  const { error: mapErr, listIds, nameById } = await getOwnedListIdNameMap(supabase, user.id);
  if (mapErr) {
    return { error: mapErr, rows: [] };
  }
  if (listIds.length === 0) {
    return { error: null, rows: [] };
  }

  // Page past PostgREST's 1000-row window so a creator with >1000 subscribers sees them all
  // (stable `id` tiebreaker keeps `.range()` paging deterministic under the created_at sort).
  let subs;
  try {
    subs = await fetchAllSupabasePages(async (from, pageSize) => {
      const { data, error } = await supabase
        .from('list_subscriptions')
        .select(
          'id, list_id, subscriber_user_id, status, current_period_end, cancel_at_period_end, created_at, stripe_subscription_id, stripe_connect_account_id'
        )
        .in('list_id', listIds)
        .order('created_at', { ascending: false })
        .order('id', { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) {
        throw error;
      }
      return data ?? [];
    }, SUPABASE_DEFAULT_PAGE_SIZE);
  } catch (sErr) {
    console.error('[getMyPaidListSubscribers] list_subscriptions', sErr);
    return { error: 'load_failed', rows: [] };
  }

  const subscriberIds = [...new Set(subs.map((s) => s.subscriber_user_id).filter(Boolean))];
  /** @type {Record<string, { id: string, username: string | null, display_name: string | null, avatar_url: string | null }>} */
  const profiles = {};
  if (subscriberIds.length) {
    // Chunk the id filter: subscriberIds can now exceed the URL/1000-row limits.
    const PROFILE_CHUNK = 200;
    const idChunks = [];
    for (let i = 0; i < subscriberIds.length; i += PROFILE_CHUNK) {
      idChunks.push(subscriberIds.slice(i, i + PROFILE_CHUNK));
    }
    const chunkResults = await Promise.all(
      idChunks.map(async (ids) => {
        const { data, error } = await supabaseAdminClient
          .from('users')
          .select('id, username, display_name, avatar_url')
          .in('id', ids);
        if (error) {
          console.error('[getMyPaidListSubscribers] users', error);
          return [];
        }
        return data ?? [];
      })
    );
    chunkResults.forEach((arr) => {
      arr.forEach((u) => {
        profiles[u.id] = u;
      });
    });
  }

  const rows = (subs ?? []).map((s) => ({
    ...s,
    list_name: nameById[s.list_id] ?? '',
    subscriber: profiles[s.subscriber_user_id] ?? null,
  }));

  return { error: null, rows };
}

/**
 * Creator: end a subscriber's paid access immediately (Stripe cancel on Connect account).
 * @param {string} listSubscriptionId — `list_subscriptions.id`
 * @returns {Promise<{ error: string | null }>}
 */
export async function cancelSubscriberListSubscription(listSubscriptionId) {
  const stripe = getStripe();
  if (!stripe) {
    return { error: 'stripe_not_configured' };
  }

  if (!isWellFormedUuid(listSubscriptionId)) {
    return { error: 'invalid_id' };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user?.id) {
    return { error: 'unauthorized' };
  }

  const { data: row, error: rErr } = await supabase
    .from('list_subscriptions')
    .select('id, list_id, status, stripe_subscription_id, stripe_connect_account_id')
    .eq('id', listSubscriptionId)
    .maybeSingle();

  if (rErr) {
    console.error('[cancelSubscriberListSubscription] load', rErr);
    return { error: 'load_failed' };
  }
  if (!row) {
    return { error: 'not_found' };
  }

  const { data: listRow, error: lErr } = await supabase
    .from('lists')
    .select('user_id')
    .eq('id', row.list_id)
    .maybeSingle();

  if (lErr || !listRow) {
    return { error: 'not_found' };
  }
  if (listRow.user_id !== user.id) {
    return { error: 'forbidden' };
  }

  if (!CANCELLABLE_STATUSES.has(row.status)) {
    return { error: 'not_cancellable' };
  }
  if (!row.stripe_subscription_id || !row.stripe_connect_account_id) {
    return { error: 'invalid_row' };
  }

  try {
    // Retrieve the subscription to get the latest invoice and period boundaries
    // before cancelling, so we can calculate the prorated unused amount.
    const sub = await stripe.subscriptions.retrieve(
      row.stripe_subscription_id,
      { expand: ['latest_invoice'] },
      { stripeAccount: row.stripe_connect_account_id }
    );

    // `stripeAccount` MUST be the third (per-request options) argument. Passing it in the
    // second argument makes stripe-node treat it as request params, so no Stripe-Account
    // header is sent and the call resolves against the PLATFORM account, where this
    // subscription does not exist — the catch below then reads "No such subscription" as
    // an already-cancelled success. Covered by stripe-connect-account-arg.test.mjs.
    await stripe.subscriptions.cancel(
      row.stripe_subscription_id,
      {},
      { stripeAccount: row.stripe_connect_account_id }
    );

    // Issue prorated refund for the unused portion of the billing period.
    const invoice = sub.latest_invoice;
    const chargeId =
      typeof invoice?.charge === 'string' ? invoice.charge : (invoice?.charge?.id ?? null);
    const amountPaid = invoice?.amount_paid ?? 0;
    const periodStart = sub.current_period_start;
    const periodEnd = sub.current_period_end;

    if (chargeId && amountPaid > 0 && periodStart && periodEnd) {
      const nowSec = Math.floor(Date.now() / 1000);
      const totalSec = periodEnd - periodStart;
      const unusedSec = Math.max(0, periodEnd - nowSec);
      const refundAmount = Math.floor((amountPaid * unusedSec) / totalSec);

      if (refundAmount > 0) {
        await stripe.refunds.create(
          { charge: chargeId, amount: refundAmount, refund_application_fee: true },
          { stripeAccount: row.stripe_connect_account_id }
        );
      }
    }
  } catch (e) {
    const msg = String(e?.message ?? '');
    if (msg.includes('No such subscription') || /cancell?ed/i.test(msg)) {
      return { error: null };
    }
    console.error('[cancelSubscriberListSubscription] stripe', e);
    return { error: 'stripe_cancel_failed' };
  }

  return { error: null };
}

/**
 * Subscriber: cancel own subscription to a creator at period end.
 * The viewer keeps access until `current_period_end`; Stripe fires the
 * `customer.subscription.deleted` webhook which sets status → `canceled`.
 * @param {string} listSubscriptionRowId — `list_subscriptions.id`
 * @returns {Promise<{ error: string | null }>}
 */
export async function cancelMyCreatorSubscription(listSubscriptionRowId, reason = null) {
  const stripe = getStripe();
  if (!stripe) return { error: 'stripe_not_configured' };
  if (!isWellFormedUuid(listSubscriptionRowId)) return { error: 'invalid_id' };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user?.id) return { error: 'unauthorized' };

  const { data: row, error: rErr } = await supabase
    .from('list_subscriptions')
    .select(
      'id, subscriber_user_id, status, stripe_subscription_id, stripe_connect_account_id, current_period_end, lists ( name )'
    )
    .eq('id', listSubscriptionRowId)
    .maybeSingle();

  if (rErr) {
    console.error('[cancelMyCreatorSubscription] load', rErr);
    return { error: 'load_failed' };
  }
  if (!row) return { error: 'not_found' };
  if (row.subscriber_user_id !== user.id) return { error: 'forbidden' };
  if (!CANCELLABLE_STATUSES.has(row.status)) return { error: 'not_cancellable' };
  if (!row.stripe_subscription_id || !row.stripe_connect_account_id) {
    return { error: 'invalid_row' };
  }

  try {
    // Third argument, not mixed into params — see the note in
    // cancelSubscriberListSubscription. This one was the worst of the set: the update
    // silently targeted the platform account, the catch below swallowed the resulting
    // "No such subscription", and the subscriber was told the cancellation succeeded and
    // sent a confirmation email while Stripe kept billing them.
    await stripe.subscriptions.update(
      row.stripe_subscription_id,
      { cancel_at_period_end: true },
      { stripeAccount: row.stripe_connect_account_id }
    );
  } catch (e) {
    const msg = String(e?.message ?? '');
    if (msg.includes('No such subscription') || /cancell?ed/i.test(msg)) {
      return { error: null };
    }
    console.error('[cancelMyCreatorSubscription] stripe', e);
    return { error: 'stripe_cancel_failed' };
  }

  // Confirmation is best-effort: the subscription is already cancelled, and failing the
  // action because an email bounced would tell the user the opposite of the truth.
  await sendSubscriptionCancelledEmail({
    to: user.email,
    listName: listNameFromSubscriptionRow(row),
    accessEndsAt: row.current_period_end ?? null,
    reason: normalizeCancellationReason(reason),
  }).catch((e) => console.error('[cancelMyCreatorSubscription] confirmation email', e));

  return { error: null, reason: normalizeCancellationReason(reason) };
}

/**
 * Creator: revenue summary + subscriber/snapshot counts across all owned lists.
 * Returns all-time net earnings (after platform fee), active live subscriber count,
 * and total snapshot purchase count.
 *
 * @returns {Promise<{
 *   error: string | null,
 *   activeSubscribers: number,
 *   snapshotPurchases: number,
 *   allTimeRevenueNetCents: number,
 *   currency: string,
 * }>}
 */
export async function getCreatorListStats() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user?.id) {
    return {
      error: 'unauthorized',
      activeSubscribers: 0,
      snapshotPurchases: 0,
      allTimeRevenueNetCents: 0,
      currency: 'eur',
    };
  }

  const { error: mapErr, listIds } = await getOwnedListIdNameMap(supabase, user.id);
  if (mapErr) {
    return {
      error: mapErr,
      activeSubscribers: 0,
      snapshotPurchases: 0,
      allTimeRevenueNetCents: 0,
      currency: 'eur',
    };
  }
  if (listIds.length === 0) {
    return {
      error: null,
      activeSubscribers: 0,
      snapshotPurchases: 0,
      allTimeRevenueNetCents: 0,
      currency: 'eur',
    };
  }

  const [subsResult, snapResult, subPaymentsResult] = await Promise.all([
    supabase
      .from('list_subscriptions')
      .select('id, status')
      .in('list_id', listIds)
      .in('status', ['active', 'trialing']),
    supabase
      .from('list_snapshot_purchases')
      .select('id, amount_cents, currency')
      .in('list_id', listIds),
    supabase
      .from('list_subscription_payments')
      .select('amount_paid_cents, currency')
      .in('list_id', listIds),
  ]);

  const activeSubscribers = (subsResult.data ?? []).length;
  const snaps = snapResult.data ?? [];
  const snapshotPurchases = snaps.length;

  let allTimeRevenueNetCents = 0;
  let currency = 'eur';

  snaps.forEach((s) => {
    if (s.currency) currency = String(s.currency).toLowerCase();
    allTimeRevenueNetCents += netCentsAfterPlatformFee(s.amount_cents);
  });

  (subPaymentsResult.data ?? []).forEach((p) => {
    if (p.currency) currency = String(p.currency).toLowerCase();
    allTimeRevenueNetCents += netCentsAfterPlatformFee(p.amount_paid_cents);
  });

  return {
    error: null,
    activeSubscribers,
    snapshotPurchases,
    allTimeRevenueNetCents,
    currency,
  };
}

/**
 * Subscriber: active (or trialing) live-list subscriptions plus one-time snapshot purchases.
 * Returns creator info + list name for display (`purchase_kind` distinguishes rows).
 * @returns {Promise<{ error: string | null, rows: Array<object> }>}
 */
export async function getMyActiveSubscriptions() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user?.id) {
    return { error: 'unauthorized', rows: [] };
  }

  const [{ data: subs, error: sErr }, { data: snaps, error: nErr }] = await Promise.all([
    supabase
      .from('list_subscriptions')
      .select(
        'id, list_id, status, current_period_end, cancel_at_period_end, stripe_subscription_id, stripe_connect_account_id, created_at'
      )
      .eq('subscriber_user_id', user.id)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false }),
    supabase
      .from('list_snapshot_purchases')
      .select('id, list_id, purchased_at, amount_cents, currency')
      .eq('buyer_user_id', user.id)
      .order('purchased_at', { ascending: false }),
  ]);

  if (sErr) {
    console.error('[getMyActiveSubscriptions] list_subscriptions', sErr);
    return { error: 'load_failed', rows: [] };
  }
  if (nErr) {
    console.error('[getMyActiveSubscriptions] list_snapshot_purchases', nErr);
    return { error: 'load_failed', rows: [] };
  }

  const subRows = subs ?? [];
  const snapRows = snaps ?? [];

  const listIds = [
    ...new Set(
      [...subRows.map((r) => r.list_id), ...snapRows.map((r) => r.list_id)].filter(Boolean)
    ),
  ];

  if (listIds.length === 0) {
    return { error: null, rows: [] };
  }

  const { data: lists, error: lErr } = await supabase
    .from('lists')
    .select('id, name, user_id')
    .in('id', listIds);

  if (lErr) {
    console.error('[getMyActiveSubscriptions] lists', lErr);
    return { error: 'load_failed', rows: [] };
  }

  const listById = Object.fromEntries((lists ?? []).map((l) => [l.id, l]));

  const creatorIds = [...new Set((lists ?? []).map((l) => l.user_id).filter(Boolean))];
  /** @type {Record<string, { id: string, username: string | null, display_name: string | null, avatar_url: string | null }>} */
  const creators = {};
  if (creatorIds.length) {
    const { data: users, error: uErr } = await supabaseAdminClient
      .from('users')
      .select('id, username, display_name, avatar_url')
      .in('id', creatorIds);
    if (uErr) {
      console.error('[getMyActiveSubscriptions] users', uErr);
    } else {
      (users ?? []).forEach((u) => {
        creators[u.id] = u;
      });
    }
  }

  const enrichedSubs = subRows.map((s) => {
    const list = listById[s.list_id] ?? null;
    const creator = list ? (creators[list.user_id] ?? null) : null;
    return {
      ...s,
      purchase_kind: 'subscription',
      list_name: list?.name ?? '',
      creator,
    };
  });

  const enrichedSnaps = snapRows.map((s) => {
    const list = listById[s.list_id] ?? null;
    const creator = list ? (creators[list.user_id] ?? null) : null;
    return {
      id: s.id,
      list_id: s.list_id,
      purchase_kind: 'snapshot',
      status: 'snapshot',
      current_period_end: null,
      cancel_at_period_end: false,
      stripe_subscription_id: null,
      stripe_connect_account_id: null,
      purchased_at: s.purchased_at ?? null,
      amount_cents: s.amount_cents,
      currency: s.currency,
      list_name: list?.name ?? '',
      creator,
    };
  });

  const enriched = [...enrichedSubs, ...enrichedSnaps].sort((a, b) => {
    const ta =
      a.purchase_kind === 'snapshot'
        ? new Date(a.purchased_at ?? 0).getTime()
        : new Date(a.created_at ?? 0).getTime();
    const tb =
      b.purchase_kind === 'snapshot'
        ? new Date(b.purchased_at ?? 0).getTime()
        : new Date(b.created_at ?? 0).getTime();
    return tb - ta;
  });

  return { error: null, rows: enriched };
}
