import { type Page, type Browser, type BrowserContext, expect, test } from '@playwright/test';

import { loadE2EEnv } from '../load-env';
import { dashboardTestsDisabled } from '../support/skip-dashboard';
import { getServiceRoleClient } from '../support/supabase-service';
import {
  type SeededUser,
  buildUserStorageState,
  createSeededUser,
  deleteSeededUser,
  seedSuggestedCreator,
  deleteSuggestedCreator,
  deleteOnboardingUserData,
  createOnboardingIncompleteUser,
} from '../support/seed';
import { E2E_DASHBOARD_AUTH_SETUP_HINT } from '../support/test-credentials';

/**
 * Onboarding wizard happy path (TEST-PLAN §2, O3 + O6 + O7 load + O8).
 *
 * The shared dashboard user has already completed onboarding (and the dashboard project's
 * storage state signs in as them), so each test here seeds its own onboarding-incomplete user
 * and opens a fresh browser context authenticated as that user — overriding the project's
 * storage state — then drives all four wizard steps and asserts the persisted rows.
 */

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3032';

/** Wizard step CTAs / headings (en.json → pages.onboarding). */
const CTA_WELCOME = "Let’s NomNom!";
const CTA_LOCATION = 'Almost there';
const CTA_TAGS = 'Keep going';
const CTA_CREATORS = "Let’s NomNom!";
const CTA_ENTER = 'Enter NomNom';

test.describe.configure({ mode: 'serial' });

async function newAuthedContext(browser: Browser, user: SeededUser): Promise<BrowserContext> {
  const storageState = await buildUserStorageState(user.email, user.password);
  return browser.newContext({ baseURL, storageState });
}

async function openWizard(page: Page): Promise<void> {
  await page.goto('/onboarding', { waitUntil: 'domcontentloaded', timeout: 180_000 });
  // First dev-server compile of the onboarding route can outlast the client hydration.
  try {
    await expect(page.getByRole('button', { name: CTA_WELCOME })).toBeVisible({ timeout: 45_000 });
  } catch {
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 180_000 });
    await expect(page.getByRole('button', { name: CTA_WELCOME })).toBeVisible({ timeout: 45_000 });
  }
}

/** Location step: open the "Locations" autocomplete, pick the first locality, close the popup. */
async function pickFirstLocality(page: Page): Promise<void> {
  const combo = page.getByRole('combobox', { name: 'Locations' });
  await expect(combo).toBeVisible({ timeout: 45_000 });
  await combo.click();
  const firstOption = page.getByRole('option').first();
  await expect(firstOption).toBeVisible({ timeout: 15_000 });
  await firstOption.click();
  // multiple + disableCloseOnSelect keeps the listbox open — close it so it doesn't cover the CTA.
  await page.keyboard.press('Escape');
  // Selection renders as a Chip and enables the primary CTA.
  await expect(page.locator('.MuiChip-root').first()).toBeVisible();
}

/** Tags step: open the first category picker, select the first tag, close the popup. */
async function pickFirstTag(page: Page): Promise<void> {
  // The picker is a client-only dynamic import (skeleton first). Its category inputs are comboboxes.
  const combo = page.getByRole('combobox').first();
  await expect(combo).toBeVisible({ timeout: 45_000 });
  await combo.click();
  const firstOption = page.getByRole('option').first();
  await expect(firstOption).toBeVisible({ timeout: 15_000 });
  await firstOption.click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.MuiChip-root').first()).toBeVisible();
}

test.describe('onboarding wizard — happy path', () => {
  test.beforeEach(({}, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
  });

  test('O3/O6: drive all four steps, back-nav preserves selection, rows persist', async ({
    browser,
  }) => {
    test.setTimeout(300_000);
    loadE2EEnv();
    const admin = getServiceRoleClient();

    const user = await createOnboardingIncompleteUser();
    // A separate seeded user in the global suggested-creators pool guarantees a followable card.
    // Curated-table columns vary per environment; if seeding fails, fall back to the ambient pool.
    const creator = await createSeededUser('e2ecreator');
    let seededCreator = false;
    try {
      await seedSuggestedCreator(creator.id, { subtitle: 'E2E creator' });
      seededCreator = true;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(`[onboarding-happy-path] suggested creator seed skipped: ${(e as Error).message}`);
    }

    const context = await newAuthedContext(browser, user);
    const page = await context.newPage();

    try {
      await openWizard(page);

      // Step 1 — welcome.
      await page.getByRole('button', { name: CTA_WELCOME }).click();

      // Step 2 — location.
      await pickFirstLocality(page);
      const locationCta = page.getByRole('button', { name: CTA_LOCATION });
      await expect(locationCta).toBeEnabled();
      await locationCta.click();

      // Step 3 — tags.
      await expect(page.getByRole('button', { name: CTA_TAGS })).toBeVisible({ timeout: 45_000 });
      await pickFirstTag(page);

      // O6 — back navigation preserves the location selection.
      await page.getByRole('button', { name: 'Back' }).click();
      await expect(locationCta).toBeVisible({ timeout: 30_000 });
      await expect(locationCta).toBeEnabled();
      await expect(page.locator('.MuiChip-root').first()).toBeVisible();
      // Forward again into tags — the tag chip should have survived the round-trip.
      await locationCta.click();
      const tagsCta = page.getByRole('button', { name: CTA_TAGS });
      await expect(tagsCta).toBeVisible({ timeout: 45_000 });
      await expect(page.locator('.MuiChip-root').first()).toBeVisible();
      await tagsCta.click();

      // Step 4 — suggested creators. Follow the first followable card.
      await expect(page.getByRole('button', { name: CTA_CREATORS })).toBeVisible({ timeout: 45_000 });
      const followButton = page.getByRole('button', { name: 'Follow', exact: true }).first();
      await expect(followButton).toBeVisible({ timeout: 45_000 });
      await followButton.click();
      await expect(page.getByRole('button', { name: 'Following', exact: true }).first()).toBeVisible();

      // Finish — saveOnboardingFollows + completeOnboarding. The wizard router.replace()s
      // straight to /dashboard/discover after completing (onboarding-wizard.js), so either
      // the transient "Enter NomNom" payoff renders or we are already on Discover.
      await page.getByRole('button', { name: CTA_CREATORS }).click();
      const enterCta = page.getByRole('button', { name: CTA_ENTER });
      await Promise.race([
        enterCta.waitFor({ state: 'visible', timeout: 60_000 }),
        page.waitForURL(/\/dashboard\/discover/, { timeout: 60_000 }),
      ]);

      // Persisted rows (poll — server actions complete just before the Done step renders).
      await expect
        .poll(
          async () => {
            const { data } = await admin
              .from('users')
              .select('onboarding_completed_at, home_locality_id')
              .eq('id', user.id)
              .maybeSingle();
            return {
              completed: Boolean(data?.onboarding_completed_at),
              hasLocality: Boolean(data?.home_locality_id),
            };
          },
          { timeout: 30_000, message: 'onboarding_completed_at / home_locality_id not persisted' }
        )
        .toEqual({ completed: true, hasLocality: true });

      const countFor = async (table: string, column: string) => {
        const { count } = await admin
          .from(table)
          .select('*', { count: 'exact', head: true })
          .eq(column, user.id);
        return count ?? 0;
      };

      expect(await countFor('user_location_follows', 'user_id')).toBeGreaterThanOrEqual(1);
      expect(await countFor('user_restaurant_tag_preferences', 'user_id')).toBeGreaterThanOrEqual(1);
      expect(await countFor('user_follows', 'follower_id')).toBeGreaterThanOrEqual(1);

      // Enter the app — lands on Discover (clicking through only if the payoff step rendered).
      if (await enterCta.isVisible().catch(() => false)) {
        await enterCta.click();
      }
      await expect(page).toHaveURL(/\/dashboard\/discover/, { timeout: 45_000 });
    } finally {
      await context.close();
      await deleteOnboardingUserData(user.id);
      if (seededCreator) await deleteSuggestedCreator(creator.id);
      await deleteSeededUser(creator.id);
      await deleteSeededUser(user.id);
    }
  });

  test('O8: refresh mid-wizard restores the current step', async ({ browser }) => {
    test.setTimeout(240_000);
    loadE2EEnv();

    const user = await createOnboardingIncompleteUser();
    const context = await newAuthedContext(browser, user);
    const page = await context.newPage();

    try {
      await openWizard(page);

      // Advance to the tags step (draft persisted to localStorage keyed by the user id).
      await page.getByRole('button', { name: CTA_WELCOME }).click();
      await pickFirstLocality(page);
      await page.getByRole('button', { name: CTA_LOCATION }).click();
      await expect(page.getByRole('button', { name: CTA_TAGS })).toBeVisible({ timeout: 45_000 });

      // Refresh — the wizard restores to the tags step, not back to welcome.
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 180_000 });
      await expect(page.getByRole('button', { name: CTA_TAGS })).toBeVisible({ timeout: 60_000 });
      await expect(page.getByRole('button', { name: CTA_WELCOME })).toHaveCount(0);
    } finally {
      await context.close();
      await deleteOnboardingUserData(user.id);
      await deleteSeededUser(user.id);
    }
  });
});
