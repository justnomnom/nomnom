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
 * Onboarding wizard happy path (TEST-PLAN §2, O3 + O6 + O8).
 *
 * Two gated steps: welcome → city. Tags/creators live on Discover, not in the wizard.
 * Each test seeds an onboarding-incomplete user and opens a fresh browser context.
 */

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3032';

/** Wizard step CTAs / headings (en.json → pages.onboarding). */
const CTA_WELCOME = "Let’s NomNom!";
const CTA_LOCATION = 'Show me spots';

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

test.describe('onboarding wizard — happy path', () => {
  test.beforeEach(({}, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
  });

  test('O3/O6: welcome + city, back-nav preserves selection, lands on Discover', async ({
    browser,
  }) => {
    test.setTimeout(300_000);
    loadE2EEnv();
    const admin = getServiceRoleClient();

    const user = await createOnboardingIncompleteUser();
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

      await page.getByRole('button', { name: CTA_WELCOME }).click();

      await pickFirstLocality(page);
      const locationCta = page.getByRole('button', { name: CTA_LOCATION });
      await expect(locationCta).toBeEnabled();

      // Gated wizard is welcome + location only — no tags/creators steps.
      await expect(page.getByRole('button', { name: 'Keep going' })).toHaveCount(0);
      await expect(page.getByRole('heading', { name: /Who’s your hero/i })).toHaveCount(0);

      // O6 — back to welcome, then forward: city chip still selected.
      await page.getByRole('button', { name: 'Back' }).click();
      await expect(page.getByRole('button', { name: CTA_WELCOME })).toBeVisible({ timeout: 30_000 });
      await page.getByRole('button', { name: CTA_WELCOME }).click();
      await expect(locationCta).toBeVisible({ timeout: 30_000 });
      await expect(locationCta).toBeEnabled();
      await expect(page.locator('.MuiChip-root').first()).toBeVisible();

      await locationCta.click();
      await expect(page).toHaveURL(/\/dashboard\/discover/, { timeout: 120_000 });

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

      await expect(page.getByTestId('e2e-activation-checklist')).toBeVisible({ timeout: 45_000 });
      const suggested = page.getByTestId('e2e-suggested-creators');
      if (await suggested.isVisible().catch(() => false)) {
        await expect(suggested).toBeVisible();
      }
    } finally {
      await context.close();
      await deleteOnboardingUserData(user.id);
      if (seededCreator) await deleteSuggestedCreator(creator.id);
      await deleteSeededUser(creator.id);
      await deleteSeededUser(user.id);
    }
  });

  test('O8: refresh mid-wizard restores the location step', async ({ browser }) => {
    test.setTimeout(240_000);
    loadE2EEnv();

    const user = await createOnboardingIncompleteUser();
    const context = await newAuthedContext(browser, user);
    const page = await context.newPage();

    try {
      await openWizard(page);

      await page.getByRole('button', { name: CTA_WELCOME }).click();
      await pickFirstLocality(page);
      await expect(page.getByRole('button', { name: CTA_LOCATION })).toBeVisible({ timeout: 45_000 });

      await page.reload({ waitUntil: 'domcontentloaded', timeout: 180_000 });
      await expect(page.getByRole('button', { name: CTA_LOCATION })).toBeVisible({ timeout: 60_000 });
      await expect(page.getByRole('combobox', { name: 'Locations' })).toBeVisible();
      await expect(page.getByRole('button', { name: CTA_WELCOME })).toHaveCount(0);
    } finally {
      await context.close();
      await deleteOnboardingUserData(user.id);
      await deleteSeededUser(user.id);
    }
  });
});
