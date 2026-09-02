import { type Page, expect, test } from '@playwright/test';

import { loadE2EEnv } from '../load-env';
import { resolveE2EAdmin } from '../support/admin-e2e';
import { deleteSponsoredPlacement } from '../support/seed';
import { expectSignedInDashboardShell, APP_NOT_FOUND_HEADING } from '../support/page-assertions';
import { dashboardTestsDisabled } from '../support/skip-dashboard';
import { E2E_DASHBOARD_AUTH_SETUP_HINT } from '../support/test-credentials';
import { getServiceRoleClient, findMunicipalityCityWithRestaurant } from '../support/supabase-service';

/**
 * TEST-PLAN §11 AD2 — admin sponsored placements: table + inline schedule editor CRUD.
 *
 * Route guard (allowlisted vs global not-found) is covered by navigation-extended.spec.ts. This
 * spec drives the full mutation surface for an allowlisted admin: create a placement via the Add
 * form → verify the DB row → set a visibility window with the inline schedule editor → verify the
 * dates persisted → remove it → verify the row is gone.
 *
 * Gating: `ADMIN_USER_IDS` is env-driven and read by the running server; it can't be mutated for a
 * live server from a test, so we skip when the shared E2E user isn't allowlisted (rather than
 * seeding a new admin the server wouldn't recognize).
 */
const ADMIN_HEADING = 'Discover sponsored restaurants';

const ESCAPE_REGEXP = /[.*+?^${}()|[\]\\]/g;
const escapeRegExp = (s: string) => s.replace(ESCAPE_REGEXP, '\\$&');

type PlacementRow = {
  id: string;
  city_id: string | null;
  state_id: string | null;
  restaurant_id: string | null;
  active: boolean | null;
  pin_sort_order: number | null;
  inject_after_organic: number | null;
  valid_from: string | null;
  valid_until: string | null;
};

const PLACEMENT_COLS =
  'id, city_id, state_id, restaurant_id, active, pin_sort_order, inject_after_organic, valid_from, valid_until';

/**
 * Set an inline AntD RangePicker (editable inputs; default `YYYY-MM-DD` format). Opening the panel
 * renders a full-screen backdrop overlay, so only the start input is clicked (before the overlay
 * exists); AntD then advances focus to the end field by itself after Enter. Do NOT refocus the end
 * input programmatically — an external focus() while the range draft is open makes AntD drop the
 * tentative start half (observed: end persisted, start reverted to empty).
 */
async function setInlineSchedule(
  page: Page,
  startInput: ReturnType<Page['getByPlaceholder']>,
  endInput: ReturnType<Page['getByPlaceholder']>,
  startIso: string,
  endIso: string
) {
  await startInput.click(); // opens the panel + focuses the start field
  // fill() clears any pre-existing value first — keyboard.type APPENDS, which turns a
  // prefilled input into an unparseable string that Enter silently refuses to commit.
  await startInput.fill(startIso);
  await page.keyboard.press('Enter'); // commit start
  await endInput.fill(endIso);
  await page.keyboard.press('Enter'); // commit end
  await page.keyboard.press('Escape'); // make sure the panel is closed before Save
  // Both halves must have survived the draft → committed transition before Save is pressed.
  await expect(startInput).toHaveValue(startIso);
  await expect(endInput).toHaveValue(endIso);
}

test.describe.configure({ mode: 'serial' });

test.describe('admin — sponsored placements CRUD (AD2)', () => {
  let isAdmin = false;

  test.beforeAll(async () => {
    if (dashboardTestsDisabled()) return;
    const res = await resolveE2EAdmin();
    isAdmin = res.isAdmin;
    if (!isAdmin) {
      // eslint-disable-next-line no-console
      console.warn(`[e2e] Skipping admin sponsored-placements CRUD: ${res.reason}`);
    }
  });

  test.beforeEach(({}, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
    testInfo.skip(!isAdmin, 'Shared E2E user is not in ADMIN_USER_IDS (see console warning).');
  });

  test('create → edit schedule inline → delete, verified in Postgres', async ({ page }) => {
    // Cold-compiles /dashboard/admin/sponsored-placements plus two admin server actions.
    test.setTimeout(240_000);
    loadE2EEnv();

    const geo = await findMunicipalityCityWithRestaurant();
    test.skip(!geo, 'No municipality city with restaurants in the DB — cannot exercise the Add form.');
    const { cityId, cityName } = geo!;

    const admin = getServiceRoleClient();
    let createdId: string | null = null;

    try {
      // --- Load the admin view (skip on env drift where the server disagrees on admin status). ---
      await page.goto('/dashboard/admin/sponsored-placements', {
        waitUntil: 'domcontentloaded',
        timeout: 120_000,
      });
      await expect(page).toHaveURL(/\/dashboard\/admin\/sponsored-placements/);
      await expectSignedInDashboardShell(page, { timeout: 30_000 });

      const adminHeading = page.getByRole('heading', { name: ADMIN_HEADING });
      const notFoundHeading = page.getByRole('heading', { name: APP_NOT_FOUND_HEADING });
      await expect(adminHeading.or(notFoundHeading)).toBeVisible({ timeout: 30_000 });
      // Env-drift guard: our env read said "admin", but the server rendered not-found.
      test.skip(
        await notFoundHeading.isVisible(),
        "Server's ADMIN_USER_IDS does not include the E2E user (env drift)."
      );
      await expect(adminHeading).toBeVisible();

      // Snapshot existing rows so we can identify the one this test creates.
      const { data: beforeRows, error: beforeErr } = await admin
        .from('sponsored_restaurant_placements')
        .select('id');
      if (beforeErr) throw beforeErr;
      const beforeIds = new Set((beforeRows ?? []).map((r) => r.id as string));

      // --- Create via the Add form: City scope (default) → city → restaurant → pin → Add. ---
      const cityCombobox = page.getByRole('combobox', { name: 'City' });
      await expect(cityCombobox).toBeVisible({ timeout: 20_000 });
      await cityCombobox.click();
      await cityCombobox.fill(cityName);
      // Name is unique among municipalities; anchor on it (labels are "name · state · country").
      await page
        .getByRole('option', { name: new RegExp(`^${escapeRegExp(cityName)}(\\s·|$)`) })
        .first()
        .click();

      const restaurantCombobox = page.getByRole('combobox', { name: 'Restaurant' });
      await expect(restaurantCombobox).toBeEnabled({ timeout: 20_000 });
      await restaurantCombobox.click();
      // Options arrive from a debounced (280ms) server search scoped to the selected city;
      // the search server action takes ~30s+ on its first (cold) invocation in dev.
      const firstRestaurantOption = page.getByRole('option').first();
      await expect(firstRestaurantOption).toBeVisible({ timeout: 90_000 });
      await firstRestaurantOption.click();

      const pinField = page.getByLabel('Pin sort order');
      await pinField.fill('7');

      await page.getByRole('button', { name: 'Add placement' }).click();

      // Verify the create landed in Postgres and capture the new row's id (set difference).
      let created: PlacementRow | null = null;
      await expect
        .poll(
          async () => {
            const { data } = await admin
              .from('sponsored_restaurant_placements')
              .select(PLACEMENT_COLS)
              .eq('city_id', cityId)
              .order('updated_at', { ascending: false });
            created = ((data as PlacementRow[]) ?? []).find((r) => !beforeIds.has(r.id)) ?? null;
            return created?.id ?? null;
          },
          { timeout: 30_000, message: 'created sponsored placement row did not appear' }
        )
        .not.toBeNull();

      createdId = created!.id;
      expect(created!.pin_sort_order).toBe(7);
      expect(created!.inject_after_organic).toBeNull();
      expect(created!.active).toBe(true);
      expect(created!.valid_from).toBeNull();
      expect(created!.valid_until).toBeNull();

      // --- Reload so the table renders my row (newest → first) and use the inline schedule editor. ---
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
      await expect(adminHeading).toBeVisible({ timeout: 30_000 });

      // The first data row is the one just created (rows are ordered by updated_at desc). Its inline
      // editor is the first AntD RangePicker inside the table; the Add-form picker sits outside it.
      const tableScope = page.getByRole('table');
      const startInput = tableScope.getByPlaceholder('Start (optional)').first();
      const endInput = tableScope.getByPlaceholder('End (optional)').first();
      await expect(startInput).toBeVisible({ timeout: 20_000 });

      // Mid-year dates keep start-of-day / end-of-day within the same year across timezones.
      await setInlineSchedule(page, startInput, endInput, '2030-06-10', '2030-06-20');

      await tableScope.getByRole('button', { name: 'Save schedule' }).first().click();

      await expect
        .poll(
          async () => {
            const { data } = await admin
              .from('sponsored_restaurant_placements')
              .select('valid_from, valid_until')
              .eq('id', createdId!)
              .maybeSingle();
            return data?.valid_from && data?.valid_until ? 'set' : 'unset';
          },
          { timeout: 30_000, message: 'inline schedule edit did not persist valid_from/valid_until' }
        )
        .toBe('set');

      const { data: scheduled } = await admin
        .from('sponsored_restaurant_placements')
        .select('valid_from, valid_until')
        .eq('id', createdId!)
        .maybeSingle();
      expect(scheduled?.valid_from).toContain('2030');
      expect(scheduled?.valid_until).toContain('2030');
      expect(new Date(scheduled!.valid_from as string).getTime()).toBeLessThan(
        new Date(scheduled!.valid_until as string).getTime()
      );

      // --- Delete via the row action + confirmation dialog, verify the row is gone. ---
      await tableScope.getByRole('button', { name: 'Remove', exact: true }).first().click();
      await page.getByTestId('e2e-delete-confirm').click();

      await expect
        .poll(
          async () => {
            const { data } = await admin
              .from('sponsored_restaurant_placements')
              .select('id')
              .eq('id', createdId!)
              .maybeSingle();
            return data;
          },
          { timeout: 30_000, message: 'sponsored placement row was not deleted' }
        )
        .toBeNull();

      createdId = null; // deleted — nothing to clean up.
    } finally {
      if (createdId) await deleteSponsoredPlacement(createdId).catch(() => {});
    }
  });
});
