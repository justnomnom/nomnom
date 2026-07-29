import { expect, test } from '@playwright/test';
import { type SupabaseClient } from '@supabase/supabase-js';

import { loadE2EEnv } from '../load-env';
import { expectSignedInDashboardShell } from '../support/page-assertions';
import { dashboardTestsDisabled } from '../support/skip-dashboard';
import { getServiceRoleClient, getUserIdByEmail } from '../support/supabase-service';
import {
  type SeededUser,
  deleteList,
  createOwnedList,
  createSeededUser,
  deleteSeededUser,
  buildUserStorageState,
  completeOnboardingWithoutHome,
} from '../support/seed';
import {
  E2E_DASHBOARD_AUTH_SETUP_HINT,
  getE2ETestUserEmailForDb,
} from '../support/test-credentials';

/**
 * Collaboration invitee side (companion to list-collaboration-invite.spec.ts, which covers the
 * owner sending the invite). The owner seeds a `pending_invite` list_members row — the same row
 * `invite_to_list` writes — then we sign in AS the seeded second user in their own browser context
 * (mirrors global-setup: SSR session cookies, httpOnly:false so the browser Supabase client can
 * hydrate) and drive the real Accept / Decline UI on the list page:
 *   - Accept  → list_members.status flips to `active` and the list surfaces under the "Shared" filter.
 *   - Decline → the pending row is deleted (decline_list_invite) and the list drops off "Shared".
 * Teardown removes the list, any list_members rows, and the seeded user.
 */
test.describe.configure({ mode: 'serial' });

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

test.describe('dashboard lists — collaboration accept/decline', () => {
  test.beforeEach(({}, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
  });

  /**
   * Seed an onboarded invitee, an owner-owned public list, and a `pending_invite` list_members row
   * (identical shape to what `invite_to_list` writes). Returns the handles the test needs.
   */
  async function seedInviteFixture(name: string): Promise<{
    admin: SupabaseClient;
    invitee: SeededUser;
    listId: string;
  }> {
    loadE2EEnv();
    const ownerId = await getUserIdByEmail(await getE2ETestUserEmailForDb());
    if (!ownerId) throw new Error('no owner id');
    const admin = getServiceRoleClient();

    const invitee = await createSeededUser();
    // The dashboard layout bounces users without onboarding_completed_at to /onboarding.
    await completeOnboardingWithoutHome(invitee.id);
    const listId = await createOwnedList(ownerId, { name: `${name} ${Date.now()}` });

    const { error } = await admin.from('list_members').insert({
      list_id: listId,
      user_id: invitee.id,
      role: 'viewer',
      status: 'pending_invite',
      invited_by: ownerId,
    });
    if (error) throw new Error(`seed pending invite failed: ${error.message}`);

    return { admin, invitee, listId };
  }

  test('invitee accepts the invite → status active + list under "Shared" filter', async ({
    browser,
  }) => {
    test.setTimeout(240_000);
    const { admin, invitee, listId } = await seedInviteFixture('E2E Collab Accept');
    const storageState = await buildUserStorageState(invitee.email, invitee.password);
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();

    try {
      // The invitee opens the list page — a pending invite renders an Accept / Decline banner.
      await page.goto(`/dashboard/lists/${listId}`, {
        waitUntil: 'domcontentloaded',
        timeout: 180_000,
      });
      await expectSignedInDashboardShell(page, { timeout: 45_000 });

      const acceptBtn = page.getByRole('button', { name: 'Accept', exact: true });
      await expect(acceptBtn).toBeVisible({ timeout: 45_000 });
      await acceptBtn.click();

      // accept_list_invite flips the row to active.
      await expect
        .poll(() => readMemberStatus(admin, listId, invitee.id), {
          timeout: 30_000,
          message: 'invitee list_members status did not flip to active',
        })
        .toBe('active');

      // The accepted list now appears under the lists-hub "Shared" filter (sharedWithMe bucket).
      await page.goto('/dashboard/lists', { waitUntil: 'domcontentloaded', timeout: 180_000 });
      await expectSignedInDashboardShell(page, { timeout: 45_000 });
      const sharedChip = page.getByRole('button', { name: 'Shared', exact: true });
      await expect(sharedChip).toBeVisible({ timeout: 45_000 });
      await sharedChip.click();
      await expect(
        page.locator(`a[href$="/dashboard/lists/${listId}"]`).first()
      ).toBeVisible({ timeout: 30_000 });
    } finally {
      await context.close();
      await admin.from('list_members').delete().eq('list_id', listId);
      await deleteList(listId);
      await deleteSeededUser(invitee.id);
    }
  });

  test('invitee declines the invite → row removed + list absent from "Shared" filter', async ({
    browser,
  }) => {
    test.setTimeout(240_000);
    const { admin, invitee, listId } = await seedInviteFixture('E2E Collab Decline');
    const storageState = await buildUserStorageState(invitee.email, invitee.password);
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();

    try {
      await page.goto(`/dashboard/lists/${listId}`, {
        waitUntil: 'domcontentloaded',
        timeout: 180_000,
      });
      await expectSignedInDashboardShell(page, { timeout: 45_000 });

      const declineBtn = page.getByRole('button', { name: 'Decline', exact: true });
      await expect(declineBtn).toBeVisible({ timeout: 45_000 });
      await declineBtn.click();

      // decline_list_invite deletes the pending row outright.
      await expect
        .poll(() => readMemberStatus(admin, listId, invitee.id), {
          timeout: 30_000,
          message: 'declined invite row was not removed',
        })
        .toBe('none');

      // With the invite declined, the list must not show under the "Shared" filter.
      await page.goto('/dashboard/lists', { waitUntil: 'domcontentloaded', timeout: 180_000 });
      await expectSignedInDashboardShell(page, { timeout: 45_000 });
      await page.waitForLoadState('networkidle').catch(() => {});
      const sharedChip = page.getByRole('button', { name: 'Shared', exact: true });
      await expect(sharedChip).toBeVisible({ timeout: 45_000 });
      await sharedChip.click();
      await expect(page.locator(`a[href$="/dashboard/lists/${listId}"]`)).toHaveCount(0, {
        timeout: 30_000,
      });
    } finally {
      await context.close();
      await admin.from('list_members').delete().eq('list_id', listId);
      await deleteList(listId);
      await deleteSeededUser(invitee.id);
    }
  });
});
