import { expect, test } from '@playwright/test';

import { loadE2EEnv } from '../load-env';
import { dashboardTestsDisabled } from '../support/skip-dashboard';
import { hasServiceRoleCredentials } from '../support/service-role';
import { getUserIdByEmail, getServiceRoleClient } from '../support/supabase-service';
import {
  E2E_DASHBOARD_AUTH_SETUP_HINT,
  getE2ETestUserEmailForDb,
} from '../support/test-credentials';

/**
 * TEST-PLAN §10 S2 — tag preferences stay editable after onboarding. Toggles one tag on
 * /dashboard/settings/preferences, saves, asserts the user_restaurant_tag_preferences rows
 * changed by exactly that one tag in Postgres, then toggles it back and asserts the original
 * row set is restored — deterministic regardless of the shared user's current selection.
 *
 * Picker mechanics (restaurant-tag-preference-picker.js): one MUI Autocomplete per tag
 * category; options are checkbox rows in a listbox; clicking a selected option REMOVES it.
 * The header "Save" button (settings-tag-preferences-page.js) persists via the
 * saveUserRestaurantTagPreferences server action, then router.refresh()es.
 */
test.describe('dashboard settings — tag preferences edit (S2)', () => {
  test.beforeEach(({}, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
    if (!hasServiceRoleCredentials()) {
      testInfo.skip(true, 'Service role needed to assert user_restaurant_tag_preferences rows');
    }
  });

  test('toggle a tag → row set changes by one; toggle back → original restored', async ({
    page,
  }) => {
    test.setTimeout(240_000);
    loadE2EEnv();
    const admin = getServiceRoleClient();
    const userId = await getUserIdByEmail(await getE2ETestUserEmailForDb());
    test.skip(!userId, 'Could not resolve the shared E2E user id from email');
    if (!userId) return;

    const readTagIds = async (): Promise<Set<string>> => {
      const { data, error } = await admin
        .from('user_restaurant_tag_preferences')
        .select('tag_id')
        .eq('user_id', userId);
      if (error) throw new Error(`read tag prefs failed: ${error.message}`);
      return new Set((data ?? []).map((r) => r.tag_id as string));
    };
    const symmetricDiff = (a: Set<string>, b: Set<string>) =>
      [...a].filter((x) => !b.has(x)).concat([...b].filter((x) => !a.has(x)));

    const before = await readTagIds();

    await page.goto('/dashboard/settings/preferences', {
      waitUntil: 'domcontentloaded',
      timeout: 180_000,
    });
    await expect(page.getByRole('heading', { name: 'Food & vibe preferences' })).toBeVisible({
      timeout: 60_000,
    });

    // Shared app chrome exposes `#main-content` (see support/page-assertions.ts); auth-less
    // fallback to the landmark keeps the scope tight so a header search can't shadow the picker.
    const mainRegion = page.locator('#main-content').or(page.getByRole('main')).first();

    const toggleFirstOptionInFirstCategory = async (): Promise<string> => {
      // The picker is client-only (skeleton first) — wait for a category combobox.
      const combo = mainRegion.getByRole('combobox').first();
      await expect(combo).toBeVisible({ timeout: 60_000 });
      await combo.click();
      const firstOption = page.getByRole('option').first();
      await expect(firstOption).toBeVisible({ timeout: 15_000 });
      const label = (await firstOption.innerText()).trim();
      await firstOption.click();
      await page.keyboard.press('Escape');
      return label;
    };

    const save = async () => {
      const saveButton = page.getByRole('button', { name: 'Save', exact: true });
      await expect(saveButton).toBeEnabled({ timeout: 15_000 });
      await saveButton.click();
      // While saving the button collapses to a spinner (aria-busy); wait for it back.
      await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible({
        timeout: 45_000,
      });
    };

    const toggledLabel = await toggleFirstOptionInFirstCategory();
    await save();

    await expect
      .poll(async () => symmetricDiff(await readTagIds(), before).length, {
        timeout: 30_000,
        message: 'expected exactly one tag row to differ after the first save',
      })
      .toBe(1);

    // Restore: toggle the same option (by its label) and save again.
    const combo = mainRegion.getByRole('combobox').first();
    await combo.click();
    const sameOption = page.getByRole('option', { name: toggledLabel }).first();
    await expect(sameOption).toBeVisible({ timeout: 15_000 });
    await sameOption.click();
    await page.keyboard.press('Escape');
    await save();

    await expect
      .poll(async () => symmetricDiff(await readTagIds(), before).length, {
        timeout: 30_000,
        message: 'expected the original tag rows to be restored after the second save',
      })
      .toBe(0);
  });
});
