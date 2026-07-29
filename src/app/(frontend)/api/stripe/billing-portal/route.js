import { NextResponse } from 'next/server';

import { getSiteUrl } from 'src/libs/site-url';
import { getStripe } from 'src/libs/stripe/stripe-server';
import {
  getSupabaseAuthUser,
  createSupabaseServerClient,
} from 'src/libs/supabase/supabase-server-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Stripe billing portal for a subscriber, so invoices, receipts and payment-method updates
 * have somewhere to live. Before this the entire post-purchase surface was cancel buttons.
 *
 * The session is created **on the creator's Connect account**: the customer and the
 * subscription were both created there by the checkout route, so a portal session opened on
 * the platform account would not find the customer. `stripeAccount` therefore has to be the
 * per-request options argument — see stripe-connect-account-arg.test.mjs for why the
 * seemingly equivalent `create(params, { stripeAccount })`-mixed-into-params shape is not.
 *
 * The customer id is read from the row rather than accepted from the client: it is a
 * cross-account identifier, and taking it from the request would let any signed-in user open
 * a portal against someone else's customer.
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

  const listSubscriptionId =
    typeof body?.listSubscriptionId === 'string' ? body.listSubscriptionId.trim() : '';
  if (!UUID_RE.test(listSubscriptionId)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: row, error: rErr } = await supabase
    .from('list_subscriptions')
    .select('id, subscriber_user_id, stripe_customer_id, stripe_connect_account_id')
    .eq('id', listSubscriptionId)
    .maybeSingle();

  if (rErr) {
    console.error('[stripe billing-portal] load', rErr);
    return NextResponse.json({ error: 'load_failed' }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (row.subscriber_user_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  if (!row.stripe_customer_id || !row.stripe_connect_account_id) {
    return NextResponse.json({ error: 'invalid_row' }, { status: 409 });
  }

  const returnUrl = `${getSiteUrl()}/dashboard/settings/my-subscriptions`;

  let session;
  try {
    session = await stripe.billingPortal.sessions.create(
      { customer: row.stripe_customer_id, return_url: returnUrl },
      { stripeAccount: row.stripe_connect_account_id }
    );
  } catch (e) {
    console.error('[stripe billing-portal] sessions.create', e);
    return NextResponse.json({ error: 'portal_session_failed' }, { status: 502 });
  }

  return NextResponse.json({ url: session.url });
}
