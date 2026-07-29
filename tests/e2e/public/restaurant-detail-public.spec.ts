import { expect, test, type Page } from '@playwright/test';

import { expectAppShellMainVisible } from '../support/page-assertions';
import { hasServiceRoleCredentials } from '../support/service-role';
import { getAnyRestaurantId, getServiceRoleClient } from '../support/supabase-service';

/**
 * Public `/restaurants/[id]` render coverage (TEST-PLAN §8, R1) — goes beyond the one-line
 * "page loads" smoke in `public-entity-pages.spec.ts`.
 *
 * The public share page renders the shared `RestaurantDetailView` with
 * `showListsAndReviews={false}` + `onGuestSaveClick`, so it must show the hero/gallery, the
 * location (maps) CTA and the community-consensus block, while hiding the reviews / NomNom
 * Circle feed and routing the save button into the guest sign-up prompt.
 *
 * Note on "the map": these views do NOT embed a Mapbox static image — the location control is a
 * Google Maps deep-link button (`buildMapsUrl`) that degrades to a disabled button when a row has
 * no name/address/coords/maps_link. We assert the control is always present (its stable
 * `aria-label`) and, when the seeded row has location data, that it is an external link.
 */

const MAPS_CONTROL_ARIA = 'Open this place in maps in a new tab';

async function getRestaurantName(id: string): Promise<string | null> {
  const { data } = await getServiceRoleClient()
    .from('restaurants')
    .select('name')
    .eq('id', id)
    .maybeSingle();
  const name = (data as { name?: unknown } | null)?.name;
  return typeof name === 'string' && name.trim() ? name.trim() : null;
}

async function gotoPublicRestaurant(page: Page, id: string): Promise<void> {
  // First hit to this route on a cold dev server compiles it — allow generous headroom.
  await page.goto(`/restaurants/${id}`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await expect(page).toHaveURL(new RegExp(`/restaurants/${id}`));
  await expectAppShellMainVisible(page, { timeout: 45_000 });
}

test.describe('public restaurant detail — render (R1)', () => {
  test.beforeEach(({}, testInfo) => {
    if (!hasServiceRoleCredentials()) {
      testInfo.skip(true, 'Set E2E_SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY for DB sample lookups');
    }
    // Cold-dev first-route compile can dwarf the 60s default; give it room.
    testInfo.setTimeout(180_000);
  });

  test('hero, gallery and location CTA render; reviews / NomNom Circle stay hidden for guests', async ({
    page,
  }) => {
    const id = await getAnyRestaurantId();
    test.skip(!id, 'No rows in public.restaurants — seed data or skip');

    const name = await getRestaurantName(id!);
    await gotoPublicRestaurant(page, id!);

    // Hero: the restaurant name is the page's <h1>.
    const heroHeading = name
      ? page.getByRole('heading', { level: 1, name: new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })
      : page.getByRole('heading', { level: 1 }).first();
    await expect(heroHeading).toBeVisible({ timeout: 30_000 });

    // Gallery: when the seeded row has photos they render as tappable "View photo N of M" buttons
    // (lightbox triggers). Absent photos fall back to a placeholder icon, so gate the assertion.
    const galleryButtons = page.getByRole('button', { name: /View photo \d+ of \d+/ });
    const galleryCount = await galleryButtons.count();
    if (galleryCount > 0) {
      await expect(galleryButtons.first()).toBeVisible();
    } else {
      test.info().annotations.push({
        type: 'note',
        description: 'Seeded restaurant has no gallery photos — hero placeholder rendered.',
      });
    }

    // Location CTA is always present (enabled external link, or disabled fallback with no coords).
    const mapsControl = page.getByLabel(MAPS_CONTROL_ARIA).first();
    await expect(mapsControl).toBeVisible();
    const href = await mapsControl.getAttribute('href');
    if (href) {
      // Real location data → external Google Maps deep link opened in a new tab.
      expect(href).toMatch(/^https?:\/\//);
      await expect(mapsControl).toHaveAttribute('target', '_blank');
    } else {
      // No location data → the control renders as a disabled <button> fallback (still visible).
      await expect(mapsControl).toBeDisabled();
    }

    // Community-consensus block always renders (data or an empty-state line).
    await expect(page.getByRole('heading', { name: 'Community consensus' })).toBeVisible();

    // Guest surface: reviews + NomNom Circle feed are suppressed (showListsAndReviews=false),
    // so the "Your NomNom Circle" section heading must be absent.
    await expect(page.getByRole('heading', { name: 'Your NomNom Circle' })).toHaveCount(0);
  });

  test('guest save button opens the sign-up / sign-in prompt', async ({ page }) => {
    const id = await getAnyRestaurantId();
    test.skip(!id, 'No rows in public.restaurants — seed data or skip');

    await gotoPublicRestaurant(page, id!);

    // On the public page the save button is wired to `onGuestSaveClick`, not the save sheet.
    await page.getByLabel('Save to list').first().click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await expect(dialog.getByText('Want the full experience?')).toBeVisible();
    await expect(dialog.getByRole('link', { name: 'Create account' })).toBeVisible();
    await expect(dialog.getByRole('link', { name: 'Sign in' })).toBeVisible();
  });
});
