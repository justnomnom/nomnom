import { NextResponse } from 'next/server';

import { getStripe } from 'src/libs/stripe/stripe-server';
import { supabaseAdminClient } from 'src/libs/supabase/supabase-admin';
import { isWellFormedUuid } from 'src/libs/stripe/list-stripe-constants';
import { captureServerEvent } from 'src/libs/posthog/capture-server-event';
import { insertNotifications } from 'src/libs/notifications/create-notification';
import {
  buildListSocialNotificationData,
  resolveOwnerRecipientExcludingActor,
} from 'src/libs/notifications/social-notification-payloads';
import { upsertListSnapshotPurchase } from 'src/libs/stripe/upsert-list-snapshot-purchase';
import { fetchListItemIdsForSnapshotCapture } from 'src/libs/stripe/fetch-list-item-ids-for-snapshot-capture';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Best-effort PostHog capture — never blocks Stripe webhook processing. */
function captureWebhookAnalytics(eventName, properties = {}) {
  // Distinct id resolves from buyer/subscriber/user properties; never pool on a shared literal.
  return captureServerEvent(eventName, properties, {
    source: 'stripe_webhook',
  });
}

/**
 * Stripe webhooks (Connect + subscriptions). Set `STRIPE_WEBHOOK_SECRET` and point Stripe to this URL.
 * Enable Connect events and: customer.subscription.*, account.updated, checkout.session.completed,
 * invoice.payment_succeeded (subscription renewals → list_subscription_payments).
 */
export async function POST(request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: 'webhook_not_configured' }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'missing_signature' }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.error('[stripe webhook] signature', err);
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  const { data: already, error: dupErr } = await supabaseAdminClient
    .from('stripe_events')
    .select('id')
    .eq('id', event.id)
    .maybeSingle();

  if (dupErr) {
    console.error('[stripe webhook] duplicate check', dupErr);
    return NextResponse.json({ error: 'idempotency_check_failed' }, { status: 500 });
  }
  if (already?.id) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    captureWebhookAnalytics('stripe_webhook_received', {
      stripe_event_id: event.id,
      stripe_event_type: event.type,
      stripe_connect_account_id: event.account ?? null,
    });

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await syncSubscriptionRecord(stripe, sub, event.account);
        if (event.type === 'customer.subscription.created') {
          // Fire-and-forget: tell the list owner they have a new subscriber.
          notifyListSubscribed(sub).catch(() => {});
        }
        break;
      }
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode === 'subscription' && session.subscription) {
          const subId =
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription.id;
          const connectAccountId = event.account;
          if (connectAccountId && subId) {
            const sub = await stripe.subscriptions.retrieve(
              subId,
              { expand: ['items.data.price'] },
              { stripeAccount: connectAccountId }
            );
            await syncSubscriptionRecord(stripe, sub, connectAccountId);
          }
        } else if (session.mode === 'payment' && session.metadata?.purchase_type === 'snapshot') {
          await recordSnapshotPurchase(session, event.account);
        }
        break;
      }
      case 'invoice.paid':
      case 'invoice.payment_succeeded': {
        // 'invoice.paid' is the current Stripe event name; 'invoice.payment_succeeded' is legacy.
        // Both fire when a subscription invoice is collected — handle identically.
        const invoice = event.data.object;
        if (invoice.subscription && invoice.amount_paid > 0) {
          await recordSubscriptionPayment(invoice, event.account);
        }
        break;
      }
      case 'account.updated': {
        const account = event.data.object;
        const { error: acctErr } = await supabaseAdminClient
          .from('customers')
          .update({
            stripe_connect_charges_enabled: account.charges_enabled === true,
            stripe_connect_payouts_enabled: account.payouts_enabled === true,
          })
          .eq('stripe_connect_account_id', account.id);
        if (acctErr) {
          console.error('[stripe webhook] account.updated', acctErr);
          throw acctErr;
        }
        break;
      }
      default:
        break;
    }

    const { error: insErr } = await supabaseAdminClient
      .from('stripe_events')
      .insert({ id: event.id });
    if (insErr) {
      if (insErr.code === '23505') {
        return NextResponse.json({ received: true, duplicate: true });
      }
      console.error('[stripe webhook] stripe_events insert', insErr);
      return NextResponse.json({ error: 'idempotency_store_failed' }, { status: 500 });
    }
  } catch (e) {
    captureWebhookAnalytics('stripe_webhook_handler_failed', {
      stripe_event_id: event.id,
      stripe_event_type: event.type,
      stripe_connect_account_id: event.account ?? null,
    });
    console.error('[stripe webhook] handler', event.type, e);
    return NextResponse.json({ error: 'handler_failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/**
 * @param {import('stripe').Stripe.Invoice} invoice
 * @param {string | null | undefined} connectAccountId
 */
async function recordSubscriptionPayment(invoice, connectAccountId) {
  if (!connectAccountId) return;

  const subId =
    typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
  if (!subId) return;

  // Resolve list_id and subscriber_user_id from subscription metadata
  const { data: subRow } = await supabaseAdminClient
    .from('list_subscriptions')
    .select('list_id, subscriber_user_id')
    .eq('stripe_subscription_id', subId)
    .maybeSingle();

  const { error } = await supabaseAdminClient.from('list_subscription_payments').upsert(
    {
      list_id: subRow?.list_id ?? null,
      subscriber_user_id: subRow?.subscriber_user_id ?? null,
      stripe_invoice_id: invoice.id,
      stripe_subscription_id: subId,
      stripe_connect_account_id: connectAccountId,
      amount_paid_cents: invoice.amount_paid,
      currency: invoice.currency ?? 'eur',
      paid_at: invoice.status_transitions?.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
        : new Date().toISOString(),
    },
    { onConflict: 'stripe_invoice_id' }
  );

  if (error) {
    console.error('[stripe webhook] list_subscription_payments upsert', error);
    throw error;
  }

  captureWebhookAnalytics('subscription_payment_recorded', {
    stripe_invoice_id: invoice.id,
    stripe_subscription_id: subId,
    stripe_connect_account_id: connectAccountId,
    list_id: subRow?.list_id ?? null,
    subscriber_user_id: subRow?.subscriber_user_id ?? null,
    amount_paid_cents: invoice.amount_paid,
    currency: invoice.currency ?? 'eur',
  });
}

/**
 * @param {import('stripe').Stripe.Checkout.Session} session
 * @param {string | null | undefined} connectAccountId
 */
async function recordSnapshotPurchase(session, connectAccountId) {
  const listId = session.metadata?.list_id;
  const buyerUserId = session.metadata?.buyer_user_id;
  if (!listId || !buyerUserId) return;
  if (!isWellFormedUuid(listId) || !isWellFormedUuid(buyerUserId)) {
    console.warn('[stripe webhook] invalid uuid in snapshot metadata');
    return;
  }

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);
  if (!paymentIntentId) {
    console.warn('[stripe webhook] snapshot missing payment_intent id');
    return;
  }

  const capturedListItemIds = await fetchListItemIdsForSnapshotCapture(listId);

  const result = await upsertListSnapshotPurchase({
    listId,
    buyerUserId,
    paymentIntentId,
    stripeConnectAccountId: connectAccountId,
    amountCents: session.amount_total ?? 0,
    currency: session.currency ?? 'eur',
    capturedListItemIds,
  });

  if (!result.ok) {
    console.error('[stripe webhook] list_snapshot_purchases upsert', result.error);
    throw new Error(result.error);
  }

  captureWebhookAnalytics('snapshot_purchase_recorded', {
    list_id: listId,
    buyer_user_id: buyerUserId,
    stripe_payment_intent_id: paymentIntentId,
    stripe_connect_account_id: connectAccountId ?? null,
    amount_cents: session.amount_total ?? 0,
    currency: session.currency ?? 'eur',
    captured_item_count: capturedListItemIds.length,
  });
}

/**
 * @param {import('stripe').Stripe} stripe
 * @param {import('stripe').Stripe.Subscription} sub
 * @param {string | null | undefined} connectAccountId
 */
/**
 * Notify the list owner that a new user subscribed to their paid list.
 * Fire-and-forget; reads list_id + subscriber_user_id from subscription metadata.
 */
async function notifyListSubscribed(sub) {
  const listId = sub?.metadata?.list_id;
  const subscriberUserId = sub?.metadata?.subscriber_user_id;
  if (!listId || !subscriberUserId) return;

  const [{ data: list }, { data: subscriber }] = await Promise.all([
    supabaseAdminClient.from('lists').select('name, user_id').eq('id', listId).maybeSingle(),
    supabaseAdminClient
      .from('users')
      .select('display_name, username')
      .eq('id', subscriberUserId)
      .maybeSingle(),
  ]);
  const ownerId = resolveOwnerRecipientExcludingActor(list?.user_id, subscriberUserId);
  if (!ownerId) return;

  await insertNotifications(
    [ownerId],
    'list_subscribed',
    buildListSocialNotificationData({
      actor: { id: subscriberUserId, ...subscriber },
      listId,
      listName: list?.name,
    })
  );
}

async function syncSubscriptionRecord(stripe, sub, connectAccountId) {
  if (!connectAccountId) {
    return;
  }

  let subscription = sub;
  if (!subscription.metadata?.list_id || !subscription.metadata?.subscriber_user_id) {
    try {
      subscription = await stripe.subscriptions.retrieve(
        subscription.id,
        { expand: ['items.data.price'] },
        { stripeAccount: connectAccountId }
      );
    } catch (e) {
      console.error('[stripe webhook] retrieve subscription', e);
      return;
    }
  }

  const listId = subscription.metadata?.list_id;
  const subscriberUserId = subscription.metadata?.subscriber_user_id;
  if (!listId || !subscriberUserId) {
    return;
  }
  if (!isWellFormedUuid(listId) || !isWellFormedUuid(subscriberUserId)) {
    console.warn('[stripe webhook] invalid uuid in metadata');
    return;
  }

  const { data: listRow, error: listErr } = await supabaseAdminClient
    .from('lists')
    .select('id, user_id, paid_access_enabled, stripe_price_id')
    .eq('id', listId)
    .maybeSingle();

  if (listErr) {
    console.error('[stripe webhook] list load', listErr);
    throw listErr;
  }
  if (!listRow?.paid_access_enabled || !listRow.stripe_price_id) {
    console.warn('[stripe webhook] skip: list not monetized', listId);
    return;
  }

  const { data: owner, error: ownerErr } = await supabaseAdminClient
    .from('customers')
    .select('stripe_connect_account_id')
    .eq('id', listRow.user_id)
    .maybeSingle();

  if (ownerErr) {
    console.error('[stripe webhook] owner load', ownerErr);
    throw ownerErr;
  }
  if (owner?.stripe_connect_account_id !== connectAccountId) {
    console.warn('[stripe webhook] skip: connect account does not own list', {
      listId,
      expectedOwnerAccount: owner?.stripe_connect_account_id,
      eventAccount: connectAccountId,
    });
    return;
  }

  const items = subscription.items?.data ?? [];
  const { status } = subscription;
  const allowMissingPriceCheck =
    status === 'canceled' || status === 'unpaid' || status === 'incomplete_expired';

  if (items.length === 0) {
    if (!allowMissingPriceCheck) {
      console.warn('[stripe webhook] skip: subscription has no line items', { listId });
      return;
    }
  } else {
    const rawPrice = items[0]?.price;
    const resolvedPriceId = typeof rawPrice === 'string' ? rawPrice : (rawPrice?.id ?? null);
    if (!allowMissingPriceCheck && resolvedPriceId) {
      const { data: ownerPriceRows, error: priceRowsErr } = await supabaseAdminClient
        .from('lists')
        .select('stripe_price_id')
        .eq('user_id', listRow.user_id)
        .eq('paid_access_enabled', true);
      if (priceRowsErr) {
        console.error('[stripe webhook] owner price rows', priceRowsErr);
        throw priceRowsErr;
      }
      const priceIds = new Set(
        (ownerPriceRows ?? []).map((r) => r.stripe_price_id).filter(Boolean)
      );
      const matchesBundle =
        priceIds.has(resolvedPriceId) || resolvedPriceId === listRow.stripe_price_id;
      if (!matchesBundle) {
        console.warn(
          '[stripe webhook] subscription price not on owner bundle (legacy or mismatch)',
          {
            listId,
            resolvedPriceId,
          }
        );
      }
    }
  }

  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
  if (!customerId) {
    return;
  }

  const row = {
    list_id: listId,
    subscriber_user_id: subscriberUserId,
    stripe_connect_account_id: connectAccountId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    status: subscription.status,
    current_period_end: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null,
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabaseAdminClient.from('list_subscriptions').upsert(row, {
    onConflict: 'stripe_subscription_id',
  });

  if (error) {
    console.error('[stripe webhook] list_subscriptions upsert', error);
    throw error;
  }

  captureWebhookAnalytics('subscription_status_synced', {
    list_id: listId,
    subscriber_user_id: subscriberUserId,
    stripe_subscription_id: subscription.id,
    stripe_connect_account_id: connectAccountId,
    status: subscription.status,
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
  });
}
