import { expect, test } from '@playwright/test';

import { expectAppShellMainVisible } from '../support/page-assertions';
import {
  createOwnedList,
  createSeededUser,
  deleteList,
  deleteRestaurants,
  deleteSeededUser,
  publishList,
  seedListItem,
  seedRestaurant,
} from '../support/seed';
import { hasServiceRoleCredentials } from '../support/service-role';
import { getAnyMunicipalityId, getServiceRoleClient } from '../support/supabase-service';

/**
 * TEST-PLAN L1 — public list page `/lists/[creatorHandle]/[listSlug]` renders
 * the list name and share/save controls for a published list.
 */
test.describe('public list page — handle/slug (L1)', () => {
  test('published list at /lists/:handle/:slug renders name + share/save', async ({ page }) => {
    test.setTimeout(180_000);
    test.skip(!hasServiceRoleCredentials(), 'Need SUPABASE_SECRET_KEY / E2E service role');

    const municipalityId = await getAnyMunicipalityId();
    test.skip(!municipalityId, 'No municipality rows to seed a restaurant');

    const creator = await createSeededUser('e2el1');
    const listName = `E2E Public List ${Date.now().toString(36)}`;
    const slug = `e2e-pub-${Date.now().toString(36)}`;
    const listId = await createOwnedList(creator.id, { name: listName, visibility: 'public' });
    const restaurantIds: string[] = [];
    try {
      const admin = getServiceRoleClient();
      const { error: slugErr } = await admin.from('lists').update({ slug }).eq('id', listId);
      if (slugErr) throw new Error(`list slug update failed: ${slugErr.message}`);
      await publishList(listId);
      const restaurantId = await seedRestaurant(`E2E L1 spot ${Date.now().toString(36)}`, municipalityId);
      restaurantIds.push(restaurantId);
      await seedListItem(listId, restaurantId, creator.id);

      await page.goto(`/lists/${creator.username}/${slug}`, {
        waitUntil: 'domcontentloaded',
        timeout: 120_000,
      });
      await expect(page).toHaveURL(new RegExp(`/lists/${creator.username}/${slug}`));
      await expectAppShellMainVisible(page, { timeout: 90_000 });
      await expect(page.getByRole('heading', { level: 1, name: listName })).toBeVisible({
        timeout: 45_000,
      });
      const shareOrSave = page
        .getByRole('button', { name: /^Share$/i })
        .or(page.getByRole('button', { name: /save/i }));
      await expect(shareOrSave.first()).toBeVisible({ timeout: 30_000 });
    } finally {
      await deleteList(listId);
      await deleteRestaurants(restaurantIds);
      await deleteSeededUser(creator.id);
    }
  });
});
