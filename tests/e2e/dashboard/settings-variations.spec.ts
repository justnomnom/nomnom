import { expect, test } from '@playwright/test';

import { expectSignedInDashboardShell } from '../support/page-assertions';
import { dashboardTestsDisabled } from '../support/skip-dashboard';
import { E2E_DASHBOARD_AUTH_SETUP_HINT } from '../support/test-credentials';

/**
 * Authenticated settings mutations/variations that don't need Stripe or extra seed data:
 * theme toggle (persists via settings provider → html[data-theme]), language EN↔PT switch,
 * and the empty-state renders for billing / my-subscriptions (test user has no purchases).
 */
test.describe('dashboard settings — variations', () => {
  test.beforeEach(({}, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
  });

  test('appearance: Dark then Light updates html[data-theme]', async ({ page }) => {
    test.setTimeout(150_000);
    await page.goto('/dashboard/settings/appearance', {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });
    await expectSignedInDashboardShell(page, { timeout: 45_000 });

    const dark = page.getByText('Dark', { exact: true });
    const light = page.getByText('Light', { exact: true });
    await expect(dark).toBeVisible({ timeout: 45_000 });

    await dark.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark', { timeout: 15_000 });

    await light.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light', { timeout: 15_000 });
  });

  test('language: switching to Portuguese re-renders localized copy, then back to English', async ({
    page,
  }) => {
    test.setTimeout(150_000);
    await page.goto('/dashboard/settings/appearance', {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });
    await expectSignedInDashboardShell(page, { timeout: 45_000 });

    // EN baseline: the page title is "Appearance & language".
    await expect(page.getByText('Appearance & language')).toBeVisible({ timeout: 45_000 });

    await page.getByText('Portuguese', { exact: true }).click();
    // PT title is "Aparência e idioma".
    await expect(page.getByText('Aparência e idioma')).toBeVisible({ timeout: 15_000 });

    // Row labels are always the endonym-free English names ('English'/'Portuguese'),
    // so reset to English by clicking that row; the title flips back to EN.
    await page.getByText('English', { exact: true }).click();
    await expect(page.getByText('Appearance & language')).toBeVisible({ timeout: 15_000 });
  });

  for (const { path, label } of [
    { path: '/dashboard/settings/billing', label: 'billing' },
    { path: '/dashboard/settings/my-subscriptions', label: 'my-subscriptions' },
    { path: '/dashboard/settings/subscribers', label: 'subscribers' },
  ]) {
    test(`${label} renders its (empty) state without crashing`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 120_000 });
      await expect(page).toHaveURL(new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      await expectSignedInDashboardShell(page, { timeout: 45_000 });
    });
  }
});
