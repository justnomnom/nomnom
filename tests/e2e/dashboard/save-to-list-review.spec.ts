import { expect, test, type Page } from '@playwright/test';

import { loadE2EEnv } from '../load-env';
import { deleteList, createOwnedList } from '../support/seed';
import { dashboardTestsDisabled } from '../support/skip-dashboard';
import { hasServiceRoleCredentials } from '../support/service-role';
import {
  getAnyRestaurantId,
  getServiceRoleClient,
  getUserIdByEmail,
} from '../support/supabase-service';
import {
  E2E_DASHBOARD_AUTH_SETUP_HINT,
  getE2ETestUserEmailForDb,
} from '../support/test-credentials';

/**
 * SaveToListSheet is how a user "reviews" a restaurant: pick a NomNom list, set a star
 * rating (1–5), write a body note, then Confirm. Confirm fans out to two writes:
 *   - upsertRestaurantReview → `restaurant_reviews` row (rating + body)
 *   - addRestaurantToLists   → `list_items` row (list membership)
 *
 * These specs drive that multi-step sheet from the dashboard restaurant detail page against
 * a seeded owned list + any real restaurant, then assert the persisted rows via service role.
 * We cover the happy path (save → edit → delete) plus the two validation branches the sheet
 * guards locally (rating required, body max length).
 */

type Admin = ReturnType<typeof getServiceRoleClient>;

const rx = (s: string) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

async function openSaveSheet(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Save to list' }).first().click();
  // Sheet title copy is `pages.lists.save_sheet_title` → "Save to…".
  await expect(page.getByRole('heading', { name: /Save to/ })).toBeVisible({ timeout: 30_000 });
  // Webpack's "Compiling..." overlay blocks fetchMyLists; wait it out before asserting tiles.
  const compiling = page.getByText('Compiling...');
  if (await compiling.isVisible().catch(() => false)) {
    await compiling.waitFor({ state: 'hidden', timeout: 120_000 }).catch(() => {});
  }
}

/**
 * MUI Rating renders a visible <label> per half-star (each carrying a hidden "N Stars" text span)
 * with a sibling visually-hidden radio associated by `for`/`id`. Clicking the label icon is the
 * canonical interaction — clicking the 1px hidden radio directly does not update the controlled
 * value. We click the label's text, then confirm the sibling radio reflects the new value.
 */
async function setRating(page: Page, value: number): Promise<void> {
  const input = page.locator(`input[name="save-sheet-review-rating"][value="${value}"]`);
  const id = await input.getAttribute('id');
  if (!id) throw new Error(`rating radio value="${value}" not found`);
  await page.locator(`label[for="${id}"]`).click();
  await expect(input).toBeChecked({ timeout: 5_000 });
}

async function getReviewRow(admin: Admin, restaurantId: string, userId: string) {
  const { data } = await admin
    .from('restaurant_reviews')
    .select('rating, body')
    .eq('restaurant_id', restaurantId)
    .eq('user_id', userId)
    .maybeSingle();
  return data as { rating: number; body: string | null } | null;
}

async function listItemPresent(
  admin: Admin,
  listId: string,
  restaurantId: string
): Promise<boolean> {
  const { data } = await admin
    .from('list_items')
    .select('id')
    .eq('list_id', listId)
    .eq('restaurant_id', restaurantId)
    .maybeSingle();
  return Boolean(data);
}

/** Remove the test user's review for this restaurant (shared real row — always clean up). */
async function deleteReviewRow(
  admin: Admin,
  restaurantId: string,
  userId: string
): Promise<void> {
  await admin
    .from('restaurant_reviews')
    .delete()
    .eq('restaurant_id', restaurantId)
    .eq('user_id', userId);
}

test.describe.configure({ mode: 'serial' });

test.describe('dashboard — save-to-list / review mechanism', () => {
  test.beforeEach(({}, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
    if (!hasServiceRoleCredentials()) {
      testInfo.skip(true, 'Set E2E_SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY for DB assertions');
    }
  });

  test('save review (rating + body), edit it, then delete it', async ({ page }) => {
    test.setTimeout(300_000);
    loadE2EEnv();

    const userId = await getUserIdByEmail(await getE2ETestUserEmailForDb());
    if (!userId) throw new Error('no user id for E2E test user');
    const restaurantId = await getAnyRestaurantId();
    test.skip(!restaurantId, 'No rows in public.restaurants — seed data or skip');

    const admin = getServiceRoleClient();
    const listName = `E2E Review ${Date.now()}`;
    const listId = await createOwnedList(userId, { name: listName });

    try {
      // Start from a clean slate — no leftover review from a prior aborted run.
      await deleteReviewRow(admin, restaurantId!, userId);

      // --- Create: open sheet, select list, set rating + body, Confirm ---
      await page.goto(`/dashboard/restaurants/${restaurantId}`, {
        waitUntil: 'domcontentloaded',
        timeout: 180_000,
      });
      await openSaveSheet(page);

      const listTile = page.getByRole('button', { name: rx(listName) });
      await expect(listTile).toBeVisible({ timeout: 90_000 });
      await listTile.click();
      await expect(listTile).toHaveAttribute('aria-pressed', 'true');

      await setRating(page, 4);
      await page.getByLabel('Review', { exact: true }).fill('Great tacos, would save again.');
      await page.getByRole('button', { name: 'Confirm', exact: true }).click();

      // Both writes land: the review row (rating + body) and the list membership row.
      await expect
        .poll(async () => (await getReviewRow(admin, restaurantId!, userId))?.rating ?? null, {
          timeout: 30_000,
          message: 'restaurant_reviews rating not written',
        })
        .toBe(4);
      expect((await getReviewRow(admin, restaurantId!, userId))?.body).toBe(
        'Great tacos, would save again.'
      );
      await expect
        .poll(async () => listItemPresent(admin, listId, restaurantId!), {
          timeout: 30_000,
          message: 'list_items membership row not written',
        })
        .toBe(true);

      // --- Edit: reload so the sheet preloads my review, then change rating + body ---
      await page.goto(`/dashboard/restaurants/${restaurantId}`, {
        waitUntil: 'domcontentloaded',
        timeout: 180_000,
      });
      await openSaveSheet(page);
      // The seeded list is already a member — it renders pre-selected.
      await expect(page.getByRole('button', { name: rx(listName) })).toHaveAttribute(
        'aria-pressed',
        'true',
        { timeout: 30_000 }
      );

      await setRating(page, 3);
      await page.getByLabel('Review', { exact: true }).fill('On second thought, just okay.');
      await page.getByRole('button', { name: 'Confirm', exact: true }).click();

      await expect
        .poll(async () => (await getReviewRow(admin, restaurantId!, userId))?.rating ?? null, {
          timeout: 30_000,
          message: 'edited rating not persisted',
        })
        .toBe(3);
      expect((await getReviewRow(admin, restaurantId!, userId))?.body).toBe(
        'On second thought, just okay.'
      );

      // --- Delete: reopen, remove the review, assert the row is gone ---
      await page.goto(`/dashboard/restaurants/${restaurantId}`, {
        waitUntil: 'domcontentloaded',
        timeout: 180_000,
      });
      await openSaveSheet(page);
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Delete', exact: true })
        .click();
      await page.getByTestId('e2e-delete-confirm').click();

      await expect
        .poll(async () => ((await getReviewRow(admin, restaurantId!, userId)) ? 'present' : 'gone'), {
          timeout: 30_000,
          message: 'restaurant_reviews row was not deleted',
        })
        .toBe('gone');
    } finally {
      await deleteReviewRow(admin, restaurantId!, userId);
      await deleteList(listId);
    }
  });

  test('validation: rating required, and body respects the max-length cap', async ({ page }) => {
    test.setTimeout(240_000);
    loadE2EEnv();

    const userId = await getUserIdByEmail(await getE2ETestUserEmailForDb());
    if (!userId) throw new Error('no user id for E2E test user');
    const restaurantId = await getAnyRestaurantId();
    test.skip(!restaurantId, 'No rows in public.restaurants — seed data or skip');

    const admin = getServiceRoleClient();
    const listName = `E2E Review Guard ${Date.now()}`;
    const listId = await createOwnedList(userId, { name: listName });

    try {
      await deleteReviewRow(admin, restaurantId!, userId);

      await page.goto(`/dashboard/restaurants/${restaurantId}`, {
        waitUntil: 'domcontentloaded',
        timeout: 180_000,
      });
      await openSaveSheet(page);

      const bodyField = page.getByLabel('Review', { exact: true });

      // Native maxLength is the cap; filling 2100 chars into a controlled MUI field
      // re-renders per character and can stall the spec for minutes.
      await expect(bodyField).toHaveAttribute('maxlength', '2000');

      // Rating required: select a list + body but no stars → Confirm surfaces the guard and
      // writes nothing (the handler returns before touching the DB).
      const listTile = page.getByRole('button', { name: rx(listName) });
      await expect(listTile).toBeVisible({ timeout: 90_000 });
      await listTile.click();
      await bodyField.fill('Needs a rating first.');
      await page.getByRole('button', { name: 'Confirm', exact: true }).click();

      await expect(page.getByRole('alert')).toContainText('Choose a star rating', {
        timeout: 15_000,
      });

      // Nothing persisted: no review row, and the failed Confirm never added the membership.
      expect(await getReviewRow(admin, restaurantId!, userId)).toBeNull();
      expect(await listItemPresent(admin, listId, restaurantId!)).toBe(false);
    } finally {
      await deleteReviewRow(admin, restaurantId!, userId);
      await deleteList(listId);
    }
  });
});
