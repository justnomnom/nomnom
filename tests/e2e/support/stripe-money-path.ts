import { spawn, execFile, type ChildProcess } from 'node:child_process';

import Stripe from 'stripe';

import { loadE2EEnv } from '../load-env';

/**
 * Live Stripe (test-mode) helpers for the paid-list money path. Everything here talks to the real
 * Stripe test API against a real Connect test account (see `npm run stripe:e2e:setup`).
 *
 * Payments are completed via the Stripe **API** using tokenized test cards, not by driving the
 * hosted Checkout page. Stripe's hosted Checkout (checkout.stripe.com) presents an **hCaptcha bot
 * challenge** on submit that a headless browser cannot solve — the session stays `open/unpaid` and
 * no PaymentIntent is ever created. Completing the equivalent payment via the API
 * (`pm_card_visa` = 4242, `pm_card_chargeCustomerFail` = 4000…0341) fires the *identical* real
 * webhooks (`customer.subscription.*`, `checkout.session.completed`), which is what the money path
 * actually verifies: webhook → access row → paywall unlock → cancel revokes.
 *
 * The spec still calls the app's `/api/stripe/checkout/list` route and asserts it returns a real
 * `checkout.stripe.com` session, so the route (guards + Stripe session creation on the connected
 * account) stays under test.
 */

/** Tokenized test cards (Stripe-hosted PaymentMethods). */
export const TEST_PM_SUCCESS = 'pm_card_visa'; // 4242 4242 4242 4242
export const TEST_PM_CHARGE_FAIL = 'pm_card_chargeCustomerFail'; // 4000 0000 0000 0341

export type MoneyPathConfig = {
  connectAccountId: string;
  priceId: string;
  amountCents: number;
  currency: string;
};

/** Reads the money-path Stripe ids from env, or null when setup has not been run. */
export function moneyPathConfig(): MoneyPathConfig | null {
  loadE2EEnv();
  const connectAccountId = process.env.E2E_STRIPE_CONNECT_ACCOUNT_ID?.trim();
  const priceId = process.env.E2E_STRIPE_PRICE_ID?.trim();
  if (!connectAccountId || !priceId) return null;
  return {
    connectAccountId,
    priceId,
    amountCents: Number(process.env.E2E_STRIPE_PRICE_AMOUNT_CENTS || '500'),
    currency: (process.env.E2E_STRIPE_PRICE_CURRENCY || 'eur').toLowerCase(),
  };
}

export const MONEY_PATH_SETUP_HINT =
  'Money-path Stripe objects missing. Run `npm run stripe:e2e:setup` (needs sk_test_ STRIPE_SECRET_KEY) ' +
  'to create the Connect test account + price, then re-run.';

let _stripe: Stripe | null = null;
export function getLiveStripe(): Stripe {
  if (_stripe) return _stripe;
  loadE2EEnv();
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error('STRIPE_SECRET_KEY not set');
  _stripe = new Stripe(key, { apiVersion: Stripe.API_VERSION });
  return _stripe;
}

export function stripeIsTestMode(): boolean {
  loadE2EEnv();
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim().startsWith('sk_test_'));
}

/**
 * Poll `fn` until it returns a truthy value or the timeout elapses. Used to wait for a webhook to
 * persist a row (the forwarder delivers asynchronously).
 */
export async function pollUntil<T>(
  fn: () => Promise<T>,
  opts: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<T> {
  const timeoutMs = opts.timeoutMs ?? 45_000;
  const intervalMs = opts.intervalMs ?? 1_500;
  const start = Date.now();
  let last: T;
  do {
    last = await fn();
    if (last) return last;
    await new Promise((r) => setTimeout(r, intervalMs));
  } while (Date.now() - start < timeoutMs);
  return last!;
}

// ----------------------------------------------------------------------
// Payment completion via the Stripe API
// ----------------------------------------------------------------------

/**
 * Create a subscription on the connected account with a tokenized test card, mirroring what the
 * hosted Checkout would produce (same price, metadata, application fee). Fires
 * `customer.subscription.created` (+ invoice events) → the app webhook writes `list_subscriptions`.
 *
 * @returns the subscription id + status (and the customer id for teardown).
 */
export async function createSubscriptionViaApi(params: {
  connectAccountId: string;
  priceId: string;
  listId: string;
  subscriberUserId: string;
  email: string;
  paymentMethod?: string;
  feePercent?: number;
}): Promise<{ subscriptionId: string; customerId: string; status: string }> {
  const stripe = getLiveStripe();
  const pm = params.paymentMethod ?? TEST_PM_SUCCESS;
  const customer = await stripe.customers.create(
    {
      email: params.email,
      payment_method: pm,
      invoice_settings: { default_payment_method: pm },
      metadata: { purpose: 'nomnom_e2e_money_path' },
    },
    { stripeAccount: params.connectAccountId }
  );
  const sub = await stripe.subscriptions.create(
    {
      customer: customer.id,
      items: [{ price: params.priceId }],
      metadata: { list_id: params.listId, subscriber_user_id: params.subscriberUserId },
      application_fee_percent: params.feePercent ?? 10,
      // A failing card leaves the sub `incomplete`; don't error on that — the test asserts on it.
      payment_behavior: 'allow_incomplete',
    },
    { stripeAccount: params.connectAccountId }
  );
  return { subscriptionId: sub.id, customerId: customer.id, status: sub.status };
}

/** Cancel a subscription on the connected account (fires `customer.subscription.deleted`). */
export async function cancelSubscription(connectAccountId: string, subscriptionId: string) {
  const stripe = getLiveStripe();
  await stripe.subscriptions.cancel(subscriptionId, undefined, { stripeAccount: connectAccountId });
}

/** Delete a connected-account customer created during a test (best effort). */
export async function deleteConnectCustomer(connectAccountId: string, customerId: string) {
  const stripe = getLiveStripe();
  await stripe.customers.del(customerId, { stripeAccount: connectAccountId }).catch(() => {});
}

/**
 * Complete a snapshot (one-time) purchase end-to-end through the real webhook handler: charge a
 * real PaymentIntent on the connected account with a test card, then deliver a **signed**
 * `checkout.session.completed` event (mode=payment, purchase_type=snapshot) to the local webhook.
 *
 * The hosted Checkout that normally produces this event can't be automated (hCaptcha), and a
 * Checkout Session can't be confirmed via the API — so the payment is real (a genuine `pi_…`) and
 * the event is synthesized and signed with STRIPE_WEBHOOK_SECRET, exercising the handler's snapshot
 * branch (`recordSnapshotPurchase` → `list_snapshot_purchases`) against a real charge.
 *
 * @returns the PaymentIntent id written to the access row.
 */
export async function createSnapshotPurchaseViaWebhook(params: {
  connectAccountId: string;
  listId: string;
  buyerUserId: string;
  amountCents: number;
  currency: string;
  webhookUrl?: string;
}): Promise<{ paymentIntentId: string }> {
  const stripe = getLiveStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET not set');

  const pi = await stripe.paymentIntents.create(
    {
      amount: params.amountCents,
      currency: params.currency,
      payment_method: TEST_PM_SUCCESS,
      confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      metadata: {
        list_id: params.listId,
        buyer_user_id: params.buyerUserId,
        purchase_type: 'snapshot',
      },
    },
    { stripeAccount: params.connectAccountId }
  );
  if (pi.status !== 'succeeded') {
    throw new Error(`snapshot PaymentIntent not succeeded: ${pi.status}`);
  }

  const session = {
    id: `cs_test_e2e_${Date.now()}`,
    object: 'checkout.session',
    mode: 'payment',
    payment_status: 'paid',
    amount_total: params.amountCents,
    currency: params.currency,
    payment_intent: pi.id,
    metadata: {
      list_id: params.listId,
      buyer_user_id: params.buyerUserId,
      purchase_type: 'snapshot',
    },
  };
  const event = {
    id: `evt_test_e2e_${Date.now()}`,
    object: 'event',
    type: 'checkout.session.completed',
    account: params.connectAccountId,
    api_version: Stripe.API_VERSION,
    data: { object: session },
  };
  const payload = JSON.stringify(event);
  // The SDK fills timestamp/scheme/signature defaults at runtime, but its
  // WebhookTestHeaderOptions type marks them required — hence the Partial cast.
  const header = stripe.webhooks.generateTestHeaderString({
    payload,
    secret,
  } as Parameters<typeof stripe.webhooks.generateTestHeaderString>[0]);

  const res = await fetch(params.webhookUrl ?? 'http://localhost:3032/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'stripe-signature': header },
    body: payload,
  });
  if (!res.ok) {
    throw new Error(`webhook POST failed: ${res.status} ${await res.text()}`);
  }
  return { paymentIntentId: pi.id };
}

// ----------------------------------------------------------------------
// Webhook forwarder (`stripe listen`)
// ----------------------------------------------------------------------

export type StripeListenHandle = { stop: () => Promise<void> };

/**
 * Spawn `stripe listen` forwarding to the local webhook route and resolve once it prints "Ready".
 * The CLI's signing secret is stable per login; when it matches STRIPE_WEBHOOK_SECRET in .env.local
 * (the app default), the dev server verifies the forwarded events. Safe to run even if the
 * developer already has `npm run stripe:listen` up — Stripe delivers to both and the handler is
 * idempotent (stripe_events).
 */
export async function startStripeListen(
  forwardTo = 'http://localhost:3032/api/webhooks/stripe'
): Promise<StripeListenHandle> {
  const proc: ChildProcess = spawn(
    'stripe',
    ['listen', '--forward-to', forwardTo, '--skip-update'],
    { stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' }
  );

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('stripe listen did not become ready within 20s')),
      20_000
    );
    // The CLI prints "> Ready! You are using Stripe API Version …" to stderr once forwarding starts.
    const onData = (buf: Buffer) => {
      if (/Ready!/i.test(buf.toString())) {
        clearTimeout(timer);
        resolve();
      }
    };
    proc.stdout?.on('data', onData);
    proc.stderr?.on('data', onData);
    proc.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
    proc.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`stripe listen exited early (code ${code})`));
    });
  });

  return {
    stop: () =>
      new Promise<void>((resolve) => {
        if (proc.exitCode !== null || proc.killed || proc.pid == null) return resolve();
        proc.on('exit', () => resolve());
        if (process.platform === 'win32') {
          // With `shell: true` on Windows, proc is the cmd wrapper — `proc.kill()` leaves the
          // grandchild stripe.exe running. Kill the whole tree by PID.
          execFile('taskkill', ['/pid', String(proc.pid), '/T', '/F'], () => resolve());
        } else {
          proc.kill();
        }
        // Fallback if the process never emits exit.
        setTimeout(resolve, 3_000);
      }),
  };
}
