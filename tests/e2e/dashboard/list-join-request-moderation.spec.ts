import { expect, test } from '@playwright/test';
import { type SupabaseClient } from '@supabase/supabase-js';

import { loadE2EEnv } from '../load-env';
import { expectSignedInDashboardShell } from '../support/page-assertions';
import { dashboardTestsDisabled } from '../support/skip-dashboard';
import { getServiceRoleClient, getUserIdByEmail } from '../support/supabase-service';
import {
  createOwnedList,
  createSeededUser,
  deleteList,
  deleteSeededUser,
} from '../support/seed';
import {
  E2E_DASHBOARD_AUTH_SETUP_HINT,
  getE2ETestUserEmailForDb,
} from '../support/test-credentials';

/**
 * Owner-side join-request moderation on the list manage People tab.
 * Self-serve join is disabled in product, but legacy `pending_request` rows and the
 * approve/reject RPCs remain — we seed the row directly (same pattern as pending_invite).
 */

/** Current list_members.status for (list, user), or 'none' when no row exists. */
async function readMemberStatus(
  admin: SupabaseClient,
  listId: string,
  userId: string
): Promise<string> {
  const { data } = await admin
    .from('list_members')
    .select('status')
    .eq('list_id', listId)
    .eq('user_id', userId)
    .maybeSingle();
  return data?.status ?? 'none';
}

test.describe('dashboard lists — join request moderation', () => {
  test.beforeEach(({}, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
  });

  async function seedJoinRequestFixture(name: string): Promise<{
    admin: SupabaseClient;
    requester: Awaited<ReturnType<typeof createSeededUser>>;
    listId: string;
  }> {
    loadE2EEnv();
    const ownerId = await getUserIdByEmail(await getE2ETestUserEmailForDb());
    if (!ownerId) throw new Error('no owner id');
    const admin = getServiceRoleClient();

    const requester = await createSeededUser('e2ejoin');
    const listId = await createOwnedList(ownerId, { name: `${name} ${Date.now()}` });

    const { error } = await admin.from('list_members').insert({
      list_id: listId,
      user_id: requester.id,
      role: 'viewer',
      status: 'pending_request',
    });
    if (error) throw new Error(`seed pending_request failed: ${error.message}`);

    return { admin, requester, listId };
  }

  test('owner approves a pending join request → member active', async ({ page }) => {
    test.setTimeout(240_000);
    const { admin, requester, listId } = await seedJoinRequestFixture('Join approve list');

    try {
      await page.goto(`/dashboard/lists/${listId}/manage`, {
        waitUntil: 'domcontentloaded',
        timeout: 180_000,
      });
      await expectSignedInDashboardShell(page, { timeout: 45_000 });
      await page.getByRole('tab', { name: 'People' }).click();

      await expect(page.getByText(`@${requester.username}`)).toBeVisible({ timeout: 45_000 });
      await expect(page.getByText('Request pending')).toBeVisible({ timeout: 15_000 });

      await page.getByRole('button', { name: 'Approve', exact: true }).click();

      await expect
        .poll(() => readMemberStatus(admin, listId, requester.id), {
          timeout: 30_000,
          message: 'join request did not flip to active',
        })
        .toBe('active');
    } finally {
      await admin.from('list_members').delete().eq('list_id', listId);
      await deleteList(listId);
      await deleteSeededUser(requester.id);
    }
  });

  test('owner rejects a pending join request → row removed', async ({ page }) => {
    test.setTimeout(240_000);
    const { admin, requester, listId } = await seedJoinRequestFixture('Join reject list');

    try {
      await page.goto(`/dashboard/lists/${listId}/manage`, {
        waitUntil: 'domcontentloaded',
        timeout: 180_000,
      });
      await expectSignedInDashboardShell(page, { timeout: 45_000 });
      await page.getByRole('tab', { name: 'People' }).click();

      await expect(page.getByText(`@${requester.username}`)).toBeVisible({ timeout: 45_000 });

      await page.getByRole('button', { name: 'Reject', exact: true }).click();

      await expect
        .poll(() => readMemberStatus(admin, listId, requester.id), {
          timeout: 30_000,
          message: 'rejected join request row was not removed',
        })
        .toBe('none');
    } finally {
      await admin.from('list_members').delete().eq('list_id', listId);
      await deleteList(listId);
      await deleteSeededUser(requester.id);
    }
  });
});
