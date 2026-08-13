import { expect, test } from '@playwright/test';

import { loadE2EEnv } from '../load-env';
import { expectSignedInDashboardShell } from '../support/page-assertions';
import { dashboardTestsDisabled } from '../support/skip-dashboard';
import { hasServiceRoleCredentials } from '../support/service-role';
import { getUserIdByEmail, getServiceRoleClient } from '../support/supabase-service';
import {
  E2E_DASHBOARD_AUTH_SETUP_HINT,
  getE2ETestUserEmailForDb,
} from '../support/test-credentials';

/**
 * Onboarding completion gate (TEST-PLAN O2) and the settings route missing from
 * navigation-extended (my-subscriptions).
 *
 * Ensures the shared dashboard user is marked complete up front — other suites
 * (or manual DB edits) can clear `onboarding_completed_at` and strand this gate.
 */
test.describe('onboarding gate — completed user', () => {
  test.beforeEach(({}, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
  });

  test.beforeAll(async () => {
    if (dashboardTestsDisabled() || !hasServiceRoleCredentials()) return;
    loadE2EEnv();
    const email = await getE2ETestUserEmailForDb();
    const userId = await getUserIdByEmail(email);
    if (!userId) return;
    const admin = getServiceRoleClient();
    const { error } = await admin
      .from('users')
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq('id', userId);
    if (error) throw new Error(`ensure shared e2e user onboarding-complete: ${error.message}`);
  });

  test('/onboarding redirects a completed user to discover', async ({ page }) => {
    test.setTimeout(180_000);
    // Layout `redirect()` streams as a client navigation — `waitUntil: 'load'` can hang
    // on a cold webpack compile of the destination. Wait for DOM, then poll the URL.
    await page.goto('/onboarding', { waitUntil: 'domcontentloaded', timeout: 180_000 });
    try {
      await expect(page).toHaveURL(/\/dashboard\/discover/, { timeout: 60_000 });
    } catch {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 180_000 });
      await expect(page).toHaveURL(/\/dashboard\/discover/, { timeout: 60_000 });
    }
  });

  test('loads /dashboard/settings/my-subscriptions', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/dashboard/settings/my-subscriptions', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/dashboard\/settings\/my-subscriptions/);
    try {
      await expectSignedInDashboardShell(page, { timeout: 25_000 });
    } catch {
      // First dev-server compile of this route can outlast the client auth check.
      await page.reload({ waitUntil: 'load', timeout: 120_000 });
      await expectSignedInDashboardShell(page, { timeout: 25_000 });
    }
  });
});
