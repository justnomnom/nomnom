import { expect, test } from '@playwright/test';

import { loadE2EEnv } from '../load-env';
import { deleteList, createOwnedList, setUserHomeLocality } from '../support/seed';
import { dashboardTestsDisabled } from '../support/skip-dashboard';
import { hasServiceRoleCredentials } from '../support/service-role';
import {
  findMunicipalityCityWithRestaurant,
  getServiceRoleClient,
  getUserIdByEmail,
} from '../support/supabase-service';
import {
  E2E_DASHBOARD_AUTH_SETUP_HINT,
  getE2ETestUserEmailForDb,
} from '../support/test-credentials';

/**
 * TEST-PLAN §6 L3 — SaveToListSheet opened from a DISCOVER FEED CARD (the restaurant-page
 * entry point is covered by save-to-list-review.spec.ts). Feed rows render the shared
 * spot-row component whose save affordance is the "Save to list" icon button; Confirm needs
 * a rating (the sheet validates it), and fans out to `restaurant_reviews` +
 * `list_items` — we assert the membership row lands in the seeded (initially empty) list.
 *
 * Pins the shared E2E user's home locality to a municipality that has restaurants so the
 * feed is non-empty. Still self-skips if the DB has no municipality with restaurants.
 */
test.describe('discover feed card — save to list (L3)', () => {
  test.beforeEach(({}, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
    if (!hasServiceRoleCredentials()) {
      testInfo.skip(true, 'Service role needed for DB assertions');
    }
  });

  test('save from the first feed card writes the list_items row', async ({ page }) => {
    test.setTimeout(300_000);
    loadE2EEnv();
    const admin = getServiceRoleClient();
    const userId = await getUserIdByEmail(await getE2ETestUserEmailForDb());
    test.skip(!userId, 'Could not resolve the shared E2E user id from email');
    if (!userId) return;

    const market = await findMunicipalityCityWithRestaurant();
    test.skip(!market, 'No municipality with restaurants — cannot seed a discover feed market');
    if (!market) return;

    const previousLocality = await setUserHomeLocality(userId, market.cityId);
    const listName = `Discover Save ${Date.now()}`;
    const listId = await createOwnedList(userId, { name: listName });

    const readSavedItems = async () => {
      const { data } = await admin
        .from('list_items')
        .select('restaurant_id')
        .eq('list_id', listId);
      return (data ?? []).map((r) => r.restaurant_id as string);
    };

    let savedRestaurantId: string | null = null;
    try {
      await page.goto('/dashboard/discover', { waitUntil: 'domcontentloaded', timeout: 180_000 });

      // Feed rows stream in below the area chip / promos. Use exact:true — spot rows wrap the
      // icon button in a ListItemButton whose accessible name is "<restaurant> Save to list",
      // which substring-matches "Save to list" and breaks `.or(Change area)` under strict mode.
      // Do not treat "Change area" as a ready signal: it is always visible once a market is set.
      const saveButton = page.getByRole('button', { name: 'Save to list', exact: true }).first();
      const saveAppeared = await saveButton
        .waitFor({ state: 'visible', timeout: 120_000 })
        .then(() => true)
        .catch(() => false);
      test.skip(
        !saveAppeared,
        'Discover feed still empty after pinning home locality — cannot exercise the card save.'
      );

      await saveButton.scrollIntoViewIfNeeded();
      await saveButton.click();
      await expect(page.getByRole('heading', { name: /Save to/ })).toBeVisible({
        timeout: 30_000,
      });

      // Select the seeded list tile, set the required rating, confirm.
      const listTile = page.getByRole('button', {
        name: new RegExp(listName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      });
      await expect(listTile).toBeVisible({ timeout: 30_000 });
      await listTile.click();
      await expect(listTile).toHaveAttribute('aria-pressed', 'true');

      const ratingInput = page.locator('input[name="save-sheet-review-rating"][value="4"]');
      const ratingId = await ratingInput.getAttribute('id');
      if (!ratingId) throw new Error('rating radio value="4" not found in the save sheet');
      await page.locator(`label[for="${ratingId}"]`).click();
      await expect(ratingInput).toBeChecked({ timeout: 5_000 });

      await page.getByRole('button', { name: 'Confirm', exact: true }).click();

      await expect
        .poll(async () => (await readSavedItems()).length, {
          timeout: 30_000,
          message: 'list_items membership row not written from the discover card save',
        })
        .toBe(1);
      [savedRestaurantId] = await readSavedItems();
      expect(savedRestaurantId).toBeTruthy();
    } finally {
      // The sheet also upserts the viewer's review for that restaurant — clean it up.
      if (savedRestaurantId) {
        await admin
          .from('restaurant_reviews')
          .delete()
          .eq('restaurant_id', savedRestaurantId)
          .eq('user_id', userId);
      }
      await deleteList(listId);
      await setUserHomeLocality(userId, previousLocality);
    }
  });
});
