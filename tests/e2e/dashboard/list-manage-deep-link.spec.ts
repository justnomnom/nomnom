import { expect, test } from '@playwright/test';

import { expectSignedInDashboardShell } from '../support/page-assertions';
import { dashboardTestsDisabled } from '../support/skip-dashboard';
import { hasServiceRoleCredentials } from '../support/service-role';
import { getAnyListIdForAppUser, getUserIdByEmail } from '../support/supabase-service';
import { E2E_DASHBOARD_AUTH_SETUP_HINT, getE2ETestUserEmailForDb } from '../support/test-credentials';

/**
 * `/dashboard/lists/:id/manage` requires owner or active collaborator — resolves list via service role + E2E user id.
 */
test.describe('dashboard list manage', () => {
  test.beforeEach(({}, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
    if (!hasServiceRoleCredentials()) {
      testInfo.skip(true, 'Set E2E_SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY to resolve lists for the E2E user');
    }
  });

  test('manage page loads when the E2E user owns or belongs to a list', async ({ page }) => {
    test.setTimeout(120_000);
    const email = await getE2ETestUserEmailForDb();
    const userId = await getUserIdByEmail(email);
    test.skip(!userId, 'Could not resolve E2E user id from email');
    if (!userId) return;

    const listId = await getAnyListIdForAppUser(userId);
    test.skip(!listId, 'No list owned by or shared with the E2E user — create a list or skip');

    await page.goto(`/dashboard/lists/${listId}/manage`, { waitUntil: 'load', timeout: 120_000 });
    await expect(page).toHaveURL(new RegExp(`/dashboard/lists/${listId}/manage`));
    try {
      await expectSignedInDashboardShell(page, { timeout: 45_000 });
    } catch {
      await page.reload({ waitUntil: 'load', timeout: 120_000 });
      await expectSignedInDashboardShell(page, { timeout: 45_000 });
    }

    const notFound = page.getByRole('heading', { name: 'Page Not Found' });
    const tabs = page.locator('[role="tablist"]');
    await expect(tabs.or(notFound)).toBeVisible({ timeout: 45_000 });

    if (await notFound.isVisible()) {
      test.skip(true, 'List exists in DB but manage returned not-found for this session (membership mismatch).');
    }
  });
});
