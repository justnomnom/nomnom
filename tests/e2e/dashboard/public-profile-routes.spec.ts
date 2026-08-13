import { expect, test } from '@playwright/test';

import { APP_NOT_FOUND_HEADING, expectSignedInDashboardShell } from '../support/page-assertions';
import { dashboardTestsDisabled } from '../support/skip-dashboard';
import { E2E_DASHBOARD_AUTH_SETUP_HINT } from '../support/test-credentials';

/**
 * Optional: set E2E_PUBLIC_PROFILE_USERNAME to a real handle (no @) that exists in production/staging data.
 */
test.describe('public profile by handle (optional)', () => {
  test.beforeEach(({}, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
    const handle = process.env.E2E_PUBLIC_PROFILE_USERNAME?.trim();
    if (!handle) {
      testInfo.skip(true, 'Set E2E_PUBLIC_PROFILE_USERNAME to run profile deep-link tests');
    }
  });

  test('dashboard public profile route loads', async ({ page }) => {
    test.setTimeout(180_000);
    const handle = process.env.E2E_PUBLIC_PROFILE_USERNAME!.trim().replace(/^@/, '');
    await page.goto(`/dashboard/u/${handle}`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await expect(page).toHaveURL(new RegExp(`/dashboard/u/${handle}`));
    const splash = page.getByText('Pulling up the menu...');
    if (await splash.isVisible().catch(() => false)) {
      await splash.waitFor({ state: 'hidden', timeout: 90_000 }).catch(() => {});
    }
    await expectSignedInDashboardShell(page, { timeout: 90_000 });

    const profileRoot = page.getByTestId('e2e-user-public-profile');
    const notFound = page.getByRole('heading', { name: APP_NOT_FOUND_HEADING, level: 3 });
    await expect(profileRoot.or(notFound)).toBeVisible({ timeout: 90_000 });

    if (await notFound.isVisible()) {
      test.skip(
        true,
        `E2E_PUBLIC_PROFILE_USERNAME "${handle}" has no profile in this database — seed data or update the env handle.`
      );
    }

    await expect(profileRoot).toBeVisible();
    await expect(page.locator('[data-testid="e2e-dashboard-user-public-profile-loading"]')).toHaveCount(0);
  });
});
