import { expect, test } from '@playwright/test';

import { loadE2EEnv } from '../load-env';
import { dashboardTestsDisabled } from '../support/skip-dashboard';
import { hasServiceRoleCredentials } from '../support/service-role';
import {
  createSeededUser,
  deleteSeededUser,
  buildUserStorageState,
  completeOnboardingWithoutHome,
} from '../support/seed';
import { E2E_DASHBOARD_AUTH_SETUP_HINT } from '../support/test-credentials';
import { APP_NOT_FOUND_HEADING } from '../support/page-assertions';

/**
 * TEST-PLAN §11 AD1 — a NON-admin authenticated user must never see admin content.
 * navigation-extended.spec.ts asserts whichever branch the shared user resolves to (that
 * user is admin-allowlisted locally), so this spec seeds a fresh user who is guaranteed to
 * be absent from ADMIN_USER_IDS and asserts the not-found branch explicitly.
 */

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3032';

test.describe('admin routes — non-admin user is blocked (AD1)', () => {
  test.beforeEach(({}, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
    if (!hasServiceRoleCredentials()) {
      testInfo.skip(true, 'Service role needed to seed a non-admin user');
    }
  });

  test('non-admin sees the global not-found on both admin routes', async ({ browser }) => {
    test.setTimeout(240_000);
    loadE2EEnv();

    const user = await createSeededUser('e2enonadmin');
    // Onboarding-complete so the dashboard layout doesn't bounce to /onboarding first.
    await completeOnboardingWithoutHome(user.id);
    const context = await browser.newContext({
      baseURL,
      storageState: await buildUserStorageState(user.email, user.password),
    });
    const page = await context.newPage();

    try {
      for (const path of ['/dashboard/admin', '/dashboard/admin/sponsored-placements']) {
        await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 180_000 });
        const notFound = page.getByRole('heading', { name: APP_NOT_FOUND_HEADING });
        try {
          await expect(notFound).toBeVisible({ timeout: 45_000 });
        } catch {
          // Cold dev-server compile can outlast hydration on the first paint — one retry.
          await page.reload({ waitUntil: 'domcontentloaded', timeout: 180_000 });
          await expect(notFound).toBeVisible({ timeout: 45_000 });
        }
        // Never the admin surfaces themselves.
        await expect(page.getByRole('heading', { name: 'Admin', exact: true })).toHaveCount(0);
        await expect(
          page.getByRole('heading', { name: 'Discover sponsored restaurants' })
        ).toHaveCount(0);
      }
    } finally {
      await context.close();
      await deleteSeededUser(user.id);
    }
  });
});
