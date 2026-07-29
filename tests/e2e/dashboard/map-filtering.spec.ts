import { expect, test } from '@playwright/test';

import { expectSignedInDashboardShell } from '../support/page-assertions';
import { dashboardTestsDisabled } from '../support/skip-dashboard';
import { E2E_DASHBOARD_AUTH_SETUP_HINT } from '../support/test-credentials';

/**
 * Map filter sheet mechanics (deterministic, independent of tile/pin data):
 * open via ?filters=open, switch sort mode through the "Sort by" menu, and
 * "Clear all filters" resets sort back to the Distance default.
 *
 * The sort control is a single pill button (accessible name "Sort by") whose
 * visible label reflects the active mode; clicking it opens a menu of modes
 * (Relevance / Distance / Last added). Selecting a mode is a menuitem click,
 * not an aria-pressed toggle.
 */
test.describe('dashboard map — filtering', () => {
  test.beforeEach(({}, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
  });

  test('filter sheet: switch sort + clear all resets to Distance', async ({ page }) => {
    test.setTimeout(150_000);
    await page.goto('/dashboard/map?filters=open', {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });
    try {
      await expectSignedInDashboardShell(page, { timeout: 45_000 });
    } catch {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
      await expectSignedInDashboardShell(page, { timeout: 45_000 });
    }

    // The sheet auto-opens from ?filters=open.
    await expect(page.getByText('Spot filters')).toBeVisible({ timeout: 45_000 });

    // The sort control is the "Sort by" pill; its label shows the active mode.
    const sortButton = page.getByRole('button', { name: 'Sort by' });
    await expect(sortButton).toBeVisible({ timeout: 15_000 });

    // Distance is the default sort.
    await expect(sortButton).toContainText('Distance', { timeout: 15_000 });

    // Open the menu and switch to Relevance → the pill label follows.
    // (While the menu is open it traps focus and aria-hides the sheet, so the
    // trigger isn't role-queryable mid-open — assert the label after it closes.)
    await sortButton.click();
    await page.getByRole('menuitem', { name: 'Relevance' }).click();
    await expect(sortButton).toContainText('Relevance', { timeout: 15_000 });

    // Clear all filters → sort returns to Distance.
    await page.getByRole('button', { name: 'Clear all filters' }).click();
    await expect(sortButton).toContainText('Distance', { timeout: 15_000 });

    await expectSignedInDashboardShell(page, { timeout: 15_000 });
  });
});
