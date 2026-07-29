import { expect, test } from '@playwright/test';

import { expectSignedInDashboardShell } from '../support/page-assertions';
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
    const handle = process.env.E2E_PUBLIC_PROFILE_USERNAME!.trim().replace(/^@/, '');
    await page.goto(`/dashboard/u/${handle}`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(new RegExp(`/dashboard/u/${handle}`));
    await expectSignedInDashboardShell(page, { timeout: 25_000 });

    const profileRoot = page.getByTestId('e2e-user-public-profile');
    const notFound = page.getByRole('heading', { name: 'Page Not Found', level: 3 });
    await expect(profileRoot.or(notFound)).toBeVisible({ timeout: 25_000 });

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
