import { type Page, type Browser, expect, test } from '@playwright/test';

import { expectSignedInDashboardShell } from '../support/page-assertions';
import { dashboardTestsDisabled } from '../support/skip-dashboard';
import { findTypeaheadQueryToken } from '../support/supabase-service';
import { E2E_DASHBOARD_AUTH_SETUP_HINT } from '../support/test-credentials';
import {
  type SeededUser,
  createSeededUser,
  deleteSeededUser,
  buildUserStorageState,
  completeOnboardingWithoutHome,
} from '../support/seed';

/**
 * Discover search interactions and roulette spin outcome. Covers TEST-PLAN §7:
 * - D2: Search ↔ Ask-AI mode switch + the AI (natural-language agent) hand-off path.
 * - D3: name typeahead (restaurant suggestions + keyboard dismiss + pick opens on the map).
 * Plus the discover → map `?filters=open` round-trip, and the no-home-location gate (a seeded
 * user with `home_locality_id = null`). Uses the seeded test user's home location unless noted.
 */
test.describe('dashboard discover + roulette', () => {
  test.beforeEach(({}, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
  });

  /**
   * Robust first dashboard navigation. Uses 'domcontentloaded' (not 'load'): Discover keeps
   * streaming background fetches (feed + geolocation refine), so the load event can lag a cold
   * compile past the timeout. The single webpack dev server also restarts under memory pressure
   * (documented in docs/TEST-PLAN.md), which surfaces mid-navigation as `ERR_CONNECTION_RESET`
   * or a hydration flash into the auth gate — so retry the whole goto a few times.
   */
  async function gotoDashboard(page: Page, path: string) {
    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 120_000 });
        await expectSignedInDashboardShell(page, { timeout: 45_000 });
        return;
      } catch (e) {
        lastErr = e;
        await page.waitForTimeout(3_000);
      }
    }
    throw lastErr;
  }

  test('discover: search input accepts text and Search↔AI toggle swaps the placeholder', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await gotoDashboard(page, '/dashboard/discover');

    await expect(page.getByTestId('e2e-discover-view')).toBeVisible({ timeout: 45_000 });

    const searchInput = page.getByPlaceholder(/Search spots/i);
    await expect(searchInput).toBeVisible({ timeout: 45_000 });
    await searchInput.fill('pizza');
    await expect(searchInput).toHaveValue('pizza');

    // Toggle to Ask-AI mode; the button's accessible name is its aria-label
    // ("Switch to AI search"), not the visible "AI" text.
    await page.getByRole('button', { name: /Switch to AI search/i }).click();
    await expect(page.getByPlaceholder(/Ask AI/i)).toBeVisible({ timeout: 15_000 });
  });

  test('discover: Table + Roulette promos are visible and link out', async ({ page }) => {
    test.setTimeout(180_000);
    await gotoDashboard(page, '/dashboard/discover');
    await expect(page.getByTestId('e2e-discover-view')).toBeVisible({ timeout: 45_000 });

    const table = page.getByRole('link', { name: /Start a Table|Abrir uma Mesa/i });
    // Title is the short "Roulette" / "Roleta" on the matching promo card — not the
    // long-form "Try the NomNom Roulette" used on the roulette page itself.
    const roulette = page.getByRole('link', { name: /^Roulette|^Roleta/i });

    await expect(table).toBeVisible({ timeout: 45_000 });
    await expect(roulette).toBeVisible({ timeout: 20_000 });

    await expect(table).toHaveAttribute('href', /\/dashboard\/lists\?table=1/);
    await expect(roulette).toHaveAttribute('href', /\/dashboard\/roulette/);

    // Both live in one labelled pair rather than separate divider-kicker sections.
    const group = page.locator('section[aria-labelledby="discover-decide-group-label"]');
    await expect(group).toHaveCount(1);
    await expect(group.getByRole('link')).toHaveCount(2);
  });

  test('discover → Table deep-link shows the "pick a list" hint on the lists hub', async ({
    page,
  }) => {
    // Crosses two heavy routes. Warm the destination FIRST: on the shared webpack dev server a
    // cold /dashboard/lists compile otherwise lands inside the post-click wait, and the whole
    // test times out even though the wiring is fine (passes in isolation, fails in a full run).
    test.setTimeout(240_000);
    await gotoDashboard(page, '/dashboard/lists');
    // With no ?table=1 the hub must stay clean — asserted here so the warm-up earns its keep.
    await expect(page.getByRole('button', { name: /Got it|Entendido/i })).toHaveCount(0);

    await gotoDashboard(page, '/dashboard/discover');
    await expect(page.getByTestId('e2e-discover-view')).toBeVisible({ timeout: 45_000 });

    await page.getByRole('link', { name: /Start a Table|Abrir uma Mesa/i }).click();
    // RouterLink anchor → App Router soft navigation, so poll the URL (no commit fires).
    await expect(page).toHaveURL(/\/dashboard\/lists\?table=1/, { timeout: 90_000 });

    const dismiss = page.getByRole('button', { name: /Got it|Entendido/i });
    await expect(dismiss).toBeVisible({ timeout: 45_000 });
    await dismiss.click();
    await expect(dismiss).toBeHidden({ timeout: 15_000 });
  });

  // ---- D3: name typeahead (Search mode) --------------------------------------------------------
  // Resolve a query that the shared `search_restaurants_by_name` RPC returns rows for, using the
  // exact Portugal bbox the UI uses — so the browser typeahead is guaranteed to have suggestions.
  let typeaheadQuery: string | null = null;
  test.beforeAll(async () => {
    if (dashboardTestsDisabled()) return;
    typeaheadQuery = await findTypeaheadQueryToken();
  });

  test('discover typeahead: restaurant suggestions appear and picking one opens it on the map', async ({
    page,
  }) => {
    test.setTimeout(240_000);
    test.skip(!typeaheadQuery, 'No matchable restaurant name in the seeded DB for the typeahead.');
    await gotoDashboard(page, '/dashboard/discover');
    await expect(page.getByTestId('e2e-discover-view')).toBeVisible({ timeout: 45_000 });

    const searchInput = page.getByPlaceholder(/Search spots/i);
    await expect(searchInput).toBeVisible({ timeout: 45_000 });
    await searchInput.fill(typeaheadQuery as string);

    // Popper typeahead (role=listbox, aria "Spot search suggestions") opens after the 120ms debounce.
    const listbox = page.getByRole('listbox', { name: /Spot search suggestions/i });
    await expect(listbox).toBeVisible({ timeout: 30_000 });

    // Wait for the actual result rows. The first `searchRestaurantsByName` server action is slow to
    // cold-compile on the webpack dev server (~30s observed) — until it resolves, the popup shows
    // only a "Searching spots…" spinner, so give the results a generous window.
    const options = listbox.getByRole('menuitem');
    await expect(options.first()).toBeVisible({ timeout: 90_000 });
    expect(await options.count()).toBeGreaterThan(0);

    // Discover's typeahead is restaurant-only — rows land under the "In this view" / "Elsewhere in
    // Portugal" sections. Locality suggestions ("Locations") are map-only (no `onPickLocation` is
    // wired on Discover), so that section must NOT appear here.
    await expect(
      listbox.getByText('In this view').or(listbox.getByText('Elsewhere in Portugal')).first()
    ).toBeVisible({ timeout: 10_000 });
    await expect(listbox.getByText('Locations', { exact: true })).toHaveCount(0);

    // Picking a restaurant suggestion stashes it for the map and navigates there (fly-to + spot
    // sheet). Locality picks would not navigate — this confirms the rows are restaurants.
    // `toHaveURL` polls the URL: the hand-off is an App Router soft navigation, which does not
    // fire a document "commit" for `waitForURL` to latch onto.
    await options.first().click();
    await expect(page).toHaveURL(/\/dashboard\/map/, { timeout: 90_000 });
  });

  test('discover typeahead: Escape dismisses the suggestions (keyboard)', async ({ page }) => {
    test.setTimeout(180_000);
    test.skip(!typeaheadQuery, 'No matchable restaurant name in the seeded DB for the typeahead.');
    await gotoDashboard(page, '/dashboard/discover');
    await expect(page.getByTestId('e2e-discover-view')).toBeVisible({ timeout: 45_000 });

    const searchInput = page.getByPlaceholder(/Search spots/i);
    await expect(searchInput).toBeVisible({ timeout: 45_000 });
    await searchInput.fill(typeaheadQuery as string);

    const listbox = page.getByRole('listbox', { name: /Spot search suggestions/i });
    await expect(listbox).toBeVisible({ timeout: 30_000 });

    // Escape (handled on the input's onKeyDown) closes the typeahead without navigating away.
    await searchInput.press('Escape');
    await expect(listbox).toBeHidden({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/dashboard\/discover/);
    // The query text is preserved — Escape only dismisses the suggestion popup.
    await expect(searchInput).toHaveValue(typeaheadQuery as string);
  });

  // ---- D2: Ask-AI (natural-language agent) hand-off --------------------------------------------
  test('discover Ask-AI: submitting a natural-language query hands off to the map without error', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await gotoDashboard(page, '/dashboard/discover');
    await expect(page.getByTestId('e2e-discover-view')).toBeVisible({ timeout: 45_000 });

    await page.getByRole('button', { name: /Switch to AI search/i }).click();
    const aiInput = page.getByPlaceholder(/Ask AI/i);
    await expect(aiInput).toBeVisible({ timeout: 15_000 });

    await aiInput.fill('cosy ramen for a rainy night');
    // Enter in AI mode fires `handleAiSearch`, which stashes the query and soft-navigates to the
    // map (the map runs the NL agent with viewport scoping). `toHaveURL` polls the URL through the
    // App Router soft navigation.
    await aiInput.press('Enter');
    await expect(page).toHaveURL(/\/dashboard\/map/, { timeout: 90_000 });

    // The NL agent path renders on the map: the app shell must survive (no crash / auth gate),
    // whether the agent returns results, an empty set, or a surfaced error message.
    await expectSignedInDashboardShell(page, { timeout: 45_000 });
  });

  // ---- Discover → Map filters round-trip -------------------------------------------------------
  test('discover: filter button opens the map with the filter sheet (?filters=open)', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await gotoDashboard(page, '/dashboard/discover');
    await expect(page.getByTestId('e2e-discover-view')).toBeVisible({ timeout: 45_000 });

    // The filter control is a RouterLink icon button (aria-label "Open map filters") that deep-links
    // to /dashboard/map?filters=open.
    const filterEntry = page
      .locator('a[aria-label="Open map filters"], button[aria-label="Open map filters"]')
      .first();
    await expect(filterEntry).toBeVisible({ timeout: 15_000 });
    await filterEntry.click();

    // The filter control is a RouterLink anchor → App Router soft navigation. Poll the URL with
    // `toHaveURL` (a `waitForURL({ waitUntil: 'commit' })` hangs here — soft navs fire no commit).
    await expect(page).toHaveURL(/\/dashboard\/map\?.*filters=open/, { timeout: 90_000 });
    // ?filters=open auto-opens the spot filter sheet (see map-filtering.spec.ts).
    await expect(page.getByText('Spot filters')).toBeVisible({ timeout: 45_000 });
  });

  test('roulette: spinning navigates to a restaurant or shows an empty-pool message', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await gotoDashboard(page, '/dashboard/roulette');

    const spin = page.getByRole('button', { name: /Spin the Noms/i });
    await expect(spin).toBeVisible({ timeout: 45_000 });
    // The button is disabled while the pool is still loading — wait until it's actionable.
    await expect(spin).toBeEnabled({ timeout: 45_000 });
    await spin.click();

    // Non-empty pool → router.push to /dashboard/restaurants/[id] after a ~1.4s spin.
    // Empty pool → the empty-pool copy renders in place. Either is a valid outcome.
    // Use waitUntil:'commit' so a slow restaurant-page compile doesn't mask the nav.
    const emptyPool = page.getByText(/No spots in the pool yet/i);
    await Promise.race([
      page.waitForURL(/\/dashboard\/restaurants\//, { timeout: 60_000, waitUntil: 'commit' }),
      emptyPool.waitFor({ state: 'visible', timeout: 60_000 }),
    ]);

    const onRestaurant = /\/dashboard\/restaurants\//.test(page.url());
    const isEmpty = await emptyPool.isVisible().catch(() => false);
    expect(onRestaurant || isEmpty, 'spin produced neither a restaurant nav nor empty-pool').toBe(
      true
    );
  });
});

/**
 * D1 — the location gate for a signed-in user with NO saved home locality. Seeds a fresh
 * onboarding-complete user with `home_locality_id = null` and drives the dashboard as that user
 * (its own browser context / session), so the server exercises the no-home path and the client
 * renders the market-context gate ("Change area") instead of crashing or bouncing to onboarding.
 */
test.describe('dashboard discover — no home location gate', () => {
  let seeded: SeededUser | null = null;

  test.beforeAll(async ({}, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
      return;
    }
    seeded = await createSeededUser('e2ediscover');
    await completeOnboardingWithoutHome(seeded.id);
  });

  test.afterAll(async () => {
    if (seeded) {
      await deleteSeededUser(seeded.id);
      seeded = null;
    }
  });

  async function openAsSeededUser(browser: Browser) {
    const storageState = await buildUserStorageState(
      (seeded as SeededUser).email,
      (seeded as SeededUser).password
    );
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    return { context, page };
  }

  test('discover renders the location gate (Change area) with no saved home', async ({ browser }) => {
    test.setTimeout(180_000);
    const { context, page } = await openAsSeededUser(browser);
    try {
      await page.goto('/dashboard/discover', { waitUntil: 'load', timeout: 120_000 });
      try {
        await expectSignedInDashboardShell(page, { timeout: 45_000 });
      } catch {
        await page.reload({ waitUntil: 'load', timeout: 120_000 });
        await expectSignedInDashboardShell(page, { timeout: 45_000 });
      }

      // Not bounced to onboarding (completed) and not the auth gate.
      await expect(page).toHaveURL(/\/dashboard\/discover/);
      await expect(page.getByTestId('e2e-discover-view')).toBeVisible({ timeout: 45_000 });

      // With no saved home, Discover still resolves a provisional market and shows the change-area
      // control — the same "Change area" affordance the feed empty-state offers. Either satisfies
      // the location gate. (The client may refine the market in the background via geolocation,
      // which is denied by default in this fresh context — the gate persists regardless.)
      await expect(page.getByRole('button', { name: /Change area/i }).first()).toBeVisible({
        timeout: 45_000,
      });
    } finally {
      await context.close();
    }
  });
});
