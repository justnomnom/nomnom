import { expect, test } from '@playwright/test';

import { expectSignedInDashboardShell } from '../support/page-assertions';
import { dashboardTestsDisabled } from '../support/skip-dashboard';
import { E2E_DASHBOARD_AUTH_SETUP_HINT } from '../support/test-credentials';

/**
 * Signed-in Lists hub smoke: chrome + ListsHub copy, not just “the route loads”.
 * Create/delete and filter-tab coverage live in lists-mutations / lists-filter-variations.
 */
test.describe('dashboard lists hub', () => {
  test.beforeEach(({}, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
  });

  test('signed-in hub shows NomNom Lists heading, filters, and new-list control', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.goto('/dashboard/lists', { waitUntil: 'load', timeout: 120_000 });
    await expect(page).toHaveURL(/\/dashboard\/lists$/);

    try {
      await expectSignedInDashboardShell(page, { timeout: 45_000 });
    } catch {
      await page.reload({ waitUntil: 'load', timeout: 120_000 });
      await expectSignedInDashboardShell(page, { timeout: 45_000 });
    }

    await expect(page.getByRole('heading', { name: 'NomNom Lists' })).toBeVisible({
      timeout: 45_000,
    });
    await expect(
      page.getByText('All your lists in one place: your own, collaborations, follows, and paid subscriptions. Tap a chip to filter.')
    ).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole('button', { name: 'All', exact: true })).toBeVisible({
      timeout: 45_000,
    });
    await expect(page.getByTestId('e2e-lists-new')).toBeVisible({ timeout: 45_000 });
  });

  test('Import from Google Maps opens the paste-link sheet and rejects a non-Maps URL', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.goto('/dashboard/lists', { waitUntil: 'load', timeout: 120_000 });
    try {
      await expectSignedInDashboardShell(page, { timeout: 45_000 });
    } catch {
      await page.reload({ waitUntil: 'load', timeout: 120_000 });
      await expectSignedInDashboardShell(page, { timeout: 45_000 });
    }

    await page.getByTestId('e2e-lists-new').click();
    await expect(page.getByRole('button', { name: 'Import from Google Maps' })).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole('button', { name: 'Import from Google Maps' }).click();
    await expect(page.getByRole('heading', { name: 'Import from Google Maps' })).toBeVisible({
      timeout: 30_000,
    });
    await page.getByLabel(/Google Maps list link/i).fill('https://evil.example/maps');
    await page.getByRole('button', { name: 'Find spots' }).click();
    await expect(page.getByRole('alert')).toContainText(/doesn.t look like a Google Maps link/i, {
      timeout: 30_000,
    });
  });
});
