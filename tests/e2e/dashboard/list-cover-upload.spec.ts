import path from 'node:path';

import { expect, test } from '@playwright/test';

import { loadE2EEnv } from '../load-env';
import { deleteList, createOwnedList } from '../support/seed';
import { dashboardTestsDisabled } from '../support/skip-dashboard';
import { getServiceRoleClient, getUserIdByEmail } from '../support/supabase-service';
import {
  E2E_DASHBOARD_AUTH_SETUP_HINT,
  getE2ETestUserEmailForDb,
} from '../support/test-credentials';

/**
 * List cover image: upload a PNG on the Details tab (→ Supabase storage), Save, verify
 * cover_image_url persists, then Remove + Save and verify it clears.
 */
test.describe.configure({ mode: 'serial' });

const COVER = path.join(__dirname, '..', 'support', 'fixtures', 'cover.png');

test.describe('dashboard lists — cover image upload/remove', () => {
  test.beforeEach(({}, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
  });

  test('upload a cover, persist, then remove it', async ({ page }) => {
    test.setTimeout(240_000);
    loadE2EEnv();
    const userId = await getUserIdByEmail(await getE2ETestUserEmailForDb());
    if (!userId) throw new Error('no user id');
    const admin = getServiceRoleClient();
    const listId = await createOwnedList(userId, { name: `E2E Cover ${Date.now()}` });

    try {
      await page.goto(`/dashboard/lists/${listId}/manage`, {
        waitUntil: 'domcontentloaded',
        timeout: 180_000,
      });
      // Details is the default tab; the hidden file input drives the cover upload.
      const nameField = page.getByLabel('List name');
      await expect(nameField).toBeVisible({ timeout: 45_000 });

      await page.locator('input[type="file"]').setInputFiles(COVER);
      // The upload is async: the client pushes the file to Supabase storage, then sets
      // coverUrl state. Only once that resolves does the preview render and the cover
      // "Remove" control appear (and the uploading spinner clear). Wait for that signal
      // before saving — clicking Save too early persists an empty cover_image_url.
      await expect(page.getByRole('button', { name: 'Remove', exact: true })).toBeVisible({
        timeout: 60_000,
      });
      // Upload → getPublicUrl → coverUrl state → Save persists it.
      const saveDetails = page.getByRole('button', { name: 'Save', exact: true });
      await saveDetails.click();
      await expect(saveDetails).toBeEnabled({ timeout: 30_000 });

      await expect
        .poll(
          async () => {
            const { data } = await admin
              .from('lists')
              .select('cover_image_url')
              .eq('id', listId)
              .maybeSingle();
            return data?.cover_image_url ? 'set' : 'null';
          },
          { timeout: 30_000, message: 'cover_image_url did not persist' }
        )
        .toBe('set');

      // Remove the cover (icon button, aria-label "Remove") then Save.
      await page.getByRole('button', { name: 'Remove', exact: true }).click();
      await page.getByRole('button', { name: 'Save', exact: true }).click();

      await expect
        .poll(
          async () => {
            const { data } = await admin
              .from('lists')
              .select('cover_image_url')
              .eq('id', listId)
              .maybeSingle();
            return data?.cover_image_url ? 'set' : 'null';
          },
          { timeout: 30_000, message: 'cover_image_url did not clear' }
        )
        .toBe('null');
    } finally {
      await deleteList(listId);
    }
  });
});
