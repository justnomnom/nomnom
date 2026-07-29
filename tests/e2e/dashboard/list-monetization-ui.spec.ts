import { expect, test } from '@playwright/test';

import { loadE2EEnv } from '../load-env';
import { deleteList, createOwnedList } from '../support/seed';
import { dashboardTestsDisabled } from '../support/skip-dashboard';
import { hasServiceRoleCredentials } from '../support/service-role';
import { getServiceRoleClient, getUserIdByEmail } from '../support/supabase-service';
import { expectSignedInDashboardShell } from '../support/page-assertions';
import {
  E2E_DASHBOARD_AUTH_SETUP_HINT,
  getE2ETestUserEmailForDb,
} from '../support/test-credentials';

/**
 * List monetization UI gating (TEST-PLAN §6 note). There is no per-list paid toggle in the
 * UI: monetization = Audience "Public — subscribers" + a bundle price saved on Billing
 * (syncSubscriberListsBundlePrice flips paid_access_enabled on published subscriber lists).
 * These tests cover the deterministic no-Stripe gating states a creator WITHOUT Connect
 * sees — the exact points where the flow blocks until payout setup is finished:
 *  - list manage (Audience tab): "Payout setup required" prompt with the "Open billing" CTA;
 *  - Billing & payouts: payout card offers "Set up", and the Monthly subscription card
 *    blocks price entry with the setup-first alert (needs ≥1 monetizable list — seeded).
 * The happy-path price → paid_access_enabled flip needs live Stripe Connect and is covered
 * API-side by monetization-money-path.spec.ts.
 */
test.describe('list monetization — UI gating without Connect', () => {
  test.beforeEach(async ({}, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
    if (!hasServiceRoleCredentials()) {
      testInfo.skip(true, 'Service role needed to seed a list and check Connect state');
    }
  });

  test('manage → Audience shows the payout-setup prompt for an owner without Connect', async ({
    page,
  }) => {
    test.setTimeout(240_000);
    loadE2EEnv();
    const admin = getServiceRoleClient();
    const userId = await getUserIdByEmail(await getE2ETestUserEmailForDb());
    test.skip(!userId, 'Could not resolve the shared E2E user id from email');
    if (!userId) return;

    // Precondition: the shared user must not have a charges-enabled Connect account,
    // or the manage page legitimately hides the prompt (env drift guard, not a failure).
    const { data: customer } = await admin
      .from('customers')
      .select('stripe_connect_charges_enabled')
      .eq('id', userId)
      .maybeSingle();
    test.skip(
      customer?.stripe_connect_charges_enabled === true,
      'Shared E2E user already has Connect charges enabled — gating prompt not applicable'
    );

    const listId = await createOwnedList(userId, { name: `E2E Monetize UI ${Date.now()}` });
    try {
      await page.goto(`/dashboard/lists/${listId}/manage`, {
        waitUntil: 'domcontentloaded',
        timeout: 180_000,
      });
      await expectSignedInDashboardShell(page, { timeout: 45_000 });

      await page.getByRole('tab', { name: 'Audience' }).click();
      await expect(page.getByText('Payout setup required')).toBeVisible({ timeout: 45_000 });
      const billingCta = page.getByRole('link', { name: 'Open billing' }).first();
      await expect(billingCta).toBeVisible();
      await expect(billingCta).toHaveAttribute('href', /\/dashboard\/settings\/billing/);
    } finally {
      await deleteList(listId);
    }
  });

  test('billing page blocks the bundle price until payout setup is done', async ({ page }) => {
    test.setTimeout(240_000);
    loadE2EEnv();
    const admin = getServiceRoleClient();
    const userId = await getUserIdByEmail(await getE2ETestUserEmailForDb());
    test.skip(!userId, 'Could not resolve the shared E2E user id from email');
    if (!userId) return;

    const { data: customer } = await admin
      .from('customers')
      .select('stripe_connect_charges_enabled')
      .eq('id', userId)
      .maybeSingle();
    test.skip(
      customer?.stripe_connect_charges_enabled === true,
      'Shared E2E user already has Connect charges enabled — setup gating not applicable'
    );

    // The Monthly subscription card only gates when ≥1 monetizable (public) list exists.
    const listId = await createOwnedList(userId, { name: `E2E Monetize Gate ${Date.now()}` });
    try {
      await page.goto('/dashboard/settings/billing', {
        waitUntil: 'domcontentloaded',
        timeout: 180_000,
      });
      await expectSignedInDashboardShell(page, { timeout: 45_000 });

      // Payout card: not linked yet → the "Set up" entry point.
      await expect(page.getByText('Getting paid by subscribers')).toBeVisible({
        timeout: 60_000,
      });
      await expect(page.getByRole('button', { name: 'Set up', exact: true })).toBeVisible({
        timeout: 30_000,
      });

      // Price card: blocked until the payout setup above is finished.
      await expect(
        page.getByText('Finish subscriber payout setup in the card above', { exact: false })
      ).toBeVisible({ timeout: 30_000 });
    } finally {
      await deleteList(listId);
    }
  });
});
