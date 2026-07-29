import { NextResponse } from 'next/server';

import { getStripe } from 'src/libs/stripe/stripe-server';
import { getSupabaseAuthUser } from 'src/libs/supabase/supabase-server-client';
import { upsertListSnapshotPurchase } from 'src/libs/stripe/upsert-list-snapshot-purchase';
import { fetchListItemIdsForSnapshotCapture } from 'src/libs/stripe/fetch-list-item-ids-for-snapshot-capture';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * After Stripe Checkout redirects back, confirm a paid snapshot and write `list_snapshot_purchases`
 * immediately. Webhooks can arrive later; this removes the race where `router.refresh()` still
 * shows purchase CTAs because the webhook has not run yet.
 */
export async function POST(request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });
  }

  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : '';
  const stripeAccountId =
    typeof body?.stripeAccountId === 'string' ? body.stripeAccountId.trim() : '';
  if (!sessionId || !stripeAccountId) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  let session;
  try {
    // Options go in the third argument; as the second they become query params and the
    // lookup runs against the platform account, where this session does not exist.
    session = await stripe.checkout.sessions.retrieve(
      sessionId,
      {},
      { stripeAccount: stripeAccountId }
    );
  } catch (e) {
    console.error('[verify-snapshot] sessions.retrieve', e);
    return NextResponse.json({ error: 'session_retrieve_failed' }, { status: 502 });
  }

  if (session.mode !== 'payment') {
    return NextResponse.json({ error: 'wrong_mode' }, { status: 400 });
  }
  if (session.payment_status !== 'paid') {
    return NextResponse.json({ error: 'not_paid' }, { status: 400 });
  }
  if (session.metadata?.purchase_type !== 'snapshot') {
    return NextResponse.json({ error: 'wrong_type' }, { status: 400 });
  }

  const buyerUserId = session.metadata?.buyer_user_id;
  const listId = session.metadata?.list_id;
  if (!buyerUserId || !listId || buyerUserId !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);
  if (!paymentIntentId) {
    return NextResponse.json({ error: 'no_payment_intent' }, { status: 400 });
  }

  const capturedListItemIds = await fetchListItemIdsForSnapshotCapture(listId);

  const result = await upsertListSnapshotPurchase({
    listId,
    buyerUserId,
    paymentIntentId,
    stripeConnectAccountId: stripeAccountId,
    amountCents: session.amount_total ?? 0,
    currency: session.currency ?? 'eur',
    capturedListItemIds,
  });

  if (!result.ok) {
    console.error('[verify-snapshot] upsert', result.error);
    return NextResponse.json({ error: 'persist_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
