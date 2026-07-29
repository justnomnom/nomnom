import { expect, test } from '@playwright/test';

import { expectSignedInDashboardShell } from '../support/page-assertions';
import { dashboardTestsDisabled } from '../support/skip-dashboard';
import { E2E_DASHBOARD_AUTH_SETUP_HINT } from '../support/test-credentials';

test.describe('dashboard navigation', () => {
  test.beforeEach(({ }, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
  });

  test.beforeEach(() => {
    test.setTimeout(120_000);
  });

  /** Discover after other routes so storage-state cookies are applied (first navigation can race the dev server). */
  const paths = [
    '/dashboard/lists',
    '/dashboard/discover',
    '/dashboard/map',
    '/dashboard/settings',
    '/dashboard/feedback',
    '/dashboard/roulette',
  ];

  for (const path of paths) {
    test(`loads ${path}`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'load', timeout: 120_000 });
      await expect(page).toHaveURL(new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      try {
        await expectSignedInDashboardShell(page, { timeout: 45_000 });
      } catch {
        await page.reload({ waitUntil: 'load', timeout: 120_000 });
        await expectSignedInDashboardShell(page, { timeout: 45_000 });
      }

      if (path === '/dashboard/discover') {
        await expect(page.getByTestId('e2e-discover-view')).toBeVisible({ timeout: 30_000 });
        await expect(page.locator('[data-testid="e2e-discover-loading"]')).toHaveCount(0);
      }
    });
  }
});
