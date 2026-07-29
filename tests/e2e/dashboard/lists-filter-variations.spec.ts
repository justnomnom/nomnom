import { expect, test } from '@playwright/test';

import { expectSignedInDashboardShell } from '../support/page-assertions';
import { dashboardTestsDisabled } from '../support/skip-dashboard';
import { E2E_DASHBOARD_AUTH_SETUP_HINT } from '../support/test-credentials';

/**
 * Lists filter-tab variations (saved-view): each filter (All / Mine / Following /
 * Subscriptions / Shared) must select and render without crashing, whether the
 * bucket is empty or populated. Covers the empty-state branches per filter.
 */
test.describe('dashboard lists — filter variations', () => {
  test.beforeEach(({}, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
  });

  const FILTERS = ['All', 'Mine', 'Following', 'Subscriptions', 'Shared'] as const;

  test('each filter selects and renders without crashing', async ({ page }) => {
    test.setTimeout(150_000);
    await page.goto('/dashboard/lists', { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await expectSignedInDashboardShell(page, { timeout: 45_000 });

    // Filter row only renders after the initial load resolves.
    const allBtn = page.getByRole('button', { name: 'All', exact: true });
    await expect(allBtn).toBeVisible({ timeout: 45_000 });

    for (const label of FILTERS) {
      const btn = page.getByRole('button', { name: label, exact: true });
      await btn.click();
      await expect(btn).toHaveAttribute('aria-pressed', 'true', { timeout: 15_000 });
      // Shell stays intact (no crash into auth gate / error boundary) after the filter swap.
      await expectSignedInDashboardShell(page, { timeout: 15_000 });
    }
  });
});
