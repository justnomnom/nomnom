import { NextResponse } from 'next/server';

import { getSiteUrl } from 'src/libs/site-url';
import { getStripe } from 'src/libs/stripe/stripe-server';
import { captureServerEvent } from 'src/libs/posthog/capture-server-event';
import { STRIPE_CONNECT_DEFAULT_COUNTRY } from 'src/libs/stripe/list-stripe-constants';
import {
  getSupabaseAuthUser,
  createSupabaseServerClient,
} from 'src/libs/supabase/supabase-server-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * @param {string} errorKey
 * @param {unknown} err
 * @returns {Record<string, unknown>}
 */
function jsonWithStripeError(errorKey, err) {
  /** @type {Record<string, unknown>} */
  const body = { error: errorKey };
  if (typeof err === 'object' && err !== null && 'type' in err) {
    const se = /** @type {{ code?: string; type?: string; message?: string; param?: string }} */ (
      err
    );
    if (se.code) body.stripe_code = se.code;
    if (se.type) body.stripe_type = se.type;
    if (se.message) body.stripe_message = se.message;
    if (se.param) body.stripe_param = se.param;
  }
  return body;
}

/**
 * Creates a Stripe Connect Express account (if needed) and returns an Account Link URL for onboarding.
 */
export async function POST() {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });
  }

  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user?.id || !user.email) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: row, error: fetchErr } = await supabase
    .from('customers')
    .select('stripe_connect_account_id')
    .eq('id', user.id)
    .maybeSingle();

  if (fetchErr) {
    console.error('[stripe connect onboard] customers fetch', fetchErr);
    return NextResponse.json({ error: 'profile_load_failed' }, { status: 500 });
  }

  let accountId = row?.stripe_connect_account_id ?? null;

  const expressAccountBody = {
    type: 'express',
    country: STRIPE_CONNECT_DEFAULT_COUNTRY,
    email: user.email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: { supabase_user_id: user.id },
  };

  /**
   * @returns {Promise<
   *   | { ok: true; accountId: string }
   *   | { ok: false; response: import('next/server').NextResponse }
   * >}
   */
  const createExpressAccountAndSave = async () => {
    let account;
    try {
      account = await stripe.accounts.create(expressAccountBody);
    } catch (e) {
      console.error('[stripe connect onboard] accounts.create', e);
      return {
        ok: false,
        response: NextResponse.json(jsonWithStripeError('stripe_account_create_failed', e), {
          status: 502,
        }),
      };
    }
    const { error: upErr } = await supabase.from('customers').upsert(
      {
        id: user.id,
        stripe_connect_account_id: account.id,
      },
      { onConflict: 'id' }
    );
    if (upErr) {
      console.error('[stripe connect onboard] customers upsert', upErr);
      return {
        ok: false,
        response: NextResponse.json({ error: 'account_save_failed' }, { status: 500 }),
      };
    }
    return { ok: true, accountId: account.id };
  };

  if (!accountId) {
    const step = await createExpressAccountAndSave();
    if (!step.ok) return step.response;
    ({ accountId } = step);
  }

  const base = getSiteUrl();
  const refreshUrl = `${base}/dashboard/settings/billing?connect=refresh`;
  const returnUrl = `${base}/dashboard/settings/billing?connect=return`;

  // An account that is already onboarded needs its Express *dashboard*, not the onboarding
  // flow again — that is where payouts, balances and payment history live. The UI already
  // relabels this button "Manage" once the account is ready, but it kept issuing an
  // account_onboarding link, so creators had no payout dashboard at all.
  //
  // Decided server-side from the live account rather than from a client-supplied mode: the
  // client's view of readiness is cached and can be stale, and createLoginLink fails on an
  // account that has not finished onboarding.
  try {
    const account = await stripe.accounts.retrieve(accountId);
    if (account?.charges_enabled && account?.details_submitted) {
      const loginLink = await stripe.accounts.createLoginLink(accountId);
      await captureServerEvent('stripe_connect_started', {
        user_id: user.id,
        status: 'dashboard',
      });
      return NextResponse.json({ url: loginLink.url, mode: 'dashboard' });
    }
  } catch (e) {
    // Fall through to onboarding: a readiness check that failed is not a reason to deny
    // the creator the one link that always works.
    console.warn('[stripe connect onboard] login-link path unavailable, using onboarding', e);
  }

  let link;
  try {
    link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });
  } catch (e) {
    const se = /** @type {{ code?: string; param?: string }} */ (e);
    const staleAccount =
      se.code === 'resource_missing' && se.param === 'account' && typeof accountId === 'string';

    if (staleAccount) {
      console.warn(
        '[stripe connect onboard] stale stripe_connect_account_id, resetting',
        accountId
      );
      const { error: clearErr } = await supabase.from('customers').upsert(
        {
          id: user.id,
          stripe_connect_account_id: null,
          stripe_connect_charges_enabled: false,
          stripe_connect_payouts_enabled: false,
        },
        { onConflict: 'id' }
      );
      if (clearErr) {
        console.error('[stripe connect onboard] clear stale account', clearErr);
        await captureServerEvent('stripe_connect_failed', {
          user_id: user.id,
          error_code: 'account_clear_failed',
        });
        return NextResponse.json({ error: 'account_clear_failed' }, { status: 500 });
      }

      const recreated = await createExpressAccountAndSave();
      if (!recreated.ok) {
        await captureServerEvent('stripe_connect_failed', {
          user_id: user.id,
          error_code: 'account_recreate_failed',
        });
        return recreated.response;
      }

      try {
        link = await stripe.accountLinks.create({
          account: recreated.accountId,
          refresh_url: refreshUrl,
          return_url: returnUrl,
          type: 'account_onboarding',
        });
      } catch (e2) {
        console.error('[stripe connect onboard] accountLinks.create (after reset)', e2);
        await captureServerEvent('stripe_connect_failed', {
          user_id: user.id,
          error_code: 'account_link_failed',
        });
        return NextResponse.json(jsonWithStripeError('account_link_failed', e2), { status: 502 });
      }

      await captureServerEvent('stripe_connect_started', {
        user_id: user.id,
        status: 'onboarding',
        reset: true,
      });
      return NextResponse.json({ url: link.url });
    }

    console.error('[stripe connect onboard] accountLinks.create', e);
    await captureServerEvent('stripe_connect_failed', {
      user_id: user.id,
      error_code: 'account_link_failed',
    });
    return NextResponse.json(jsonWithStripeError('account_link_failed', e), { status: 502 });
  }

  await captureServerEvent('stripe_connect_started', {
    user_id: user.id,
    status: 'onboarding',
  });
  return NextResponse.json({ url: link.url });
}
