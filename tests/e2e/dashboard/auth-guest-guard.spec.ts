import { expect, test } from '@playwright/test';

import { dashboardTestsDisabled } from '../support/skip-dashboard';
import { E2E_DASHBOARD_AUTH_SETUP_HINT } from '../support/test-credentials';

/**
 * TEST-PLAN §1 A9 — an already-authenticated user visiting the guest-only auth pages is
 * redirected away (GuestGuard router.replace()s to ?returnTo= or /dashboard/discover).
 * Runs in the dashboard project so the shared storage state provides the session.
 */
test.describe('auth pages — authenticated user is redirected away (A9)', () => {
  test.beforeEach(({}, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
  });

  for (const path of ['/auth/login', '/auth/register'] as const) {
    test(`${path} bounces to the dashboard`, async ({ page, request }) => {
      test.setTimeout(240_000);
      // Dev-only: warm the redirect destination so the client replace() isn't stalled by a
      // cold route compile (see docs/TEST-PLAN.md “Dev-only navigation caveat”).
      await request.get('/dashboard/discover', { timeout: 180_000 }).catch(() => {});

      await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 180_000 });
      // GuestGuard replaces after hydration — a soft navigation; poll the URL.
      await expect(page).toHaveURL(/\/dashboard\/discover/, { timeout: 120_000 });
      // And the guest form is really gone.
      await expect(page.getByLabel('Email address')).toHaveCount(0);
    });
  }
});
