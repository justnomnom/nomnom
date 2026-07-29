import { devices, expect, test } from '@playwright/test';

import {
  expectAppShellMainVisible,
  gotoMarketingHomeStable,
  MOBILE_NAV_TRIGGER_NAME,
} from '../support/page-assertions';
import { hasServiceRoleCredentials } from '../support/service-role';
import { getAnyListId, getAnyRestaurantId } from '../support/supabase-service';

/**
 * Emulated-viewport half of the Capacitor per-release smoke pass (TEST-PLAN.md §14,
 * runbook: docs/mobile-smoke-runbook.md). The native shell loads the hosted site
 * through `server.url`, so these checks prove the *web layer* won't sabotage the
 * on-device smoke: safe-area is wired, phone widths don't overflow, deep-link
 * target routes resolve, and header touch targets meet 44px. They do NOT replace
 * the manual device pass (cold start / auth-restart / OS deep link / real notch
 * insets / hardware back) — see the runbook's coverage matrix.
 *
 * Runs in the `public` project (unauthenticated) using a phone device preset.
 */
test.use({ ...devices['Pixel 5'] });

/** Serial so the first home load warms webpack before later cases reuse `/`. */
test.describe.configure({ mode: 'serial' });

const ROUTE_GOTO = { waitUntil: 'domcontentloaded' as const, timeout: 120_000 };

/** Reuses the qa-app-checklist "no horizontal scroll at 320px" rule. 1px rounding tolerance. */
async function expectNoHorizontalOverflow(page: import('@playwright/test').Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const el = document.documentElement;
    return el.scrollWidth - el.clientWidth;
  });
  expect(overflow, 'document should not scroll horizontally at this width').toBeLessThanOrEqual(1);
}

test.describe('mobile smoke — safe-area wiring', () => {
  test('viewport meta enables safe-area insets (viewport-fit=cover)', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 120_000 });
    const content = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(content, 'viewport-fit=cover is the prerequisite for env(safe-area-inset-*) on notched devices').toMatch(
      /viewport-fit=cover/
    );
  });
});

test.describe('mobile smoke — no horizontal overflow', () => {
  for (const width of [320, 390]) {
    test(`home shell does not overflow at ${width}px`, async ({ page }) => {
      test.setTimeout(240_000);
      await page.setViewportSize({ width, height: 780 });
      await gotoMarketingHomeStable(page);
      await expectNoHorizontalOverflow(page);
    });
  }
});

test.describe('mobile smoke — header touch targets', () => {
  test('mobile nav trigger is >= 44x44', async ({ page }) => {
    test.setTimeout(240_000);
    await gotoMarketingHomeStable(page);
    const menuButton = page.getByRole('button', { name: MOBILE_NAV_TRIGGER_NAME });
    await expect(menuButton).toBeVisible();
    const box = await menuButton.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });
});

/**
 * Deep-link destinations at a phone viewport — the same routes a native `appUrlOpen`
 * resolves to. Skips cleanly without service-role creds / DB rows (mirrors deep-links.spec.ts).
 */
test.describe('mobile smoke — deep-link targets render', () => {
  test.beforeEach(({}, testInfo) => {
    if (!hasServiceRoleCredentials()) {
      testInfo.skip(true, 'Set E2E_SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY for DB sample lookups');
    }
  });

  test('public restaurant page renders on a phone', async ({ page }) => {
    test.setTimeout(180_000);
    const id = await getAnyRestaurantId();
    test.skip(!id, 'No rows in public.restaurants — seed data or skip');

    await page.goto(`/restaurants/${id}`, ROUTE_GOTO);
    await expectAppShellMainVisible(page, { timeout: 45_000 });
    await expectNoHorizontalOverflow(page);
  });

  test('public list page renders on a phone', async ({ page }) => {
    test.setTimeout(180_000);
    const id = await getAnyListId();
    test.skip(!id, 'No rows in public.lists — create a list or skip');

    await page.goto(`/lists/${id}`, ROUTE_GOTO);
    await expectAppShellMainVisible(page, { timeout: 45_000 });
    await expectNoHorizontalOverflow(page);
  });
});
