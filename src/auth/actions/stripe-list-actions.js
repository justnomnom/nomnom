'use server';

import { getStripe } from 'src/libs/stripe/stripe-server';
import {
  getSupabaseAuthUser,
  createSupabaseServerClient,
} from 'src/libs/supabase/supabase-server-client';
import {
  assertPriceInBounds,
  STRIPE_CONNECT_DEFAULT_COUNTRY,
} from 'src/libs/stripe/list-stripe-constants';

/**
 * Owner: one monthly Stripe price shared by every published “Subscribers” audience list.
 * Subscribers who buy from any of those lists unlock all of them (see `list_has_active_paid_subscription`).
 *
 * @param {{ monthlyAmountCents: number, currency?: string }} input
 * @returns {Promise<{ error: string | null }>}
 */
export async function syncSubscriberListsBundlePrice(input) {
  const stripe = getStripe();
  if (!stripe) {
    return { error: 'stripe_not_configured' };
  }

  const currency = (input?.currency || 'eur').toLowerCase().slice(0, 3) || 'eur';
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) return { error: 'unauthorized' };

  const bounds = assertPriceInBounds(input?.monthlyAmountCents ?? 0);
  if (!bounds.ok) {
    return { error: bounds.error };
  }
  const amountCents = bounds.cents;

  const { data: ownerProfile, error: uErr } = await supabase
    .from('customers')
    .select('stripe_connect_account_id, stripe_connect_charges_enabled')
    .eq('id', user.id)
    .maybeSingle();

  if (uErr) {
    console.error('[syncSubscriberListsBundlePrice] customers', uErr);
    return { error: 'profile_load_failed' };
  }
  const connectId = ownerProfile?.stripe_connect_account_id;
  if (!connectId) {
    return { error: 'connect_account_required' };
  }
  if (!ownerProfile?.stripe_connect_charges_enabled) {
    return { error: 'connect_onboarding_incomplete' };
  }

  // Bundle covers all monetizable lists — both freemium (public) and full-gate (public_subscribers).
  const { data: bundleRows, error: lErr } = await supabase
    .from('lists')
    .select(
      'id, published_at, paid_access_enabled, monthly_amount_cents, currency, stripe_price_id, stripe_product_id'
    )
    .eq('user_id', user.id)
    .in('visibility', ['public', 'public_subscribers']);

  if (lErr) {
    console.error('[syncSubscriberListsBundlePrice] lists', lErr);
    return { error: 'load_failed' };
  }

  const rows = bundleRows ?? [];
  const published = rows.filter((r) => Boolean(r.published_at));
  const unpublishedIds = rows.filter((r) => !r.published_at).map((r) => r.id);

  if (published.length === 0) {
    return { error: 'paid_requires_public_published' };
  }

  const ref = published[0];
  const needsNewStripe =
    published.some(
      (r) =>
        !r.stripe_price_id ||
        r.monthly_amount_cents !== amountCents ||
        String(r.currency || 'eur').toLowerCase() !== currency ||
        !r.paid_access_enabled
    ) || published.some((r) => r.stripe_price_id !== ref.stripe_price_id);

  if (!needsNewStripe) {
    if (unpublishedIds.length) {
      const { error: upUnpubOnlyErr } = await supabase
        .from('lists')
        .update({
          monthly_amount_cents: amountCents,
          currency,
        })
        .in('id', unpublishedIds);
      if (upUnpubOnlyErr) {
        console.error('[syncSubscriberListsBundlePrice] lists update unpublished', upUnpubOnlyErr);
        return { error: 'save_failed' };
      }
    }
    return { error: null };
  }

  let productId;
  let priceId;

  try {
    const product = await stripe.products.create(
      {
        name: 'Subscriber lists (NomNom)',
        metadata: { creator_user_id: user.id, app: 'nomnom' },
      },
      { stripeAccount: connectId }
    );
    productId = product.id;
    const price = await stripe.prices.create(
      {
        product: productId,
        unit_amount: amountCents,
        currency,
        recurring: { interval: 'month' },
      },
      { stripeAccount: connectId }
    );
    priceId = price.id;
  } catch (e) {
    console.error('[syncSubscriberListsBundlePrice] stripe product/price', e);
    return { error: 'stripe_product_failed' };
  }

  const publishedIds = published.map((r) => r.id);
  const { error: upPubErr } = await supabase
    .from('lists')
    .update({
      paid_access_enabled: true,
      monthly_amount_cents: amountCents,
      currency,
      stripe_product_id: productId,
      stripe_price_id: priceId,
    })
    .in('id', publishedIds);

  if (upPubErr) {
    console.error('[syncSubscriberListsBundlePrice] lists update published', upPubErr);
    return { error: 'save_failed' };
  }

  if (unpublishedIds.length) {
    const { error: upUnpubErr } = await supabase
      .from('lists')
      .update({
        monthly_amount_cents: amountCents,
        currency,
      })
      .in('id', unpublishedIds);

    if (upUnpubErr) {
      console.error('[syncSubscriberListsBundlePrice] lists update unpublished', upUnpubErr);
      return { error: 'save_failed' };
    }
  }

  return { error: null };
}

/**
 * Loads Connect flags from DB, then refreshes from Stripe when an account exists (fixes webhook lag /
 * mismatch between payouts vs charges). Paid lists require `charges_enabled`.
 *
 * @returns {Promise<{ accountId: string | null, chargesEnabled: boolean, payoutsEnabled: boolean, defaultCountry: string } | { error: string }>}
 */
export async function getMyStripeConnectStatus() {
  const stripe = getStripe();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) return { error: 'unauthorized' };

  const { data: row, error } = await supabase
    .from('customers')
    .select(
      'stripe_connect_account_id, stripe_connect_charges_enabled, stripe_connect_payouts_enabled'
    )
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[getMyStripeConnectStatus]', error);
    return { error: 'load_failed' };
  }

  const accountId = row?.stripe_connect_account_id ?? null;
  let chargesEnabled = Boolean(row?.stripe_connect_charges_enabled);
  let payoutsEnabled = Boolean(row?.stripe_connect_payouts_enabled);

  if (accountId && stripe) {
    try {
      const acct = await stripe.accounts.retrieve(accountId);
      chargesEnabled = acct.charges_enabled === true;
      payoutsEnabled = acct.payouts_enabled === true;
      if (
        chargesEnabled !== Boolean(row.stripe_connect_charges_enabled) ||
        payoutsEnabled !== Boolean(row.stripe_connect_payouts_enabled)
      ) {
        const { error: syncErr } = await supabase.from('customers').upsert(
          {
            id: user.id,
            stripe_connect_account_id: accountId,
            stripe_connect_charges_enabled: chargesEnabled,
            stripe_connect_payouts_enabled: payoutsEnabled,
          },
          { onConflict: 'id' }
        );
        if (syncErr) {
          console.warn('[getMyStripeConnectStatus] could not persist flags', syncErr);
        }
      }
    } catch (e) {
      console.error('[getMyStripeConnectStatus] accounts.retrieve', e);
    }
  }

  return {
    accountId,
    chargesEnabled,
    payoutsEnabled,
    defaultCountry: STRIPE_CONNECT_DEFAULT_COUNTRY,
  };
}
