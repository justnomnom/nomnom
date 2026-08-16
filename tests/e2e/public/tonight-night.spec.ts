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

/**
 * Sign in as the E2E owner and call create_night (needs auth.uid()).
 */
async function createNightAsOwner(
  email: string,
  password: string,
  listId: string,
  restaurantIds: string[]
) {
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
  const { data, error } = await supabase.rpc('create_night', {
    p_list_id: listId,
    p_restaurant_ids: restaurantIds,
    p_title: 'E2E Tonight',
    p_starts_at: null,
  });
  if (error) throw new Error(error.message);
  return data as { night_id: string; decide_session_id: string; lock_token: string };
}

test.describe('tonight night flow', () => {
  test.beforeEach(({}, testInfo) => {
    if (!hasServiceRoleCredentials()) {
      testInfo.skip(true, 'Need SUPABASE_SECRET_KEY / E2E service role');
    }
  });

  test('guest join + vote; second guest; night stays open after list decide', async ({
    browser,
  }) => {
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
      name: `E2E Tonight ${Date.now()}`,
      visibility: 'public',
    });
    await publishList(listId);
    for (let i = 0; i < 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await seedListItemReturningId(listId, restaurants![i].id, owner!.id, { sortOrder: i });
    }

    const night = await createNightAsOwner(
      auth.email,
      auth.password,
      listId,
      restaurants!.slice(0, 3).map((r) => r.id)
    );
    const tonightPath = `/tonight/${night.night_id}`;

    const guest1 = await browser.newContext();
    const g1 = await guest1.newPage();
    await g1.goto(tonightPath, { waitUntil: 'domcontentloaded' });
    await expect(g1.getByText(/E2E Tonight/i).first()).toBeVisible({ timeout: 45_000 });
    // Open page shows Decide chrome before join (votes stay disabled until join).
    await expect(g1.getByText(/decide|decidir|vote|votar/i).first()).toBeVisible({
      timeout: 20_000,
    });
    await g1.getByRole('textbox').first().fill('Guest One');
    await g1.getByRole('button', { name: /join|entrar/i }).click();
    await expect(g1.getByText(/Guest One/i).first()).toBeVisible({ timeout: 20_000 });
    const up1 = g1.getByRole('button', { name: /upvote|votar a favor/i }).first();
    await expect(up1).toBeEnabled({ timeout: 20_000 });
    await up1.click();

    const guest2 = await browser.newContext();
    const g2 = await guest2.newPage();
    await g2.goto(tonightPath, { waitUntil: 'domcontentloaded' });
    await g2.getByRole('textbox').first().fill('Guest Two');
    await g2.getByRole('button', { name: /join/i }).click();
    await expect(g2.getByText(/Guest Two/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(g1.getByText(/Guest Two/i).first()).toBeVisible({ timeout: 15_000 });

    loadE2EEnv();
    const url = process.env.E2E_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const anonKey =
      process.env.E2E_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
    const jar: { name: string; value: string }[] = [];
    const userSb = createServerClient(url, anonKey, {
      cookies: {
        getAll: () => jar.map((c) => ({ name: c.name, value: c.value })),
        setAll: (cookiesToSet) => {
          jar.length = 0;
          cookiesToSet.forEach(({ name, value }) => jar.push({ name, value }));
        },
      },
    });
    await userSb.auth.signInWithPassword({ email: auth.email, password: auth.password });
    await userSb.rpc('create_list_decide_session', { p_list_id: listId });

    const { data: nightAfter } = await admin.rpc('get_night', { p_night_id: night.night_id });
    expect(nightAfter?.decide?.status).toBe('open');

    await guest1.close();
    await guest2.close();
  });

  test('unknown tonight id shows error state', async ({ page }) => {
    await page.goto('/tonight/00000000-0000-4000-8000-000000000099', {
      waitUntil: 'domcontentloaded',
    });
    await expect(
      page.getByText(/not found|invalid|expired|wrong|couldn't|could not/i).first()
    ).toBeVisible({ timeout: 45_000 });
  });

  test('lock winner shows Share in WhatsApp reply CTA', async ({ browser }) => {
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
      name: `E2E Tonight Reply ${Date.now()}`,
      visibility: 'public',
    });
    await publishList(listId);
    for (let i = 0; i < 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await seedListItemReturningId(listId, restaurants![i].id, owner!.id, { sortOrder: i });
    }

    const night = await createNightAsOwner(
      auth.email,
      auth.password,
      listId,
      restaurants!.slice(0, 3).map((r) => r.id)
    );

    const ctx = await browser.newContext();
    await ctx.addInitScript(
      ({ sessionId, lockToken }) => {
        window.sessionStorage.setItem(`nomnom:list-decide-lock:${sessionId}`, lockToken);
      },
      { sessionId: night.decide_session_id, lockToken: night.lock_token }
    );
    const page = await ctx.newPage();
    await page.goto(`/tonight/${night.night_id}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/E2E Tonight/i).first()).toBeVisible({ timeout: 45_000 });

    const lockBtn = page.getByRole('button', { name: /lock winner|fechar vencedor/i });
    await expect(lockBtn).toBeVisible({ timeout: 20_000 });
    await lockBtn.click();

    await expect(
      page.getByRole('button', { name: /share in whatsapp|partilhar no whatsapp/i })
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/we're going here|vamos aqui/i).first()).toBeVisible();

    await ctx.close();
  });

  test('owner taps three list places in Plan tonight and creates a night', async ({ browser }) => {
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
    const names = [0, 1, 2].map((i) => `E2E Tonight Pick ${stamp} ${i}`);
    const restaurantIds: string[] = [];
    let listId: string | null = null;
    let ctx: Awaited<ReturnType<typeof browser.newContext>> | null = null;

    try {
      for (const name of names) {
        restaurantIds.push(await seedRestaurant(name, municipalityId));
      }

      listId = await createOwnedList(owner!.id, {
        name: `E2E Tonight Picker ${stamp}`,
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
      await expect(page.getByRole('button', { name: /plan tonight/i })).toBeVisible({
        timeout: 45_000,
      });
      await page.getByRole('button', { name: /plan tonight/i }).click();

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

      await expect(page.getByText(/tonight link copied/i).first()).toBeVisible({ timeout: 20_000 });

      const { data: nights, error: nightsErr } = await admin
        .from('nights')
        .select('id')
        .eq('list_id', listId);
      expect(nightsErr).toBeNull();
      expect(nights?.length).toBe(1);
      const { count, error: placesErr } = await admin
        .from('night_places')
        .select('*', { count: 'exact', head: true })
        .eq('night_id', nights![0].id);
      expect(placesErr).toBeNull();
      expect(count).toBe(3);
    } finally {
      if (ctx) await ctx.close();
      if (listId) {
        await admin.from('nights').delete().eq('list_id', listId);
        await admin.from('list_decide_sessions').delete().eq('list_id', listId);
        await deleteList(listId);
      }
      await deleteRestaurants(restaurantIds);
    }
  });
});
