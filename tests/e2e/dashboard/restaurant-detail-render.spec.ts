import { expect, test, type Page } from '@playwright/test';

import { loadE2EEnv } from '../load-env';
import { deleteList, createOwnedList } from '../support/seed';
import { expectSignedInDashboardShell } from '../support/page-assertions';
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
 * Dashboard restaurant detail render coverage (TEST-PLAN §8, R2). Complements:
 *   - `deep-links.spec.ts` — only asserts the page loads;
 *   - `save-to-list-review.spec.ts` — asserts the review CRUD writes at the DB layer (R3).
 *
 * Here we assert the signed-in surface actually renders its parts: hero, location CTA, the
 * follow-circle ("Your NomNom Circle") indicators, the community + circle feed sections, and the
 * save CTA — then, via a real save through the sheet, that the viewer's own review card appears
 * in the feed (exercising the post-save pending-review skeleton path). Must-try dedupe is checked
 * best-effort because it depends on whether the seeded row carries list-item dishes.
 *
 * "The map" is a Google Maps deep-link button (`buildMapsUrl`), not a Mapbox static image; we
 * assert the control's stable aria-label is present (enabled link or disabled fallback).
 */

const MAPS_CONTROL_ARIA = 'Open this place in maps in a new tab';

type Admin = ReturnType<typeof getServiceRoleClient>;

const rx = (s: string) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

async function getRestaurantName(id: string): Promise<string | null> {
  const { data } = await getServiceRoleClient()
    .from('restaurants')
    .select('name')
    .eq('id', id)
    .maybeSingle();
  const name = (data as { name?: unknown } | null)?.name;
  return typeof name === 'string' && name.trim() ? name.trim() : null;
}

async function gotoDashboardRestaurant(page: Page, id: string): Promise<void> {
  await page.goto(`/dashboard/restaurants/${id}`, {
    waitUntil: 'domcontentloaded',
    timeout: 180_000,
  });
  await expect(page).toHaveURL(new RegExp(`/dashboard/restaurants/${id}`));
  // The route streams a loading skeleton first; on a slow dev server the RSC data fetch (7 queries)
  // can take a while to swap in `#main-content`, so wait past the default expect timeout.
  await expectSignedInDashboardShell(page, { timeout: 60_000 });
}

async function setRating(page: Page, value: number): Promise<void> {
  const input = page.locator(`input[name="save-sheet-review-rating"][value="${value}"]`);
  const id = await input.getAttribute('id');
  if (!id) throw new Error(`rating radio value="${value}" not found`);
  await page.locator(`label[for="${id}"]`).click();
  await expect(input).toBeChecked({ timeout: 5_000 });
}

async function deleteReviewRow(admin: Admin, restaurantId: string, userId: string): Promise<void> {
  await admin
    .from('restaurant_reviews')
    .delete()
    .eq('restaurant_id', restaurantId)
    .eq('user_id', userId);
}

test.describe('dashboard restaurant detail — render (R2)', () => {
  test.beforeEach(({}, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
    if (!hasServiceRoleCredentials()) {
      testInfo.skip(true, 'Set E2E_SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY for DB sample lookups');
    }
    // Cold-dev first-route compile can dwarf the 60s default; give it room.
    testInfo.setTimeout(180_000);
  });

  test('hero, location CTA, follow-circle indicators, community + circle sections, save CTA', async ({
    page,
  }) => {
    const id = await getAnyRestaurantId();
    test.skip(!id, 'No rows in public.restaurants — seed data or skip');

    const name = await getRestaurantName(id!);
    await gotoDashboardRestaurant(page, id!);

    // Hero heading (the restaurant name is the page's <h1>).
    const heroHeading = name
      ? page.getByRole('heading', { level: 1, name: rx(name) })
      : page.getByRole('heading', { level: 1 }).first();
    await expect(heroHeading).toBeVisible({ timeout: 30_000 });

    // Location CTA present (enabled external link or disabled fallback).
    await expect(page.getByLabel(MAPS_CONTROL_ARIA).first()).toBeVisible();

    // Community consensus block.
    await expect(page.getByRole('heading', { name: 'Community consensus' })).toBeVisible();

    // Follow-circle card + the NomNom Circle feed section both render on the signed-in surface.
    // Both use the "Your NomNom Circle" label (the follow-circle card caption + the feed heading),
    // so it appears at least once; the feed heading specifically must be present.
    await expect(
      page.getByRole('heading', { name: 'Your NomNom Circle' }).first()
    ).toBeVisible();
    expect(await page.getByText('Your NomNom Circle').count()).toBeGreaterThanOrEqual(1);

    // Save CTA: the hero toolbar save button is always present for a signed-in viewer.
    await expect(page.getByLabel('Save to list').first()).toBeVisible();

    // Gallery photos, when present, are tappable lightbox triggers.
    const galleryButtons = page.getByRole('button', { name: /View photo \d+ of \d+/ });
    if ((await galleryButtons.count()) > 0) {
      await expect(galleryButtons.first()).toBeVisible();
    }
  });

  test('must-try chips, when present, render de-duplicated per card', async ({ page }) => {
    const id = await getAnyRestaurantId();
    test.skip(!id, 'No rows in public.restaurants — seed data or skip');

    await gotoDashboardRestaurant(page, id!);

    // The must-try lead ("Must-try:") only renders inside mention cards that carry list-item
    // dishes. When the seeded row has none this is a no-op; when it does, assert the rendered
    // chips are unique within each card (the `dedupeMustTryDishesByDisplayLabel` contract).
    const leads = page.getByText('Must-try:', { exact: false });
    const leadCount = await leads.count();
    test.skip(leadCount === 0, 'Seeded restaurant has no must-try dishes on any mention card');

    for (let i = 0; i < leadCount; i += 1) {
      // Chips sit in the same flex row as the lead; read the sibling chip labels.
      const row = leads.nth(i).locator('xpath=..');
      const chipLabels = await row.locator('.MuiChip-label').allInnerTexts();
      const normalized = chipLabels.map((s) => s.trim().toLowerCase()).filter(Boolean);
      expect(new Set(normalized).size).toBe(normalized.length);
    }
  });
});

/**
 * Save through the sheet, then assert the viewer's own review card lands in the "Your NomNom
 * Circle" feed. This drives the post-save `reviewPending` skeleton path (a first-time save has no
 * card to swap, so a standalone pending skeleton renders until the refreshed review arrives).
 * Runs serially and cleans up its review + list via service role.
 */
test.describe('dashboard restaurant detail — review appears in feed (R2/R3 render)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(({}, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
    if (!hasServiceRoleCredentials()) {
      testInfo.skip(true, 'Set E2E_SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY for DB assertions');
    }
  });

  test('saving a review renders the pending skeleton, then the viewer own review card', async ({
    page,
  }) => {
    test.setTimeout(300_000);
    loadE2EEnv();

    const userId = await getUserIdByEmail(await getE2ETestUserEmailForDb());
    if (!userId) throw new Error('no user id for E2E test user');
    const restaurantId = await getAnyRestaurantId();
    test.skip(!restaurantId, 'No rows in public.restaurants — seed data or skip');

    const admin = getServiceRoleClient();
    const listName = `E2E Render Review ${Date.now()}`;
    const listId = await createOwnedList(userId, { name: listName });
    const body = `E2E render check ${Date.now()}`;

    try {
      // Clean slate so this is a first-time save (the branch that renders a standalone skeleton).
      await deleteReviewRow(admin, restaurantId!, userId);

      await gotoDashboardRestaurant(page, restaurantId!);

      // The save button opens the lazily-imported (`ssr:false`) SaveToListSheet; wait for it to be
      // hydrated/visible before clicking, then allow the chunk to load on a slow dev server.
      const saveButton = page.getByRole('button', { name: 'Save to list' }).first();
      await expect(saveButton).toBeVisible({ timeout: 30_000 });
      await saveButton.click();
      await expect(page.getByRole('heading', { name: /Save to/ })).toBeVisible({ timeout: 45_000 });

      // The sheet fetches the viewer's lists client-side (skeleton first); allow slow dev servers.
      const listTile = page.getByRole('button', { name: rx(listName) });
      await expect(listTile).toBeVisible({ timeout: 45_000 });
      await listTile.click();
      await setRating(page, 5);
      await page.getByLabel('Review', { exact: true }).fill(body);
      await page.getByRole('button', { name: 'Confirm', exact: true }).click();

      // The NomNom Circle feed lives in a labelled section; scope assertions to it.
      const feed = page.getByRole('region', { name: 'Your NomNom Circle' });

      // Best-effort: the post-save pending skeleton may flash briefly inside the feed while the
      // refreshed review is in-flight. Observe it if it lands within a short window (do not fail
      // the test on a fast refresh — the durable assertion is the card appearing below).
      const skeleton = feed.locator('.react-loading-skeleton').first();
      const sawSkeleton = await skeleton
        .waitFor({ state: 'visible', timeout: 4_000 })
        .then(() => true)
        .catch(() => false);
      test.info().annotations.push({
        type: 'note',
        description: sawSkeleton
          ? 'Observed post-save pending-review skeleton in the feed.'
          : 'Pending-review skeleton refreshed too fast to observe (non-fatal).',
      });

      // Durable: the viewer's own review card appears in the feed with the "(you)" badge + body.
      await expect(feed.getByText('(you)').first()).toBeVisible({ timeout: 45_000 });
      await expect(feed.getByText(body)).toBeVisible({ timeout: 45_000 });
    } finally {
      await deleteReviewRow(admin, restaurantId!, userId);
      await deleteList(listId);
    }
  });
});
