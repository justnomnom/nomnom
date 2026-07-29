import { expect, test } from '@playwright/test';

import { expectSignedInDashboardShell } from '../support/page-assertions';
import { dashboardTestsDisabled } from '../support/skip-dashboard';
import { E2E_DASHBOARD_AUTH_SETUP_HINT } from '../support/test-credentials';

/**
 * Onboarding completion gate (TEST-PLAN O2) and the settings route missing from
 * navigation-extended (my-subscriptions).
 */
test.describe('onboarding gate — completed user', () => {
  test.beforeEach(({}, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
  });

  test('/onboarding redirects a completed user to discover', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/onboarding', { waitUntil: 'load', timeout: 120_000 });
    try {
      await expect(page).toHaveURL(/\/dashboard\/discover/, { timeout: 45_000 });
    } catch {
      await page.reload({ waitUntil: 'load', timeout: 120_000 });
      await expect(page).toHaveURL(/\/dashboard\/discover/, { timeout: 45_000 });
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
