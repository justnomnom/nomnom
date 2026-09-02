import { expect, test } from '@playwright/test';

import { expectSignedInDashboardShell } from '../support/page-assertions';
import { dashboardTestsDisabled } from '../support/skip-dashboard';
import { E2E_DASHBOARD_AUTH_SETUP_HINT } from '../support/test-credentials';

/**
 * Authenticated settings mutations/variations that don't need Stripe or extra seed data:
 * theme toggle S1 (persists via settings provider → html[data-theme]), language EN↔PT switch,
 * and the empty-state renders for billing / my-subscriptions (TEST-PLAN S3 empty; S4 empty).
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
    test.setTimeout(180_000);
    const origin = process.env.E2E_BASE_URL || 'http://localhost:3032';

    // Keep localStorage in sync with the locale cookie on every document start so
    // a client `useEffect` does not overwrite SSR `ui_locale` with a stale `en`.
    await page.addInitScript(() => {
      const match = document.cookie.match(/(?:^|; )ui_locale=(en|pt)(?:;|$)/);
      const lng = match ? match[1] : null;
      if (!lng) return;
      try {
        for (const key of Object.keys(localStorage)) {
          if (key.startsWith('i18next-lng')) localStorage.setItem(key, lng);
        }
      } catch {
        /* private mode */
      }
    });

    try {
      await page.context().addCookies([{ name: 'ui_locale', value: 'pt', url: origin }]);
      await page.goto('/dashboard/settings/appearance', {
        waitUntil: 'domcontentloaded',
        timeout: 120_000,
      });
      await expectSignedInDashboardShell(page, { timeout: 45_000 });
      await expect(
        page.getByRole('heading', { level: 1, name: 'Aparência e idioma', exact: true })
      ).toBeVisible({ timeout: 45_000 });

      await page.context().addCookies([{ name: 'ui_locale', value: 'en', url: origin }]);
      await page.goto('/dashboard/settings/appearance', {
        waitUntil: 'domcontentloaded',
        timeout: 120_000,
      });
      await expect(
        page.getByRole('heading', { level: 1, name: 'Appearance & language', exact: true })
      ).toBeVisible({ timeout: 45_000 });
    } finally {
      await page.context().addCookies([{ name: 'ui_locale', value: 'en', url: origin }]);
    }
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
