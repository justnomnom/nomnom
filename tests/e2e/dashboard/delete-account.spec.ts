import { expect, test } from '@playwright/test';

import { loadE2EEnv } from '../load-env';
import { getDefaultTranslation as tr } from '../../../src/locales/default-translations';
import { createSeededUser, deleteSeededUser } from '../support/seed';
import { dashboardTestsDisabled } from '../support/skip-dashboard';
import { getServiceRoleClient } from '../support/supabase-service';
import { E2E_DASHBOARD_AUTH_SETUP_HINT } from '../support/test-credentials';
import { buildUserStorageState } from '../support/user-session';

/**
 * Delete-account flow (S5, docs/TEST-PLAN.md §10). Destructive, so it runs entirely as a
 * throwaway seeded user signed into their OWN browser context — never the shared dashboard
 * user (whose deletion would break every other dashboard spec).
 *
 * Covers: the confirmation gate (confirm button stays disabled until the exact phrase is
 * typed) and the real removal (auth user + public.users row gone, redirected off the app).
 */
test.describe.configure({ mode: 'serial' });

const CONFIRM_PHRASE = tr('pages.dashboard.settings.delete_account.dialog.input_placeholder'); // "delete account"

test.describe('dashboard settings — delete account', () => {
  test.beforeEach(({}, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
  });

  test('confirmation gate then full account removal + sign-out', async ({ browser }) => {
    test.setTimeout(180_000);
    loadE2EEnv();
    const admin = getServiceRoleClient();

    // Throwaway user with its own session — deleting the shared user is never allowed.
    const victim = await createSeededUser('e2edelete');
    let deleted = false;

    // The dashboard layout bounces onboarding-incomplete users to /onboarding, so mark this
    // throwaway account complete to reach settings.
    await admin
      .from('users')
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq('id', victim.id);

    // Signup seeds default lists ("Must-Go" / "Visited"). Deleting a list-owning account must
    // succeed, and the lists must go with it.
    //
    // This used to assert the opposite — that the lists survived as orphans with user_id IS
    // NULL, "the whole point of the ON DELETE SET NULL design". That stopped being true:
    // migration 20260724123000 deliberately replaced that FK with ON DELETE CASCADE and made
    // user_id NOT NULL ("a list without an owner has no meaning"), which is also what
    // deleteOwnedListsForAccountDeletion (commit c6c4bdb) wants — "a user deleting their
    // account expects their lists to go with it". Capture the ids up front so we can assert
    // they are gone afterwards.
    const { data: ownedLists } = await admin.from('lists').select('id').eq('user_id', victim.id);
    const ownedListIds = (ownedLists ?? []).map((l) => l.id);
    expect(ownedListIds.length, 'signup should seed default lists').toBeGreaterThan(0);

    const storageState = await buildUserStorageState(victim.email, victim.password);
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();

    try {
      await page.goto('/dashboard/settings/delete-account', {
        waitUntil: 'domcontentloaded',
        timeout: 120_000,
      });
      // The dashboard shell is client-rendered; on a cold webpack-dev route compile hydration
      // can lag well past the default expect timeout, so wait for the network to settle first.
      await page.waitForLoadState('networkidle').catch(() => {});

      // The trigger row is disabled while the subscriber-count check is in flight; a fresh
      // user has no subscribers, so it resolves to enabled.
      const trigger = page.getByRole('button', {
        name: tr('pages.dashboard.settings.delete_account.button'),
      });
      await expect(trigger).toBeEnabled({ timeout: 60_000 });
      await trigger.click({ timeout: 15_000 });

      // Dialog open. Confirmation gate: confirm button is disabled until the phrase matches.
      const dialog = page.getByRole('dialog');
      const confirmBtn = page.getByTestId('e2e-delete-confirm');
      await expect(confirmBtn).toBeVisible({ timeout: 15_000 });
      await expect(confirmBtn).toBeDisabled();

      const confirmInput = dialog.getByRole('textbox');
      await confirmInput.fill('nope', { timeout: 15_000 });
      await expect(confirmBtn).toBeDisabled();

      await confirmInput.fill(CONFIRM_PHRASE, { timeout: 15_000 });
      await expect(confirmBtn).toBeEnabled();

      // Confirm → deleteAccount() removes the rows, logs out, and router.replace('/').
      await confirmBtn.click({ timeout: 15_000 });

      // Actual removal (the core requirement): the public.users row is gone. If deletion failed
      // server-side the view shows an inline error and never redirects, so this poll (not the
      // sign-out check) is what fails, with a clear message.
      await expect
        .poll(
          async () => {
            const { data } = await admin
              .from('users')
              .select('id')
              .eq('id', victim.id)
              .maybeSingle();
            return data ? 'present' : 'gone';
          },
          { timeout: 45_000, message: 'public.users row was not deleted' }
        )
        .toBe('gone');

      // The auth user is gone too.
      await expect
        .poll(
          async () => {
            const { data, error } = await admin.auth.admin.getUserById(victim.id);
            return !error && data?.user ? 'present' : 'gone';
          },
          { timeout: 30_000, message: 'auth user was not deleted' }
        )
        .toBe('gone');

      deleted = true;

      // The owner's lists go with the account: lists.user_id is ON DELETE CASCADE and NOT NULL,
      // so there is no orphan state left to land in. Polled rather than read once — the cascade
      // lands with the users row, but the admin read can observe the gap.
      await expect
        .poll(
          async () => {
            const { data } = await admin.from('lists').select('id').in('id', ownedListIds);
            return data?.length ?? 0;
          },
          { timeout: 30_000, message: 'seeded lists should be deleted with the account' }
        )
        .toBe(0);

      // Sign-out: the app leaves the delete page (redirect to home / login) once the session is torn down.
      await expect(page).not.toHaveURL(/\/dashboard\/settings\/delete-account/, { timeout: 30_000 });
    } finally {
      await context.close();
      // Only needed if deletion did not complete (e.g. an early assertion failure).
      if (!deleted) await deleteSeededUser(victim.id);
      // Only needed when deletion did not complete: on the happy path the CASCADE from users
      // already removed these lists (and their list_items, also CASCADE), so there is no
      // residue to clear. Kept for the early-assertion-failure path.
      if (!deleted && ownedListIds.length) {
        for (const listId of ownedListIds) {
          await admin.from('list_items').delete().eq('list_id', listId);
        }
        await admin.from('lists').delete().in('id', ownedListIds);
      }
    }
  });
});
