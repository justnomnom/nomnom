import { expect, test } from '@playwright/test';

import { loadE2EEnv } from '../load-env';
import { dashboardTestsDisabled } from '../support/skip-dashboard';
import { getServiceRoleClient, getUserIdByEmail } from '../support/supabase-service';
import {
  E2E_DASHBOARD_AUTH_SETUP_HINT,
  getE2ETestUserEmailForDb,
} from '../support/test-credentials';

test.describe.configure({ mode: 'serial' });

test.describe('dashboard lists — create & delete with DB checks', () => {
  test.beforeEach(({ }, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
  });

  test('create list via UI; assert row in Postgres; delete via UI; assert row gone', async ({
    page,
  }) => {
    test.setTimeout(240_000);
    loadE2EEnv();
    const email = await getE2ETestUserEmailForDb();

    const userId = await getUserIdByEmail(email);
    if (!userId) {
      throw new Error(`No public.users row for ${email} — ensure the test user has signed in once.`);
    }

    const admin = getServiceRoleClient();
    const name = `E2E List ${Date.now()}`;

    await page.goto('/dashboard/lists', { waitUntil: 'domcontentloaded', timeout: 180_000 });
    const newListBtn = page.getByTestId('e2e-lists-new');
    try {
      await expect(newListBtn).toBeVisible({ timeout: 45_000 });
    } catch {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 180_000 });
      await expect(newListBtn).toBeVisible({ timeout: 45_000 });
    }
    await newListBtn.click();
    await page.getByTestId('e2e-create-list-name').fill(name);
    await page.getByTestId('e2e-create-list-submit').click();

    // The dashboard inserts the new list card in place (onCreated + router.refresh) rather
    // than navigating to the detail page; the tile is a link whose href carries the new id.
    const newTile = page.getByRole('link', { name }).first();
    await expect(newTile).toBeVisible({ timeout: 30_000 });
    const href = await newTile.getAttribute('href');
    const listId = href?.match(/\/lists\/([0-9a-f-]{36})/i)?.[1];
    expect(listId).toBeTruthy();

    const { data: row, error } = await admin
      .from('lists')
      .select('id, name, user_id')
      .eq('id', listId)
      .maybeSingle();
    expect(error).toBeNull();
    expect(row?.name).toBe(name);
    expect(row?.user_id).toBe(userId);

    await page.goto(`/dashboard/lists/${listId}/manage`, {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });
    await page.getByTestId('e2e-list-tab-delete').click();
    await page.getByTestId('e2e-list-delete-open').click();
    await page.getByTestId('e2e-delete-confirm').click();

    await expect(page).toHaveURL(/\/dashboard\/lists$/, { timeout: 30_000 });

    const { data: after } = await admin.from('lists').select('id').eq('id', listId).maybeSingle();
    expect(after).toBeNull();
  });
});
