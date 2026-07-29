import path from 'node:path';

import { expect, test } from '@playwright/test';

import { loadE2EEnv } from '../load-env';
import { getDefaultTranslation as tr } from '../../../src/locales/default-translations';
import { createSeededUser, deleteSeededUser } from '../support/seed';
import { dashboardTestsDisabled } from '../support/skip-dashboard';
import { getServiceRoleClient, getUserIdByEmail } from '../support/supabase-service';
import {
  E2E_DASHBOARD_AUTH_SETUP_HINT,
  getE2ETestUserEmailForDb,
} from '../support/test-credentials';

/**
 * Profile edit variations (S5/S6 area, docs/TEST-PLAN.md §10) — complements the existing bio
 * test (profile-mutations.spec.ts). Runs as the shared dashboard user and restores every
 * mutation. Covers: display name persist, username client sanitization, username uniqueness
 * conflict, and avatar upload → persist → remove.
 */
test.describe.configure({ mode: 'serial' });

const AVATAR = path.join(__dirname, '..', 'support', 'fixtures', 'cover.png');
const EDIT_URL = '/dashboard/settings/profile/edit';

const namePlaceholder = tr('pages.dashboard.settings.edit.name_placeholder'); // "Your name"
const usernamePlaceholder = tr('pages.dashboard.settings.edit.username_placeholder'); // "your_handle"

test.describe('dashboard profile — edit variations', () => {
  test.beforeEach(({}, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
  });

  test('updates display name and verifies users.display_name in Postgres', async ({ page }) => {
    test.setTimeout(120_000);
    loadE2EEnv();
    const admin = getServiceRoleClient();
    const userId = await getUserIdByEmail(await getE2ETestUserEmailForDb());
    if (!userId) throw new Error('no user id');

    const { data: before } = await admin
      .from('users')
      .select('display_name')
      .eq('id', userId)
      .maybeSingle();
    const previous = before?.display_name ?? null;
    const marker = `E2E Name ${Date.now()}`;

    try {
      await page.goto(EDIT_URL, { waitUntil: 'domcontentloaded', timeout: 120_000 });
      const nameField = page.getByPlaceholder(namePlaceholder);
      await expect(nameField).toBeVisible({ timeout: 45_000 });
      await nameField.fill(marker);
      await page.getByTestId('e2e-profile-save').click();

      await expect
        .poll(
          async () => {
            const { data } = await admin
              .from('users')
              .select('display_name')
              .eq('id', userId)
              .maybeSingle();
            return data?.display_name ?? null;
          },
          { timeout: 20_000, message: 'display_name did not persist' }
        )
        .toBe(marker);
    } finally {
      await admin
        .from('users')
        .update({ display_name: previous, updated_at: new Date().toISOString() })
        .eq('id', userId);
    }
  });

  test('username field sanitizes to lowercase handle-safe characters', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto(EDIT_URL, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    const usernameField = page.getByPlaceholder(usernamePlaceholder);
    await expect(usernameField).toBeVisible({ timeout: 45_000 });

    // Onchange strips anything outside [a-z0-9_] and lowercases — no save needed.
    await usernameField.fill('');
    await usernameField.pressSequentially('Bad Handle!!42');
    await expect(usernameField).toHaveValue('badhandle42');
  });

  test('username uniqueness conflict shows the taken error and does not change the row', async ({
    page,
  }) => {
    test.setTimeout(150_000);
    loadE2EEnv();
    const admin = getServiceRoleClient();
    const userId = await getUserIdByEmail(await getE2ETestUserEmailForDb());
    if (!userId) throw new Error('no user id');

    // A second real account whose handle is guaranteed to collide.
    const other = await createSeededUser('e2ehandle');

    const { data: before } = await admin
      .from('users')
      .select('username')
      .eq('id', userId)
      .maybeSingle();
    const previousUsername = before?.username ?? null;

    try {
      await page.goto(EDIT_URL, { waitUntil: 'domcontentloaded', timeout: 120_000 });
      const usernameField = page.getByPlaceholder(usernamePlaceholder);
      await expect(usernameField).toBeVisible({ timeout: 45_000 });

      await usernameField.fill('');
      await usernameField.pressSequentially(other.username);
      await page.getByTestId('e2e-profile-save').click();

      await expect(
        page.getByText(tr('pages.dashboard.settings.edit.username_taken'))
      ).toBeVisible({ timeout: 30_000 });

      // The conflicting update is rejected atomically — the shared user's handle is unchanged.
      const { data: after } = await admin
        .from('users')
        .select('username')
        .eq('id', userId)
        .maybeSingle();
      expect(after?.username ?? null).toBe(previousUsername);
    } finally {
      await deleteSeededUser(other.id);
    }
  });

  test('uploads an avatar, persists it, then removes it', async ({ page }) => {
    test.setTimeout(180_000);
    loadE2EEnv();
    const admin = getServiceRoleClient();
    const userId = await getUserIdByEmail(await getE2ETestUserEmailForDb());
    if (!userId) throw new Error('no user id');

    const { data: before } = await admin
      .from('users')
      .select('avatar_url')
      .eq('id', userId)
      .maybeSingle();
    const previousAvatar = before?.avatar_url ?? null;
    let uploadedPath: string | null = null;

    try {
      await page.goto(EDIT_URL, { waitUntil: 'domcontentloaded', timeout: 120_000 });
      await expect(page.getByPlaceholder(namePlaceholder)).toBeVisible({ timeout: 45_000 });

      // Hidden file input drives the avatar upload (→ Supabase `avatars` bucket → public URL).
      await page.locator('input[type="file"]').setInputFiles(AVATAR);

      // Wait for the upload to resolve into a fresh avatar URL before saving (the Save button
      // persists whatever avatar URL is in state). Scope to the form's avatar (sibling after the
      // hidden file input) so the header account-popover avatar can't shadow it.
      const avatarImg = page.locator('input[type="file"] ~ div img[src*="/avatars/"]').first();
      await expect(avatarImg).toBeVisible({ timeout: 45_000 });
      await expect
        .poll(async () => (await avatarImg.getAttribute('src')) !== previousAvatar, {
          timeout: 45_000,
          message: 'avatar preview did not update to the uploaded image',
        })
        .toBe(true);

      const saveBtn = page.getByTestId('e2e-profile-save');
      await saveBtn.click();

      const persisted = await pollAvatar(admin, userId, (v) => Boolean(v) && v !== previousAvatar, {
        timeout: 30_000,
        message: 'avatar_url did not persist',
      });
      expect(persisted).toContain('/avatars/');
      const marker = '/avatars/';
      uploadedPath = persisted.slice(persisted.indexOf(marker) + marker.length) || null;

      // Wait for the save to fully settle: handleSave re-fetches the profile on success, and that
      // refetch would otherwise clobber the local removal below (restoring the uploaded URL).
      await expect(saveBtn).toBeEnabled({ timeout: 30_000 });

      // Remove the avatar (icon button) then Save → avatar_url clears.
      await page.getByRole('button', { name: tr('pages.dashboard.settings.edit.remove_photo') }).click();
      await saveBtn.click();

      await pollAvatar(admin, userId, (v) => !v, {
        timeout: 30_000,
        message: 'avatar_url did not clear',
      });
    } finally {
      await admin
        .from('users')
        .update({ avatar_url: previousAvatar, updated_at: new Date().toISOString() })
        .eq('id', userId);
      if (uploadedPath) {
        await admin.storage.from('avatars').remove([uploadedPath]).catch(() => {});
      }
    }
  });
});

/**
 * Poll `users.avatar_url` until `predicate` holds; returns the last value seen.
 */
async function pollAvatar(
  admin: ReturnType<typeof getServiceRoleClient>,
  userId: string,
  predicate: (value: string | null) => boolean,
  opts: { timeout: number; message: string }
): Promise<string> {
  let last: string | null = null;
  await expect
    .poll(
      async () => {
        const { data } = await admin
          .from('users')
          .select('avatar_url')
          .eq('id', userId)
          .maybeSingle();
        last = (data?.avatar_url as string | null) ?? null;
        return predicate(last);
      },
      { timeout: opts.timeout, message: opts.message }
    )
    .toBe(true);
  return last ?? '';
}
