import { expect, test } from '@playwright/test';

import { loadE2EEnv } from '../load-env';
import { dashboardTestsDisabled } from '../support/skip-dashboard';
import { getServiceRoleClient } from '../support/supabase-service';
import {
  createOnboardingIncompleteUser,
  deleteOnboardingUserData,
  buildUserStorageState,
  deleteSeededUser,
} from '../support/seed';
import { E2E_DASHBOARD_AUTH_SETUP_HINT } from '../support/test-credentials';

/**
 * TEST-PLAN §2 O5 — the wizard's header "Skip" (visible from the location step onward)
 * calls completeOnboarding() directly and router.replace()s to Discover: onboarding must
 * complete with NO locality, tags, or follows persisted. Complements
 * onboarding-happy-path.spec.ts, which drives all four steps.
 */

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3032';
const CTA_WELCOME = 'Let’s NomNom!';

test.describe('onboarding wizard — skip completes with optional steps empty (O5)', () => {
  test.beforeEach(({}, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
  });

  test('skip from the location step → discover; completed flag set, no optional rows', async ({
    browser,
    request,
  }) => {
    test.setTimeout(300_000);
    loadE2EEnv();
    const admin = getServiceRoleClient();

    // Dev-only: warm the redirect destination so the post-skip router.replace() isn't
    // stalled by a cold route compile (see docs/TEST-PLAN.md “Dev-only navigation caveat”).
    await request.get('/dashboard/discover', { timeout: 180_000 }).catch(() => {});

    const user = await createOnboardingIncompleteUser('e2eskip');
    const context = await browser.newContext({
      baseURL,
      storageState: await buildUserStorageState(user.email, user.password),
    });
    const page = await context.newPage();

    try {
      await page.goto('/onboarding', { waitUntil: 'domcontentloaded', timeout: 180_000 });
      const welcomeCta = page.getByRole('button', { name: CTA_WELCOME });
      try {
        await expect(welcomeCta).toBeVisible({ timeout: 45_000 });
      } catch {
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 180_000 });
        await expect(welcomeCta).toBeVisible({ timeout: 45_000 });
      }

      // The header (Back / progress / Skip) only renders past the welcome step.
      await welcomeCta.click();
      const skipButton = page.getByRole('button', { name: 'Skip' });
      await expect(skipButton).toBeVisible({ timeout: 30_000 });
      await skipButton.click();

      // completeOnboarding() then router.replace(discover) — a soft navigation; poll the URL.
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
              homeLocality: data?.home_locality_id ?? null,
            };
          },
          { timeout: 30_000, message: 'onboarding_completed_at not persisted after skip' }
        )
        .toEqual({ completed: true, homeLocality: null });

      const countFor = async (table: string, column: string) => {
        const { count } = await admin
          .from(table)
          .select('*', { count: 'exact', head: true })
          .eq(column, user.id);
        return count ?? 0;
      };
      expect(await countFor('user_restaurant_tag_preferences', 'user_id')).toBe(0);
      expect(await countFor('user_follows', 'follower_id')).toBe(0);
      expect(await countFor('user_location_follows', 'user_id')).toBe(0);
    } finally {
      await context.close();
      await deleteOnboardingUserData(user.id);
      await deleteSeededUser(user.id);
    }
  });
});
