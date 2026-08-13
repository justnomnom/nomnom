import { expect, test } from '@playwright/test';

import { APP_NOT_FOUND_HEADING, expectAppShellMainVisible } from '../support/page-assertions';

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
    test.setTimeout(180_000);
    const handle = process.env.E2E_PUBLIC_PROFILE_USERNAME!.trim().replace(/^@/, '');
    await page.goto(`/u/${handle}`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await expect(page).toHaveURL(new RegExp(`/u/${handle}`));
    const splash = page.getByText('Pulling up the menu...');
    if (await splash.isVisible().catch(() => false)) {
      await splash.waitFor({ state: 'hidden', timeout: 90_000 }).catch(() => {});
    }
    await expectAppShellMainVisible(page, { timeout: 90_000 });

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
    await expect(page.locator('[data-testid="e2e-public-user-public-profile-loading"]')).toHaveCount(0);
  });
});
