import { expect, test } from '@playwright/test';

import { expectAppShellMainVisible } from '../support/page-assertions';

/**
 * Public SEO profile ` /u/:handle` — no auth. Set E2E_PUBLIC_PROFILE_USERNAME (handle without @).
 */
test.describe('public user profile URL', () => {
  test.beforeEach(({}, testInfo) => {
    if (!process.env.E2E_PUBLIC_PROFILE_USERNAME?.trim()) {
      testInfo.skip(true, 'Set E2E_PUBLIC_PROFILE_USERNAME to a real username');
    }
  });

  test('loads /u/:username', async ({ page }) => {
    const handle = process.env.E2E_PUBLIC_PROFILE_USERNAME!.trim().replace(/^@/, '');
    await page.goto(`/u/${handle}`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(new RegExp(`/u/${handle}`));
    await expectAppShellMainVisible(page);

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
    await expect(page.locator('[data-testid="e2e-public-user-public-profile-loading"]')).toHaveCount(0);
  });
});
