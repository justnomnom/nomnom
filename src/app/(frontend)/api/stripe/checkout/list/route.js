import { NextResponse } from 'next/server';

import { getSiteUrl } from 'src/libs/site-url';
import { getStripe } from 'src/libs/stripe/stripe-server';
import { supabaseAdminClient } from 'src/libs/supabase/supabase-admin';
import { captureServerEvent } from 'src/libs/posthog/capture-server-event';
import {
  getSupabaseAuthUser,
  createSupabaseServerClient,
} from 'src/libs/supabase/supabase-server-client';
import {
  isWellFormedUuid,
  getPlatformFeePercent,
  computeListSnapshotAmountCents,
  LIST_SNAPSHOT_CHECKOUT_TAX_CODE,
} from 'src/libs/stripe/list-stripe-constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const listId = typeof body?.listId === 'string' ? body.listId.trim() : '';
  if (!listId) {
    return NextResponse.json({ error: 'missing_list_id' }, { status: 400 });
  }
  if (!isWellFormedUuid(listId)) {
    return NextResponse.json({ error: 'invalid_list_id' }, { status: 400 });
  }

  const purchaseType = body?.type === 'snapshot' ? 'snapshot' : 'subscription';

  // Allow caller to specify the page to return to after checkout (e.g. /dashboard/lists/[id]).
  // Validated to be an internal path — no external redirects.
  const rawReturnPath = typeof body?.returnPath === 'string' ? body.returnPath.trim() : '';
  const returnPath =
    rawReturnPath.startsWith('/') &&
    !rawReturnPath.startsWith('//') &&
    !rawReturnPath.includes('://')
      ? rawReturnPath
      : `/lists/${listId}`;

  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user?.id || !user.email) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: listRow, error: lErr } = await supabase
    .from('lists')
    .select(
      'id, user_id, name, paid_access_enabled, stripe_price_id, monthly_amount_cents, currency'
    )
    .eq('id', listId)
    .maybeSingle();

  if (lErr) {
    console.error('[stripe checkout] list', lErr);
    return NextResponse.json({ error: 'list_load_failed' }, { status: 500 });
  }
  if (!listRow?.paid_access_enabled) {
    return NextResponse.json({ error: 'list_not_monetized' }, { status: 400 });
  }
  if (purchaseType === 'subscription' && !listRow.stripe_price_id) {
    return NextResponse.json({ error: 'list_not_monetized' }, { status: 400 });
  }
  if (purchaseType === 'snapshot' && !listRow.monthly_amount_cents) {
    return NextResponse.json({ error: 'list_not_monetized' }, { status: 400 });
  }

  const { data: ownerRow, error: oErr } = await supabaseAdminClient
    .from('customers')
    .select('stripe_connect_account_id, stripe_connect_charges_enabled')
    .eq('id', listRow.user_id)
    .maybeSingle();

  if (oErr) {
    console.error('[stripe checkout] owner', oErr);
    return NextResponse.json({ error: 'owner_load_failed' }, { status: 500 });
  }

  const connectId = ownerRow?.stripe_connect_account_id;
  if (!connectId || !ownerRow?.stripe_connect_charges_enabled) {
    return NextResponse.json({ error: 'creator_not_ready' }, { status: 400 });
  }

  if (listRow.user_id === user.id) {
    return NextResponse.json({ error: 'cannot_subscribe_own_list' }, { status: 400 });
  }

  const base = getSiteUrl();
  const fee = getPlatformFeePercent();

  if (purchaseType === 'snapshot') {
    // Check for existing snapshot purchase
    const { data: existingSnap } = await supabaseAdminClient
      .from('list_snapshot_purchases')
      .select('id')
      .eq('buyer_user_id', user.id)
      .eq('list_id', listId)
      .maybeSingle();
    if (existingSnap) {
      return NextResponse.json({ error: 'already_purchased' }, { status: 400 });
    }

    const amountCents = computeListSnapshotAmountCents(listRow.monthly_amount_cents);
    if (amountCents == null) {
      return NextResponse.json({ error: 'list_not_monetized' }, { status: 400 });
    }
    const currency = (listRow.currency && String(listRow.currency).toLowerCase()) || 'eur';
    const feeAmount = Math.round((amountCents * fee) / 100);

    let session;
    try {
      session = await stripe.checkout.sessions.create(
        {
          mode: 'payment',
          line_items: [
            {
              price_data: {
                currency,
                // Required with automatic_tax for ad-hoc prices (subscriptions use Prices configured in Dashboard).
                tax_behavior: 'exclusive',
                product_data: {
                  name: listRow.name || 'Restaurant List Snapshot',
                  tax_code: LIST_SNAPSHOT_CHECKOUT_TAX_CODE,
                },
                unit_amount: amountCents,
              },
              quantity: 1,
            },
          ],
          success_url: `${base}${returnPath}?checkout=success&session_id={CHECKOUT_SESSION_ID}&stripe_account=${encodeURIComponent(connectId)}`,
          cancel_url: `${base}${returnPath}?checkout=cancel`,
          customer_email: user.email,
          client_reference_id: user.id,
          metadata: {
            list_id: listId,
            buyer_user_id: user.id,
            purchase_type: 'snapshot',
          },
          payment_intent_data: {
            application_fee_amount: feeAmount,
            metadata: {
              list_id: listId,
              buyer_user_id: user.id,
              purchase_type: 'snapshot',
            },
          },
          // automatic_tax requires a billing address — not available on guest checkout.
          // Re-enable once Stripe Tax is configured and billing_address_collection is added.
        },
        {
          stripeAccount: connectId,
          idempotencyKey: `snap-list:${user.id}:${listId}:${Date.now()}`.slice(0, 255),
        }
      );
    } catch (e) {
      const code = e && typeof e === 'object' && 'code' in e ? e.code : undefined;
      const message = e && typeof e === 'object' && 'message' in e ? e.message : String(e);
      console.error('[stripe checkout] snapshot sessions.create', code, message, e);
      await captureServerEvent('snapshot_checkout_failed', {
        list_id: listId,
        user_id: user.id,
        error_code: 'checkout_session_failed',
        amount_cents: amountCents,
        currency,
      });
      return NextResponse.json({ error: 'checkout_session_failed' }, { status: 502 });
    }

    if (!session.url) {
      await captureServerEvent('snapshot_checkout_failed', {
        list_id: listId,
        user_id: user.id,
        error_code: 'no_session_url',
        amount_cents: amountCents,
        currency,
      });
      return NextResponse.json({ error: 'no_session_url' }, { status: 500 });
    }

    await captureServerEvent('snapshot_checkout_redirected', {
      list_id: listId,
      user_id: user.id,
      amount_cents: amountCents,
      currency,
    });
    return NextResponse.json({ url: session.url });
  }

  // subscription path
  const { data: subRows } = await supabase
    .from('list_subscriptions')
    .select('list_id')
    .eq('subscriber_user_id', user.id)
    .in('status', ['active', 'trialing']);
  const subListIds = [...new Set((subRows ?? []).map((r) => r.list_id).filter(Boolean))];
  if (subListIds.length) {
    const { data: subLists } = await supabase
      .from('lists')
      .select('user_id, paid_access_enabled')
      .in('id', subListIds);
    const alreadyHasCreatorBundle = (subLists ?? []).some(
      (l) => Boolean(l.paid_access_enabled) && l.user_id === listRow.user_id
    );
    if (alreadyHasCreatorBundle) {
      return NextResponse.json({ error: 'already_subscribed' }, { status: 400 });
    }
  }

  let session;
  try {
    session = await stripe.checkout.sessions.create(
      {
        mode: 'subscription',
        line_items: [{ price: listRow.stripe_price_id, quantity: 1 }],
        success_url: `${base}${returnPath}?checkout=success`,
        cancel_url: `${base}${returnPath}?checkout=cancel`,
        customer_email: user.email,
        client_reference_id: user.id,
        metadata: {
          list_id: listId,
          subscriber_user_id: user.id,
        },
        subscription_data: {
          application_fee_percent: fee,
          metadata: {
            list_id: listId,
            subscriber_user_id: user.id,
          },
        },
        automatic_tax: { enabled: true },
      },
      {
        stripeAccount: connectId,
        idempotencyKey: `co-list:${user.id}:${listId}:${listRow.stripe_price_id}`.slice(0, 255),
      }
    );
  } catch (e) {
    console.error('[stripe checkout] sessions.create', e);
    await captureServerEvent('live_list_checkout_failed', {
      list_id: listId,
      user_id: user.id,
      error_code: 'checkout_session_failed',
    });
    return NextResponse.json({ error: 'checkout_session_failed' }, { status: 502 });
  }

  if (!session.url) {
    await captureServerEvent('live_list_checkout_failed', {
      list_id: listId,
      user_id: user.id,
      error_code: 'no_session_url',
    });
    return NextResponse.json({ error: 'no_session_url' }, { status: 500 });
  }

  await captureServerEvent('live_list_checkout_redirected', {
    list_id: listId,
    user_id: user.id,
  });
  return NextResponse.json({ url: session.url });
}
