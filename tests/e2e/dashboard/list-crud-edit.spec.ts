import { expect, test } from '@playwright/test';

import { loadE2EEnv } from '../load-env';
import { dashboardTestsDisabled } from '../support/skip-dashboard';
import { getServiceRoleClient, getUserIdByEmail } from '../support/supabase-service';
import {
  E2E_DASHBOARD_AUTH_SETUP_HINT,
  getE2ETestUserEmailForDb,
} from '../support/test-credentials';

/**
 * Full list CRUD with variations: create → rename (Details/Save) → change visibility to
 * Public (Audience/Save) → delete, each verified against Postgres. Complements
 * lists-mutations.spec.ts (create+delete only) with the update paths.
 */
test.describe.configure({ mode: 'serial' });

test.describe('dashboard lists — edit (update) with DB checks', () => {
  test.beforeEach(({}, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
  });

  test('create → rename → change visibility → delete', async ({ page }) => {
    // Generous: cold-compiles both /dashboard/lists and /dashboard/lists/[id]/manage.
    test.setTimeout(300_000);
    loadE2EEnv();
    const email = await getE2ETestUserEmailForDb();
    const userId = await getUserIdByEmail(email);
    if (!userId) throw new Error(`No public.users row for ${email}`);
    const admin = getServiceRoleClient();

    const name = `E2E CRUD ${Date.now()}`;
    const renamed = `${name} edited`;

    // --- Create via UI ---
    await page.goto('/dashboard/lists', { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.getByTestId('e2e-lists-new').click();
    await page.getByTestId('e2e-create-list-name').fill(name);
    await page.getByTestId('e2e-create-list-submit').click();

    const tile = page.getByRole('link', { name }).first();
    await expect(tile).toBeVisible({ timeout: 30_000 });
    const href = await tile.getAttribute('href');
    const listId = href?.match(/\/lists\/([0-9a-f-]{36})/i)?.[1];
    expect(listId).toBeTruthy();

    // --- Rename via Details tab ---
    await page.goto(`/dashboard/lists/${listId}/manage`, {
      waitUntil: 'domcontentloaded',
      timeout: 180_000,
    });
    // Details is the default tab; the name field label is "List name".
    const nameField = page.getByLabel('List name');
    await expect(nameField).toBeVisible({ timeout: 45_000 });
    await nameField.fill(renamed);
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    await expect
      .poll(
        async () => {
          const { data } = await admin.from('lists').select('name').eq('id', listId).maybeSingle();
          return data?.name;
        },
        { timeout: 20_000, message: 'list name did not persist' }
      )
      .toBe(renamed);

    // --- Change visibility to Public via Audience tab ---
    await page.getByRole('tab', { name: 'Audience' }).click();
    // MUI `TextField select` exposes a role=combobox (getByLabel would resolve the hidden
    // native input, which isn't clickable). Options are Public / Private / Subscribers.
    const visibilitySelect = page.getByRole('combobox', { name: /Who can find this list/i });
    await expect(visibilitySelect).toBeVisible({ timeout: 15_000 });
    await visibilitySelect.click();
    // Anchor on the option's leading primary label — descriptions mention "public" too.
    await page.getByRole('option', { name: /^Public/ }).click();
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    await expect
      .poll(
        async () => {
          const { data } = await admin
            .from('lists')
            .select('visibility')
            .eq('id', listId)
            .maybeSingle();
          return data?.visibility;
        },
        { timeout: 20_000, message: 'visibility did not persist' }
      )
      .toBe('public');

    // --- Delete via Delete tab ---
    await page.getByTestId('e2e-list-tab-delete').click();
    await page.getByTestId('e2e-list-delete-open').click();
    await page.getByTestId('e2e-delete-confirm').click();

    await expect(page).toHaveURL(/\/dashboard\/lists$/, { timeout: 30_000 });
    const { data: after } = await admin.from('lists').select('id').eq('id', listId).maybeSingle();
    expect(after).toBeNull();
  });
});
