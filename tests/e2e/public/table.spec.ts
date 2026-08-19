import { createServerClient } from '@supabase/ssr';
import { expect, test } from '@playwright/test';

import { loadE2EEnv } from '../load-env';
import {
  buildUserStorageState,
  createOwnedList,
  deleteList,
  deleteRestaurants,
  publishList,
  seedListItemReturningId,
  seedRestaurant,
} from '../support/seed';
import { hasServiceRoleCredentials } from '../support/service-role';
import { getAnyMunicipalityId, getServiceRoleClient } from '../support/supabase-service';
import { getE2EGlobalSetupAuth } from '../support/test-credentials';

type StartedTable = {
  table_id: string;
  lock_token: string;
  title: string;
  list_id: string;
};

/**
 * Sign in as the E2E owner and call start_table (needs auth.uid()).
 */
async function startTableAsOwner(
  email: string,
  password: string,
  listId: string,
  restaurantIds: string[]
): Promise<StartedTable> {
  loadE2EEnv();
  const url = process.env.E2E_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey =
    process.env.E2E_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
  const cookieJar: { name: string; value: string }[] = [];
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieJar.map((c) => ({ name: c.name, value: c.value }));
      },
      setAll(cookiesToSet) {
        cookieJar.length = 0;
        cookiesToSet.forEach(({ name, value }) => cookieJar.push({ name, value }));
      },
    },
  });
  const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
  if (authErr) throw new Error(authErr.message);
  const { data, error } = await supabase.rpc('start_table', {
    p_list_id: listId,
    p_restaurant_ids: restaurantIds,
    p_title: 'E2E Table',
    p_starts_at: null,
  });
  if (error) throw new Error(error.message);
  return data as StartedTable;
}

test.describe('table flow', () => {
  test.beforeEach(({}, testInfo) => {
    if (!hasServiceRoleCredentials()) {
      testInfo.skip(true, 'Need SUPABASE_SECRET_KEY / E2E service role');
    }
  });

  test('guest names themselves before voting; unnamed guests cannot vote', async ({
    browser,
  }) => {
    // Two browser contexts, a cold server action each, and a 4s poll between them.
    test.setTimeout(180_000);
    const auth = await getE2EGlobalSetupAuth();
    test.skip(!auth.ok, !auth.ok ? auth.missing.join(', ') : 'E2E owner credentials missing');
    if (!auth.ok) return;

    const admin = getServiceRoleClient();
    const { data: listed } = await admin.auth.admin.listUsers({ perPage: 200 });
    const owner = (listed?.users || []).find((u) => u.email === auth.email);
    test.skip(!owner?.id, 'E2E owner not found in auth.users');

    const { data: restaurants } = await admin.from('restaurants').select('id').limit(5);
    test.skip(!restaurants || restaurants.length < 3, 'Need ≥3 restaurants');

    const listId = await createOwnedList(owner!.id, {
      name: `E2E Table ${Date.now()}`,
      visibility: 'public',
    });
    await publishList(listId);
    for (let i = 0; i < 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await seedListItemReturningId(listId, restaurants![i].id, owner!.id, { sortOrder: i });
    }

    const table = await startTableAsOwner(
      auth.email,
      auth.password,
      listId,
      restaurants!.slice(0, 3).map((r) => r.id)
    );
    const tablePath = `/table/${table.table_id}`;

    const guest1 = await browser.newContext();
    const g1 = await guest1.newPage();
    await g1.goto(tablePath, { waitUntil: 'domcontentloaded' });
    await expect(g1.getByText(/E2E Table/i).first()).toBeVisible({ timeout: 45_000 });
    await expect(g1).toHaveURL(/\/join\/?$/);

    // Voting stays behind the name gate.
    await expect(g1.getByRole('button', { name: /upvote|votar a favor/i })).toHaveCount(0);

    await g1.getByRole('textbox').first().fill('Guest One');
    await g1.getByRole('button', { name: /take a seat|sentar à mesa/i }).click();
    await expect(g1.getByText(/Guest One/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(g1).not.toHaveURL(/\/join\/?$/);

    const up1 = g1.getByRole('button', { name: /upvote|votar a favor/i }).first();
    await expect(up1).toBeEnabled({ timeout: 20_000 });
    await up1.click();
    await expect(g1.getByText(/you picked this|escolheste este/i).first()).toBeVisible({
      timeout: 20_000,
    });

    const guest2 = await browser.newContext();
    const g2 = await guest2.newPage();
    await g2.goto(tablePath, { waitUntil: 'domcontentloaded' });
    await g2.getByRole('textbox').first().fill('Guest Two');
    await g2.getByRole('button', { name: /take a seat|sentar à mesa/i }).click();
    await expect(g2.getByText(/Guest Two/i).first()).toBeVisible({ timeout: 20_000 });
    // The other device picks the new seat up on its poll.
    await expect(g1.getByText(/Guest Two/i).first()).toBeVisible({ timeout: 20_000 });

    const { data: after } = await admin.rpc('get_table', { p_table_id: table.table_id });
    expect(after?.decide?.status).toBe('open');
    expect(after?.guest_count).toBeGreaterThanOrEqual(2);

    await guest1.close();
    await guest2.close();
    await deleteList(listId);
  });

  test('unknown table id shows error state', async ({ page }) => {
    await page.goto('/table/00000000-0000-4000-8000-000000000099', {
      waitUntil: 'domcontentloaded',
    });
    await expect(
      page.getByText(/not found|invalid|expired|wrong|couldn't|could not/i).first()
    ).toBeVisible({ timeout: 45_000 });
  });

  test('settling the table shows the Share in WhatsApp reply CTA', async ({ browser }) => {
    test.setTimeout(180_000);
    const auth = await getE2EGlobalSetupAuth();
    test.skip(!auth.ok, !auth.ok ? auth.missing.join(', ') : 'E2E owner credentials missing');
    if (!auth.ok) return;

    const admin = getServiceRoleClient();
    const { data: listed } = await admin.auth.admin.listUsers({ perPage: 200 });
    const owner = (listed?.users || []).find((u) => u.email === auth.email);
    test.skip(!owner?.id, 'E2E owner not found in auth.users');

    const { data: restaurants } = await admin.from('restaurants').select('id').limit(5);
    test.skip(!restaurants || restaurants.length < 3, 'Need ≥3 restaurants');

    const listId = await createOwnedList(owner!.id, {
      name: `E2E Table Reply ${Date.now()}`,
      visibility: 'public',
    });
    await publishList(listId);
    for (let i = 0; i < 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await seedListItemReturningId(listId, restaurants![i].id, owner!.id, { sortOrder: i });
    }

    const table = await startTableAsOwner(
      auth.email,
      auth.password,
      listId,
      restaurants!.slice(0, 3).map((r) => r.id)
    );

    const ctx = await browser.newContext();
    // The organiser's lock token travels in sessionStorage, so a device that never signed
    // in can still settle the table it started.
    await ctx.addInitScript(
      ({ tableId, lockToken }) => {
        window.sessionStorage.setItem(`nomnom:table-lock:${tableId}`, lockToken);
      },
      { tableId: table.table_id, lockToken: table.lock_token }
    );
    const page = await ctx.newPage();
    await page.goto(`/table/${table.table_id}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/E2E Table/i).first()).toBeVisible({ timeout: 45_000 });
    await page.getByRole('textbox').first().fill('Organiser');
    await page.getByRole('button', { name: /take a seat|sentar à mesa/i }).click();
    await expect(page.getByText(/Organiser/i).first()).toBeVisible({ timeout: 20_000 });

    const lockBtn = page.getByRole('button', { name: /settle the table|fechar a mesa/i });
    await expect(lockBtn).toBeVisible({ timeout: 20_000 });
    await lockBtn.click();

    await expect(
      page.getByRole('button', { name: /share in whatsapp|partilhar no whatsapp/i })
    ).toBeVisible({ timeout: 20_000 });
    // The copy uses a typographic apostrophe (DESIGN.md); accept either.
    await expect(page.getByText(/we[’']re going here|vamos aqui/i).first()).toBeVisible({
      timeout: 20_000,
    });

    await ctx.close();
    await deleteList(listId);
  });

  test('owner taps three list places in Start a Table and creates one', async ({ browser }) => {
    test.setTimeout(180_000);
    const auth = await getE2EGlobalSetupAuth();
    test.skip(!auth.ok, !auth.ok ? auth.missing.join(', ') : 'E2E owner credentials missing');
    if (!auth.ok) return;

    const admin = getServiceRoleClient();
    const { data: listed } = await admin.auth.admin.listUsers({ perPage: 200 });
    const owner = (listed?.users || []).find((u) => u.email === auth.email);
    test.skip(!owner?.id, 'E2E owner not found in auth.users');

    const municipalityId = await getAnyMunicipalityId();
    test.skip(!municipalityId, 'Need a municipality to seed restaurants');

    const stamp = Date.now().toString(36);
    const names = [0, 1, 2].map((i) => `E2E Table Pick ${stamp} ${i}`);
    const restaurantIds: string[] = [];
    let listId: string | null = null;
    let ctx: Awaited<ReturnType<typeof browser.newContext>> | null = null;

    try {
      for (const name of names) {
        // eslint-disable-next-line no-await-in-loop
        restaurantIds.push(await seedRestaurant(name, municipalityId!));
      }

      listId = await createOwnedList(owner!.id, {
        name: `E2E Table Picker ${stamp}`,
        visibility: 'public',
      });
      await publishList(listId);
      for (let i = 0; i < names.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await seedListItemReturningId(listId, restaurantIds[i], owner!.id, { sortOrder: i });
      }

      ctx = await browser.newContext({
        storageState: await buildUserStorageState(auth.email, auth.password),
      });
      await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
      const page = await ctx.newPage();
      await page.goto(`/lists/${listId}`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('button', { name: /start a table/i })).toBeVisible({
        timeout: 45_000,
      });
      await page.getByRole('button', { name: /start a table/i }).click();

      const sheet = page.getByRole('dialog');
      await expect(sheet).toBeVisible({ timeout: 15_000 });

      const createBtn = sheet.getByRole('button', { name: /create & copy link/i });
      await expect(createBtn).toBeDisabled();

      for (const name of names) {
        // eslint-disable-next-line no-await-in-loop
        await sheet.getByRole('button', { name, exact: true }).click();
      }

      await expect(sheet.getByText(/^3 selected$/i)).toBeVisible();
      await expect(createBtn).toBeEnabled();
      await createBtn.click();

      // `startTable` is a server action: the first call on a cold dev server compiles first.
      await expect(page).toHaveURL(/\/table\/[0-9a-f-]{36}/i, { timeout: 60_000 });
      await expect(page.getByText(/table link copied/i).first()).toBeVisible({ timeout: 30_000 });

      const { data: tables, error: tablesErr } = await admin
        .from('tables')
        .select('id')
        .eq('list_id', listId);
      expect(tablesErr).toBeNull();
      expect(tables?.length).toBe(1);
      const { count, error: placesErr } = await admin
        .from('table_places')
        .select('*', { count: 'exact', head: true })
        .eq('table_id', tables![0].id);
      expect(placesErr).toBeNull();
      expect(count).toBe(3);
    } finally {
      if (ctx) await ctx.close();
      if (listId) {
        await admin.from('tables').delete().eq('list_id', listId);
        await deleteList(listId);
      }
      await deleteRestaurants(restaurantIds);
    }
  });
});
