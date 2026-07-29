import { expect, test, type Page, type APIRequestContext } from '@playwright/test';

import { dashboardTestsDisabled } from '../support/skip-dashboard';
import { expectSignedInDashboardShell } from '../support/page-assertions';
import { E2E_DASHBOARD_AUTH_SETUP_HINT } from '../support/test-credentials';

/**
 * TEST-PLAN §7 D4/D5 — viewport refetch + a filter that changes the result set.
 * Complements map-filtering.spec.ts (sort toggle + clear-all).
 *
 * D4: a significant viewport change (>25% center shift OR zoom span ratio <0.6/>1.7)
 * surfaces the "Search this area" pill; clicking it re-scopes the fetch to the live
 * viewport and the pill dismisses. Zooming is the deterministic trigger: the initial
 * camera sits near world scale, where a half-screen drag shifts the center by only ~25%
 * of the bbox span (threshold-flaky), while two "Zoom in" clicks quarter the span.
 * D5: the min-rating slider (0–5, step 0.5) filters the spot list. Driving it to 5 via
 * keyboard (End) must never grow the row count; clearing filters restores the baseline.
 *
 * Result-set size is measured by counting rendered spot rows (one "Save to list" button
 * per row) inside the sheet's "NomNom List" list — the "(N)" heading badge only renders
 * in the single-following-list mode, so it can't be the anchor. The map route is the
 * heaviest cold compile in the app: warm it with an anonymous request first and retry
 * the navigation once (blank-page first paints happen under dev-server restarts).
 */

async function gotoMap(page: Page, request: APIRequestContext): Promise<void> {
  await request.get('/dashboard/map', { timeout: 180_000 }).catch(() => {});
  await page.goto('/dashboard/map', { waitUntil: 'domcontentloaded', timeout: 180_000 });
  try {
    await expectSignedInDashboardShell(page, { timeout: 45_000 });
  } catch {
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 180_000 });
    await expectSignedInDashboardShell(page, { timeout: 45_000 });
  }
}

/** Rendered spot rows in the sheet (0 when the list is empty or not rendered). */
async function countSpotRows(page: Page): Promise<number> {
  const list = page.getByRole('list', { name: 'NomNom List' }).first();
  if (!(await list.isVisible().catch(() => false))) return 0;
  return list.getByRole('button', { name: 'Save to list' }).count();
}

/**
 * The sheet streams rows in pages, so a single read mid-stream under-counts (observed
 * 120 vs a settled 160). Poll until two consecutive reads 3s apart agree before trusting
 * the number. `allowZero` covers the filtered state, which may legitimately empty the list.
 */
async function stableRowCount(page: Page, opts: { allowZero?: boolean } = {}): Promise<number> {
  let prev = -1;
  await expect
    .poll(
      async () => {
        const current = await countSpotRows(page);
        const settled = current === prev && (opts.allowZero ? current >= 0 : current > 0);
        prev = current;
        return settled;
      },
      {
        timeout: 120_000,
        intervals: [3_000],
        message: 'spot row count never stabilized',
      }
    )
    .toBe(true);
  return prev;
}

async function openFilterSheet(page: Page): Promise<void> {
  // The filter sheet's entry point on the map is the "More…" chip in the quick-filter row.
  await page.getByRole('button', { name: /More/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Spot filters' })).toBeVisible({
    timeout: 30_000,
  });
}

async function closeFilterSheet(page: Page): Promise<void> {
  // SheetCloseIconButton carries aria-label "Close" (the spot sheet's own close button uses
  // the distinct "Close spot details" label, so exact-match is unambiguous).
  await page.getByRole('button', { name: 'Close', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Spot filters' })).toHaveCount(0, {
    timeout: 15_000,
  });
}

test.describe('dashboard map — pan refetch + min-rating filter (D4/D5)', () => {
  test.beforeEach(({}, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
  });

  test('D4: zooming the viewport surfaces "Search this area" and clicking it refetches', async ({
    page,
    request,
  }) => {
    test.setTimeout(300_000);
    await gotoMap(page, request);
    await stableRowCount(page);

    // Two zoom-in steps quarter the bbox span (ratio 0.25 < the 0.6 arming threshold);
    // the pill reads the debounced (~450ms) post-animation bounds, so poll for it.
    const zoomIn = page.getByRole('button', { name: 'Zoom in' });
    await expect(zoomIn).toBeVisible({ timeout: 60_000 });
    await zoomIn.click();
    await page.waitForTimeout(1_000);
    await zoomIn.click();

    const searchAreaAnyState = page.getByRole('button', {
      name: /Search this area|Searching…/,
    });
    const searchAreaButton = page.getByRole('button', { name: 'Search this area' });
    await expect(searchAreaButton).toBeVisible({ timeout: 30_000 });

    await searchAreaButton.click();
    // The pill syncs pending→fetched and dismisses once the viewport-scoped refetch settles.
    await expect(searchAreaAnyState).toHaveCount(0, { timeout: 60_000 });
    // The shell stays coherent after the refetch (row count may legitimately change).
    await expectSignedInDashboardShell(page, { timeout: 30_000 });
  });

  test('D5: min-rating 5 never grows the result set; clear-all restores the baseline', async ({
    page,
    request,
  }) => {
    test.setTimeout(300_000);
    await gotoMap(page, request);
    const baseline = await stableRowCount(page);

    await openFilterSheet(page);
    const slider = page.getByRole('slider').first();
    await expect(slider).toBeVisible({ timeout: 30_000 });
    await slider.focus();
    await page.keyboard.press('End');
    // The filter registered: the sheet now offers "Clear all filters".
    await expect(page.getByRole('button', { name: 'Clear all filters' })).toBeVisible({
      timeout: 15_000,
    });
    await closeFilterSheet(page);

    // Filtered result set can only shrink (or stay, if every spot is 5★) — never grow.
    const filtered = await stableRowCount(page, { allowZero: true });
    expect(filtered).toBeLessThanOrEqual(baseline);

    // Clear all filters → the unfiltered fetch brings the rows back to (at least) baseline.
    await openFilterSheet(page);
    await page.getByRole('button', { name: 'Clear all filters' }).click();
    await closeFilterSheet(page);

    const restored = await stableRowCount(page);
    expect(restored).toBeGreaterThanOrEqual(filtered);
    expect(restored).toBeGreaterThanOrEqual(baseline);
  });
});
