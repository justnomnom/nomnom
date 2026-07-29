import { expect, test } from '@playwright/test';

import { loadE2EEnv } from '../load-env';
import { dashboardTestsDisabled } from '../support/skip-dashboard';
import { getServiceRoleClient, getUserIdByEmail } from '../support/supabase-service';
import { deleteList, createOwnedList, createSeededUser, deleteSeededUser } from '../support/seed';
import {
  E2E_DASHBOARD_AUTH_SETUP_HINT,
  getE2ETestUserEmailForDb,
} from '../support/test-credentials';

/**
 * Collaboration invite: seed a second user, then as the list owner invite them by handle on
 * the People tab and verify a list_members row is created for the invitee. Teardown removes
 * both the list and the seeded user.
 */
test.describe.configure({ mode: 'serial' });

test.describe('dashboard lists — collaboration invite', () => {
  test.beforeEach(({}, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
  });

  test('owner invites a seeded user → list_members row exists', async ({ page }) => {
    test.setTimeout(240_000);
    loadE2EEnv();
    const ownerId = await getUserIdByEmail(await getE2ETestUserEmailForDb());
    if (!ownerId) throw new Error('no owner id');
    const admin = getServiceRoleClient();

    const invitee = await createSeededUser();
    const listId = await createOwnedList(ownerId, { name: `E2E Collab ${Date.now()}` });

    try {
      await page.goto(`/dashboard/lists/${listId}/manage`, {
        waitUntil: 'domcontentloaded',
        timeout: 180_000,
      });
      await expect(page.getByRole('tab', { name: 'People' })).toBeVisible({ timeout: 45_000 });
      await page.getByRole('tab', { name: 'People' }).click();

      await page.getByLabel('Username to invite').fill(invitee.username);
      await page.getByRole('button', { name: 'Invite', exact: true }).click();

      await expect
        .poll(
          async () => {
            const { data } = await admin
              .from('list_members')
              .select('user_id')
              .eq('list_id', listId)
              .eq('user_id', invitee.id)
              .maybeSingle();
            return data ? 'member' : 'none';
          },
          { timeout: 30_000, message: 'invitee list_members row not created' }
        )
        .toBe('member');
    } finally {
      await admin.from('list_members').delete().eq('list_id', listId);
      await deleteList(listId);
      await deleteSeededUser(invitee.id);
    }
  });
});
