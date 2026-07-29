import { expect, test } from '@playwright/test';

import { loadE2EEnv } from '../load-env';
import { dashboardTestsDisabled } from '../support/skip-dashboard';
import { getServiceRoleClient, getUserIdByEmail } from '../support/supabase-service';
import {
  E2E_DASHBOARD_AUTH_SETUP_HINT,
  getE2ETestUserEmailForDb,
} from '../support/test-credentials';

test.describe('dashboard profile — bio update with DB check', () => {
  test.beforeEach(({ }, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
  });

  test('updates bio and verifies users.bio in Postgres', async ({ page }) => {
    loadE2EEnv();
    const email = await getE2ETestUserEmailForDb();

    const userId = await getUserIdByEmail(email);
    if (!userId) {
      throw new Error(`No public.users row for ${email}`);
    }

    const admin = getServiceRoleClient();
    const { data: before } = await admin.from('users').select('bio').eq('id', userId).maybeSingle();
    const previousBio = before?.bio ?? null;

    const marker = `E2E bio ${Date.now()}`;

    await page.goto('/dashboard/settings/profile/edit');
    await expect(page.getByTestId('e2e-profile-bio')).toBeVisible({ timeout: 30_000 });
    await page.getByTestId('e2e-profile-bio').fill(marker);
    await page.getByTestId('e2e-profile-save').click();

    await expect
      .poll(
        async () => {
          const { data } = await admin.from('users').select('bio').eq('id', userId).maybeSingle();
          return data?.bio ?? null;
        },
        { timeout: 20_000 }
      )
      .toBe(marker);

    await admin.from('users').update({ bio: previousBio, updated_at: new Date().toISOString() }).eq('id', userId);
  });
});
