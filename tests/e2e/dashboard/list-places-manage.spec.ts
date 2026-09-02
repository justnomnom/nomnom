import { expect, test } from '@playwright/test';

import { loadE2EEnv } from '../load-env';
import { deleteList, seedListItem, createOwnedList } from '../support/seed';
import { dashboardTestsDisabled } from '../support/skip-dashboard';
import { getAnyRestaurantId, getServiceRoleClient, getUserIdByEmail } from '../support/supabase-service';
import {
  E2E_DASHBOARD_AUTH_SETUP_HINT,
  getE2ETestUserEmailForDb,
} from '../support/test-credentials';

/**
 * Places-tab management (TEST-PLAN L5): a seeded list item renders, and removing it via the UI deletes the
 * list_items row. (Add-via-save-sheet is a separate multi-step flow; the item is seeded so
 * this focuses on the render + remove mechanism.)
 */
test.describe.configure({ mode: 'serial' });

test.describe('dashboard lists — places (items) manage', () => {
  test.beforeEach(({}, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
  });

  test('seeded place renders and can be removed', async ({ page }) => {
    test.setTimeout(240_000);
    loadE2EEnv();
    const userId = await getUserIdByEmail(await getE2ETestUserEmailForDb());
    if (!userId) throw new Error('no user id');
    const restaurantId = await getAnyRestaurantId();
    test.skip(!restaurantId, 'No rows in public.restaurants — seed data or skip');

    const admin = getServiceRoleClient();
    const listId = await createOwnedList(userId, { name: `E2E Places ${Date.now()}` });

    try {
      await seedListItem(listId, restaurantId!, userId);

      // Confirm the item exists in DB before the UI check.
      const { data: before } = await admin
        .from('list_items')
        .select('id')
        .eq('list_id', listId)
        .eq('restaurant_id', restaurantId)
        .maybeSingle();
      expect(before, 'seeded list_item missing').not.toBeNull();

      await page.goto(`/dashboard/lists/${listId}/manage`, {
        waitUntil: 'domcontentloaded',
        timeout: 180_000,
      });
      await expect(page.getByRole('tab', { name: 'Places' })).toBeVisible({ timeout: 45_000 });
      await page.getByRole('tab', { name: 'Places' }).click();

      // The seeded place row renders a remove control; empty-state copy must NOT be present.
      await expect(page.getByText('No places yet').or(page.getByText(/No spots/i))).toHaveCount(0);
      // The whole row is a role="button" (ListItemButton) whose accessible name concatenates
      // the nested action labels — so a loose /Remove/ match picks the row itself and clicking
      // it navigates to the restaurant page instead of removing. Target the row-scoped remove
      // IconButton by its exact aria-label ("Remove").
      const removeBtn = page.getByRole('button', { name: 'Remove', exact: true });
      await expect(removeBtn).toBeVisible({ timeout: 30_000 });
      await removeBtn.click();

      await expect
        .poll(
          async () => {
            const { data } = await admin
              .from('list_items')
              .select('id')
              .eq('list_id', listId)
              .eq('restaurant_id', restaurantId)
              .maybeSingle();
            return data ? 'present' : 'gone';
          },
          { timeout: 30_000, message: 'list_item was not removed' }
        )
        .toBe('gone');
    } finally {
      await deleteList(listId);
    }
  });
});
