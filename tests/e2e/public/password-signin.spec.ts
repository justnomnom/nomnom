import { expect, test } from '@playwright/test';

import { expectSignedInDashboardShell } from '../support/page-assertions';
import { getE2EGlobalSetupAuth, getE2ETestUserEmailForDb } from '../support/test-credentials';

/**
 * Exercises the password form on `/auth/login` with a fresh context (no storage state).
 * TEST-PLAN A4: valid credentials land on the dashboard.
 * Uses the resolved account email so `E2E_TEST_USER_USERNAME`-only env still works.
 */
test.describe('password sign-in flow', () => {
  test.beforeEach(async ({}, testInfo) => {
    const auth = await getE2EGlobalSetupAuth();
    if (!auth.ok) {
      testInfo.skip(true, auth.missing.join('; '));
    }
  });

  test('submits email + password and reaches the signed-in dashboard shell', async ({ page }) => {
    test.setTimeout(120_000);

    const email = await getE2ETestUserEmailForDb();
    const password = process.env.E2E_TEST_USER_PASSWORD!.trim();

    // Warm the post-login destination: router.replace only commits the URL once the
    // RSC response arrives, and a cold dev-server compile of /dashboard/discover takes
    // 90s+ — longer than the toHaveURL budget. One anonymous GET compiles the route.
    await page.request.get('/dashboard/discover', { timeout: 180_000 }).catch(() => {});

    await page.goto('/auth/login', { waitUntil: 'domcontentloaded', timeout: 120_000 });

    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.locator('form button[type="submit"]').click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 60_000 });
    try {
      await expectSignedInDashboardShell(page, { timeout: 45_000 });
    } catch {
      await page.reload({ waitUntil: 'load', timeout: 120_000 });
      await expectSignedInDashboardShell(page, { timeout: 45_000 });
    }
  });
});
