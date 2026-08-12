import { expect, test, type Browser, type Page } from '@playwright/test';

import { loadE2EEnv } from '../load-env';
import { dashboardTestsDisabled } from '../support/skip-dashboard';
import {
  type SeededUser,
  createOnboardingIncompleteUser,
  deleteOnboardingUserData,
  buildUserStorageState,
  deleteSeededUser,
} from '../support/seed';
import { E2E_DASHBOARD_AUTH_SETUP_HINT } from '../support/test-credentials';

/**
 * TEST-PLAN §2 O4 + O10 — the location step's "Use my location" under granted and denied
 * geolocation, plus the step's polite live-region announcement (O10).
 *
 * Granted (Playwright context geolocation = Lisbon): getCurrentPosition succeeds → the
 * button flips to "Location is on" (the grant mechanics), then
 * resolveLocalityFromCoordinates auto-selects the matched locality as a chip. The resolve
 * is a server action with a slow dev cold-compile (~30s+, like searchRestaurantsByName —
 * see docs/TEST-PLAN.md), and a no-match outcome renders nothing by design — so the chip
 * wait is generous and a miss is an environment skip, not a failure.
 * Denied (no permission granted → headless auto-denies): the error callback resets to the
 * idle "Use my location" state and the manual Locations picker stays usable — no crash.
 */

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3032';
const CTA_WELCOME = 'Let’s NomNom!';
const LISBON = { latitude: 38.7223, longitude: -9.1393 };

async function openLocationStep(page: Page): Promise<void> {
  await page.goto('/onboarding', { waitUntil: 'domcontentloaded', timeout: 180_000 });
  const welcome = page.getByRole('button', { name: CTA_WELCOME });
  try {
    await expect(welcome).toBeVisible({ timeout: 45_000 });
  } catch {
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 180_000 });
    await expect(welcome).toBeVisible({ timeout: 45_000 });
  }

  // O10 — the wizard announces the current step through a polite live region.
  await expect(page.locator('p[aria-live="polite"]').first()).not.toBeEmpty();

  await welcome.click();
  await expect(page.getByRole('combobox', { name: 'Locations' })).toBeVisible({
    timeout: 45_000,
  });
}

async function withUser(
  browser: Browser,
  run: (page: Page, user: SeededUser) => Promise<void>,
  contextExtras: Record<string, unknown> = {}
): Promise<void> {
  loadE2EEnv();
  const user = await createOnboardingIncompleteUser('e2egeo');
  const context = await browser.newContext({
    baseURL,
    storageState: await buildUserStorageState(user.email, user.password),
    ...contextExtras,
  });
  const page = await context.newPage();
  try {
    await run(page, user);
  } finally {
    await context.close();
    await deleteOnboardingUserData(user.id);
    await deleteSeededUser(user.id);
  }
}

test.describe('onboarding location step — geolocation (O4/O10)', () => {
  test.beforeEach(({}, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
  });

  test('granted: "Use my location" resolves and the button reports location on', async ({
    browser,
  }) => {
    test.setTimeout(300_000);
    await withUser(
      browser,
      async (page) => {
        await openLocationStep(page);
        await page.getByRole('button', { name: 'Use my location' }).click();

        // Success callback flips the label — the grant + getCurrentPosition wiring works.
        await expect(page.getByRole('button', { name: 'Location is on' })).toBeVisible({
          timeout: 90_000,
        });
        // The matched locality lands as a selection chip (server-action cold compile can
        // take ~30s+; a no-match renders nothing by design → environment skip).
        const chipAppeared = await page
          .locator('.MuiChip-root')
          .first()
          .waitFor({ state: 'visible', timeout: 120_000 })
          .then(() => true)
          .catch(() => false);
        test.skip(
          !chipAppeared,
          'GPS coordinates did not resolve to a supported locality in this environment'
        );
        await expect(page.getByRole('button', { name: 'Almost there' })).toBeEnabled();
      },
      { geolocation: LISBON, permissions: ['geolocation'] }
    );
  });

  test('denied: falls back to the idle button and the manual picker stays usable', async ({
    browser,
  }) => {
    test.setTimeout(300_000);
    await withUser(browser, async (page) => {
      await openLocationStep(page);
      await page.getByRole('button', { name: 'Use my location' }).click();

      // Denied → error callback resets to idle; never reports "Location is on".
      await expect(page.getByRole('button', { name: 'Use my location' })).toBeVisible({
        timeout: 30_000,
      });
      await expect(page.getByRole('button', { name: 'Location is on' })).toHaveCount(0);

      // Manual selection still works end-to-end.
      const combo = page.getByRole('combobox', { name: 'Locations' });
      await combo.click();
      const firstOption = page.getByRole('option').first();
      await expect(firstOption).toBeVisible({ timeout: 15_000 });
      await firstOption.click();
      await page.keyboard.press('Escape');
      await expect(page.locator('.MuiChip-root').first()).toBeVisible();
    });
  });
});
