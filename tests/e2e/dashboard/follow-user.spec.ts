import { expect, test } from '@playwright/test';

import { dashboardTestsDisabled } from '../support/skip-dashboard';
import {
  createSeededUser,
  deleteSeededUser,
} from '../support/seed';
import { hasServiceRoleCredentials } from '../support/service-role';
import { getServiceRoleClient, getUserIdByEmail } from '../support/supabase-service';
import {
  E2E_DASHBOARD_AUTH_SETUP_HINT,
  getE2ETestUserEmailForDb,
} from '../support/test-credentials';
import { expectSignedInDashboardShell } from '../support/page-assertions';

/**
 * Follow / unfollow another user from their public profile (inside the dashboard shell).
 */
test.describe('dashboard — follow a creator', () => {
  test.beforeEach(({}, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
    if (!hasServiceRoleCredentials()) {
      testInfo.skip(true, 'Need SUPABASE_SECRET_KEY / E2E service role');
    }
  });

  test('Follow on /dashboard/u/:handle writes user_follows; Following unfollows', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const viewerEmail = await getE2ETestUserEmailForDb();
    const viewerId = await getUserIdByEmail(viewerEmail);
    test.skip(!viewerId, 'Shared e2e user has no public.users row');

    const target = await createSeededUser('e2efollow');
    const admin = getServiceRoleClient();
    try {
      await admin
        .from('user_follows')
        .delete()
        .eq('follower_id', viewerId)
        .eq('following_id', target.id);

      await page.goto(`/dashboard/u/${target.username}`, {
        waitUntil: 'domcontentloaded',
        timeout: 120_000,
      });
      await expect(page).toHaveURL(new RegExp(`/dashboard/u/${target.username}`));
      await expectSignedInDashboardShell(page, { timeout: 90_000 });
      await expect(page.getByTestId('e2e-user-public-profile')).toBeVisible({ timeout: 90_000 });

      const followBtn = page.getByRole('button', { name: /^Follow$/ });
      await expect(followBtn).toBeVisible({ timeout: 30_000 });
      await followBtn.click();
      // First follow compiles the server action; 30s is too tight on a cold webpack.
      await expect(page.getByRole('button', { name: /^Following$/ })).toBeVisible({
        timeout: 60_000,
      });

      const { data: followed } = await admin
        .from('user_follows')
        .select('follower_id')
        .eq('follower_id', viewerId)
        .eq('following_id', target.id)
        .maybeSingle();
      expect(followed?.follower_id).toBe(viewerId);

      await page.getByRole('button', { name: /^Following$/ }).click();
      await expect(page.getByRole('button', { name: /^Follow$/ })).toBeVisible({ timeout: 30_000 });
      const { data: after } = await admin
        .from('user_follows')
        .select('follower_id')
        .eq('follower_id', viewerId)
        .eq('following_id', target.id)
        .maybeSingle();
      expect(after).toBeFalsy();
    } finally {
      await admin
        .from('user_follows')
        .delete()
        .eq('follower_id', viewerId)
        .eq('following_id', target.id);
      await deleteSeededUser(target.id);
    }
  });
});
