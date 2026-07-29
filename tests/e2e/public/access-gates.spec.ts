import { expect, test } from '@playwright/test';

/**
 * Anonymous access gates (TEST-PLAN O1 anonymous side, dashboard auth gate).
 * `/onboarding` server-redirects to login with returnTo; `/dashboard/**` renders the
 * Google auth gate shell instead of dashboard content.
 */
test.describe('access gates — anonymous user', () => {
  test('/onboarding redirects to login with returnTo', async ({ page }) => {
    test.setTimeout(180_000);
    // The layout's redirect() streams as a client-side redirect (response is already 200 by
    // then), so the navigation needs hydrated JS — retry once for dev-server cold compiles.
    await page.goto('/onboarding', { waitUntil: 'load', timeout: 120_000 });
    try {
      await expect(page).toHaveURL(/\/auth\/login\?.*returnTo=%2Fonboarding/, { timeout: 45_000 });
    } catch {
      await page.goto('/onboarding', { waitUntil: 'load', timeout: 120_000 });
      await expect(page).toHaveURL(/\/auth\/login\?.*returnTo=%2Fonboarding/, { timeout: 45_000 });
    }
  });

  for (const path of ['/dashboard/discover', '/dashboard/settings/billing', '/dashboard/lists']) {
    test(`${path} shows the auth gate, not dashboard content`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.goto(path, { waitUntil: 'load', timeout: 120_000 });
      // Either a redirect to /auth/* or the in-place "Continue with Google" gate is acceptable;
      // what must NOT happen is signed-in dashboard content rendering.
      const gate = page
        .getByRole('button', { name: /Continue with Google/i })
        .or(page.locator('input[name="password"]'));
      await expect(gate.first()).toBeVisible({ timeout: 45_000 });
    });
  }
});
