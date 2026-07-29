import { type Page, type APIRequestContext, type APIResponse, expect, test } from '@playwright/test';

import { loadE2EEnv } from '../load-env';
import { dashboardTestsDisabled } from '../support/skip-dashboard';
import { getUserIdByEmail, getAnyRestaurantId } from '../support/supabase-service';
import { getE2ETestUserEmailForDb, E2E_DASHBOARD_AUTH_SETUP_HINT } from '../support/test-credentials';
import {
  createOwnedList,
  deleteList,
  seedListItem,
  createSeededUser,
  deleteSeededUser,
  seedCreatorConnect,
  deleteCustomerRow,
  getListSubscriptionRow,
  getSnapshotPurchaseRow,
  deleteListAccessRows,
  type SeededUser,
} from '../support/seed';
import {
  TEST_PM_CHARGE_FAIL,
  moneyPathConfig,
  type MoneyPathConfig,
  MONEY_PATH_SETUP_HINT,
  stripeIsTestMode,
  pollUntil,
  createSubscriptionViaApi,
  cancelSubscription,
  deleteConnectCustomer,
  createSnapshotPurchaseViaWebhook,
  startStripeListen,
  type StripeListenHandle,
} from '../support/stripe-money-path';

/**
 * LIVE paid-list money path against Stripe TEST mode (TEST-PLAN §5, B9–B12).
 *
 * Complements monetization-guards.spec.ts (which stops before Stripe). Each test:
 *   1. calls the app's `/api/stripe/checkout/list` route and asserts it returns a real
 *      `checkout.stripe.com` session on the connected account (route + guards under test);
 *   2. completes the equivalent payment via the Stripe API with a tokenized test card;
 *   3. lets the real webhook grant/deny access and asserts the buyer's paywall unlocks/stays;
 *   4. (subscription) cancels and asserts access is revoked.
 *
 * Why not drive the hosted Checkout page? Stripe's hosted Checkout presents an hCaptcha bot
 * challenge on submit that a headless browser cannot solve, so the session never pays. Completing
 * the same payment via the API (`pm_card_visa` = 4242, `pm_card_chargeCustomerFail` = 4000…0341)
 * fires the identical real webhooks — see docs/stripe-money-path-runbook.md.
 *
 * Requires: `npm run stripe:e2e:setup` (real Connect account + price) and a webhook forwarder —
 * this spec spawns `stripe listen` itself, which relies on the CLI signing secret matching
 * STRIPE_WEBHOOK_SECRET in .env.local (the app default). Skips cleanly when prerequisites are absent.
 */
const PAYWALL_LOCKED_TEXT = 'Unlock every place on this list';

test.describe.configure({ mode: 'serial' });

let cfg: MoneyPathConfig | null = null;
let buyerUserId: string | null = null;
let listen: StripeListenHandle | null = null;
let skipReason: string | null = null;

test.beforeAll(async () => {
  loadE2EEnv();

  if (dashboardTestsDisabled()) {
    skipReason = E2E_DASHBOARD_AUTH_SETUP_HINT;
    return;
  }
  if (!stripeIsTestMode()) {
    skipReason = 'STRIPE_SECRET_KEY is not a test key (sk_test_…); refusing to run live checkout.';
    return;
  }
  if (!process.env.STRIPE_WEBHOOK_SECRET?.trim()) {
    skipReason = 'STRIPE_WEBHOOK_SECRET not set; webhook events cannot be verified.';
    return;
  }
  cfg = moneyPathConfig();
  if (!cfg) {
    skipReason = MONEY_PATH_SETUP_HINT;
    return;
  }

  const email = await getE2ETestUserEmailForDb();
  buyerUserId = await getUserIdByEmail(email);
  if (!buyerUserId) {
    skipReason = `Could not resolve buyer user id for ${email}.`;
    return;
  }

  try {
    listen = await startStripeListen();
  } catch (e) {
    skipReason = `Could not start \`stripe listen\` (is the Stripe CLI installed + logged in?): ${(e as Error).message}`;
  }
});

test.afterAll(async () => {
  await listen?.stop();
});

/** Create a fresh creator + real-price monetized list with one item; returns ids + teardown. */
async function setupMonetizedList(nameSuffix: string): Promise<{
  creator: SeededUser;
  listId: string;
  teardown: () => Promise<void>;
}> {
  const c = cfg!;
  const creator = await createSeededUser('e2ecreator');
  await seedCreatorConnect(creator.id, c.connectAccountId, { chargesEnabled: true });
  const listId = await createOwnedList(creator.id, {
    monetized: true,
    name: `E2E MoneyPath ${nameSuffix} ${Date.now()}`,
    stripePriceId: c.priceId,
    monthlyAmountCents: c.amountCents,
    currency: c.currency,
  });
  const restaurantId = await getAnyRestaurantId();
  if (restaurantId) await seedListItem(listId, restaurantId, creator.id);

  return {
    creator,
    listId,
    teardown: async () => {
      await deleteListAccessRows(listId);
      await deleteList(listId);
      await deleteCustomerRow(creator.id);
      await deleteSeededUser(creator.id);
    },
  };
}

/**
 * POST that tolerates a transient socket reset/slow compile. The checkout route makes a multi-second
 * Stripe round-trip; a dev server can drop or stall an in-flight request. Both checkout routes are
 * idempotent per (user, list), so a retried POST is safe.
 */
async function postWithRetry(
  request: APIRequestContext,
  url: string,
  data: unknown,
  attempts = 3
): Promise<APIResponse> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await request.post(url, { data, timeout: 60_000 });
    } catch (e) {
      lastErr = e;
      if (!/ECONNRESET|socket hang up|ECONNREFUSED|Timeout/i.test((e as Error).message)) throw e;
      await new Promise((r) => setTimeout(r, 3_000));
    }
  }
  throw lastErr;
}

async function gotoWithRetry(page: Page, url: string, attempts = 4) {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      return;
    } catch (e) {
      lastErr = e;
      if (!/ERR_CONNECTION_(RESET|REFUSED)|ECONNRESET|ECONNREFUSED/i.test((e as Error).message)) {
        throw e;
      }
      await new Promise((r) => setTimeout(r, 5_000));
    }
  }
  throw lastErr;
}

/**
 * Navigate to the dashboard list page and assert the paywall is present (locked) or absent
 * (unlocked). Generous timeout: the first hit can compile the route in the webpack dev server.
 */
async function assertPaywall(page: Page, listId: string, state: 'locked' | 'unlocked') {
  await gotoWithRetry(page, `/dashboard/lists/${listId}`);
  const paywall = page.getByText(PAYWALL_LOCKED_TEXT);
  if (state === 'locked') {
    await expect(paywall).toBeVisible({ timeout: 45_000 });
  } else {
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 45_000 });
    await expect(paywall).toHaveCount(0);
  }
}

/** Assert the checkout route created a real Stripe session and return its URL. */
async function expectCheckoutSession(res: APIResponse): Promise<string> {
  test.skip(res.status() === 503, 'Stripe env not configured for this environment');
  expect(res.status(), await res.text()).toBe(200);
  const { url } = await res.json();
  expect(url).toContain('checkout.stripe.com');
  return url;
}

test.beforeEach(() => {
  test.skip(Boolean(skipReason), skipReason ?? '');
});

test('B9/B11 subscription: checkout route → webhook grants access → unlocked → cancel revokes', async ({
  page,
  request,
}) => {
  test.setTimeout(180_000);
  const { listId, teardown } = await setupMonetizedList('sub');
  let customerId: string | null = null;
  try {
    // Locked before purchase.
    await assertPaywall(page, listId, 'locked');

    // 1. The app route creates a real subscription Checkout Session on the connected account.
    const res = await postWithRetry(request, '/api/stripe/checkout/list', { listId });
    await expectCheckoutSession(res);

    // 2. Complete the equivalent payment via the API with the 4242 test card.
    const sub = await createSubscriptionViaApi({
      connectAccountId: cfg!.connectAccountId,
      priceId: cfg!.priceId,
      listId,
      subscriberUserId: buyerUserId!,
      email: `buyer-${Date.now()}@nomnom-e2e.local`,
    });
    customerId = sub.customerId;
    expect(sub.subscriptionId).toMatch(/^sub_/);

    // 3. Forwarded webhook writes the active access row.
    const row = await pollUntil(
      async () => {
        const r = await getListSubscriptionRow(listId, buyerUserId!);
        return r && (r.status === 'active' || r.status === 'trialing') ? r : null;
      },
      { timeoutMs: 60_000 }
    );
    expect(row, 'webhook should have written an active list_subscriptions row').toBeTruthy();
    expect(row!.stripe_subscription_id).toBe(sub.subscriptionId);

    // 4. Buyer sees unlocked content.
    await assertPaywall(page, listId, 'unlocked');

    // 5. Cancel → customer.subscription.deleted → access revoked.
    await cancelSubscription(cfg!.connectAccountId, sub.subscriptionId);
    const canceled = await pollUntil(
      async () => {
        const r = await getListSubscriptionRow(listId, buyerUserId!);
        return r && (r.status === 'canceled' || r.status === 'unpaid') ? r : null;
      },
      { timeoutMs: 60_000 }
    );
    expect(canceled, 'cancel webhook should mark the subscription canceled').toBeTruthy();

    // 6. Paywall returns.
    await assertPaywall(page, listId, 'locked');
  } finally {
    if (customerId) await deleteConnectCustomer(cfg!.connectAccountId, customerId);
    await teardown();
  }
});

test('B10 snapshot: checkout route → webhook records purchase → unlocked', async ({
  page,
  request,
}) => {
  test.setTimeout(180_000);
  const { listId, teardown } = await setupMonetizedList('snap');
  try {
    await assertPaywall(page, listId, 'locked');

    // 1. The app route creates a real one-time (snapshot) Checkout Session.
    const res = await postWithRetry(request, '/api/stripe/checkout/list', {
      listId,
      type: 'snapshot',
    });
    await expectCheckoutSession(res);

    // 2. Charge a real PaymentIntent + deliver a signed checkout.session.completed to the webhook.
    const { paymentIntentId } = await createSnapshotPurchaseViaWebhook({
      connectAccountId: cfg!.connectAccountId,
      listId,
      buyerUserId: buyerUserId!,
      amountCents: Math.max(50, Math.round(cfg!.amountCents * 0.45)),
      currency: cfg!.currency,
    });
    expect(paymentIntentId).toMatch(/^pi_/);

    // 3. The webhook wrote the snapshot purchase row.
    const snap = await pollUntil(async () => getSnapshotPurchaseRow(listId, buyerUserId!), {
      timeoutMs: 30_000,
    });
    expect(snap, 'snapshot purchase row should exist').toBeTruthy();
    expect(snap!.stripe_payment_intent_id).toBe(paymentIntentId);

    // 4. Buyer sees unlocked content.
    await assertPaywall(page, listId, 'unlocked');
  } finally {
    await teardown();
  }
});

test('B12 failed card 4000…0341: charge fails → no access granted', async ({ page, request }) => {
  test.setTimeout(150_000);
  const { listId, teardown } = await setupMonetizedList('fail');
  let customerId: string | null = null;
  try {
    const res = await postWithRetry(request, '/api/stripe/checkout/list', { listId });
    await expectCheckoutSession(res);

    // Card attaches but the charge fails → the subscription is created `incomplete`, never active.
    const sub = await createSubscriptionViaApi({
      connectAccountId: cfg!.connectAccountId,
      priceId: cfg!.priceId,
      listId,
      subscriberUserId: buyerUserId!,
      email: `buyer-fail-${Date.now()}@nomnom-e2e.local`,
      paymentMethod: TEST_PM_CHARGE_FAIL,
    });
    customerId = sub.customerId;
    expect(sub.status, 'a failing card must not yield an active subscription').not.toBe('active');

    // No active access row should ever appear. Let any webhook settle, then assert absent.
    const active = await pollUntil(
      async () => {
        const r = await getListSubscriptionRow(listId, buyerUserId!);
        return r && (r.status === 'active' || r.status === 'trialing') ? r : null;
      },
      { timeoutMs: 15_000, intervalMs: 3_000 }
    );
    expect(active, 'a declined card must not grant access').toBeFalsy();

    // Paywall still shown.
    await assertPaywall(page, listId, 'locked');
  } finally {
    if (customerId) await deleteConnectCustomer(cfg!.connectAccountId, customerId);
    await teardown();
  }
});
