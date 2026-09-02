import { expect, test } from '@playwright/test';

import { expectSignedInDashboardShell, APP_NOT_FOUND_HEADING } from '../support/page-assertions';
import { dashboardTestsDisabled } from '../support/skip-dashboard';
import { E2E_DASHBOARD_AUTH_SETUP_HINT } from '../support/test-credentials';

/**
 * Signed-in shell: redirects and every dashboard sub-route that should render without extra setup.
 */
test.describe('dashboard routes — extended', () => {
  test.beforeEach(({}, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
  });

  test('/dashboard redirects to discover', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/dashboard', { waitUntil: 'load', timeout: 120_000 });
    try {
      await expect(page).toHaveURL(/\/dashboard\/discover/, { timeout: 45_000 });
    } catch {
      await page.reload({ waitUntil: 'load', timeout: 120_000 });
      await expect(page).toHaveURL(/\/dashboard\/discover/, { timeout: 45_000 });
    }
  });

  // Regression: /dashboard/account must redirect to /settings, not crash with a
  // React hooks violation. See next.config.js redirects() — moved from page.js
  // server redirect() which broke client-side navigation in Next.js 16 + React 19.
  test('/dashboard/account redirects to settings', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/dashboard/account', { waitUntil: 'load', timeout: 120_000 });
    try {
      await expect(page).toHaveURL(/\/dashboard\/settings/, { timeout: 45_000 });
    } catch {
      await page.reload({ waitUntil: 'load', timeout: 120_000 });
      await expect(page).toHaveURL(/\/dashboard\/settings/, { timeout: 45_000 });
    }
  });

  const paths = [
    '/dashboard/settings/profile/edit',
    '/dashboard/settings/appearance',
    '/dashboard/settings/preferences',
    '/dashboard/settings/notifications',
    '/dashboard/notifications',
    '/dashboard/settings/billing',
    '/dashboard/settings/subscribers',
    '/dashboard/settings/delete-account',
    '/dashboard/settings/faqs',
    '/dashboard/settings/support',
  ];

  for (const path of paths) {
    test(`loads ${path}`, async ({ page }) => {
      test.setTimeout(180_000);
      await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 120_000 });
      await expect(page).toHaveURL(new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      await expectSignedInDashboardShell(page, { timeout: 60_000 });
    });
  }

  test('admin hub — allowlisted user sees Admin, others see global not-found', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto('/dashboard/admin', { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await expect(page).toHaveURL(/\/dashboard\/admin$/);
    await expectSignedInDashboardShell(page, { timeout: 60_000 });
    await expect(
      page
        .getByRole('heading', { name: 'Admin' })
        .or(page.getByRole('heading', { name: APP_NOT_FOUND_HEADING }))
    ).toBeVisible({ timeout: 45_000 });
  });

  test('admin sponsored placements — allowlisted or not-found shell', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto('/dashboard/admin/sponsored-placements', {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });
    await expect(page).toHaveURL(/\/dashboard\/admin\/sponsored-placements/);
    await expectSignedInDashboardShell(page, { timeout: 60_000 });
    await expect(
      page
        .getByRole('heading', { name: 'Discover sponsored restaurants' })
        .or(page.getByRole('heading', { name: APP_NOT_FOUND_HEADING }))
    ).toBeVisible({ timeout: 45_000 });
  });
});
