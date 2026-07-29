import { expect, test } from '@playwright/test';

import { expectAppShellMainVisible, expectSignedInDashboardShell } from '../support/page-assertions';
import { dashboardTestsDisabled } from '../support/skip-dashboard';
import { hasServiceRoleCredentials } from '../support/service-role';
import { getAnyListId, getAnyRestaurantId } from '../support/supabase-service';
import { E2E_DASHBOARD_AUTH_SETUP_HINT } from '../support/test-credentials';

/**
 * Loads entity detail pages when the DB has at least one row (requires service role in .env).
 */
test.describe('dashboard — deep links from database', () => {
  test.beforeEach(({}, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
    if (!hasServiceRoleCredentials()) {
      testInfo.skip(true, 'Set E2E_SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY for DB sample lookups');
    }
  });

  test('restaurant detail loads when a restaurant exists', async ({ page }) => {
    const id = await getAnyRestaurantId();
    test.skip(!id, 'No rows in public.restaurants — seed data or skip');

    await page.goto(`/dashboard/restaurants/${id}`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(new RegExp(`/dashboard/restaurants/${id}`));
    await expectSignedInDashboardShell(page);
  });

  test('dashboard list detail loads when a list exists', async ({ page }) => {
    const id = await getAnyListId();
    test.skip(!id, 'No rows in public.lists — create a list or skip');

    await page.goto(`/dashboard/lists/${id}`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(new RegExp(`/dashboard/lists/${id}`));
    await expectSignedInDashboardShell(page);
  });

  test('public list page loads when a list exists', async ({ page }) => {
    const id = await getAnyListId();
    test.skip(!id, 'No rows in public.lists');

    await page.goto(`/lists/${id}`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(new RegExp(`/lists/${id}`));
    /** Published list is a marketing route — no session required; do not assert the dashboard auth gate. */
    await expectAppShellMainVisible(page);
  });
});
