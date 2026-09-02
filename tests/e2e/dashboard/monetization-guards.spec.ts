import { type APIResponse, expect, test } from '@playwright/test';

import { loadE2EEnv } from '../load-env';
import { dashboardTestsDisabled } from '../support/skip-dashboard';
import { getUserIdByEmail } from '../support/supabase-service';
import {
  deleteList,
  createOwnedList,
  createSeededUser,
  deleteSeededUser,
  seedCreatorConnect,
  deleteCustomerRow,
  buildUserStorageState,
  seedListSnapshotPurchase,
  deleteListAccessRows,
} from '../support/seed';
import {
  E2E_DASHBOARD_AUTH_SETUP_HINT,
  getE2ETestUserEmailForDb,
} from '../support/test-credentials';

/**
 * Monetized-list access control at the checkout boundary, using seeded data and NO live
 * Stripe (TEST-PLAN B4, B5, C3 creator_not_ready). A seeded creator (no Connect account)
 * owns the lists, and the buyer is the signed-in test user. Every asserted branch returns
 * before the route touches Stripe, so this validates the money mechanism's gating
 * deterministically.
 */
test.describe.configure({ mode: 'serial' });

function skipIfStripeUnconfigured(res: APIResponse) {
  test.skip(res.status() === 503, 'Stripe env not configured for this environment');
}

test.describe('paid lists — checkout guards (seeded creator, no Stripe)', () => {
  test.beforeEach(({}, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
  });

  test('monetized list from a creator without Connect → creator_not_ready', async ({ request }) => {
    test.setTimeout(120_000);
    loadE2EEnv();
    const creator = await createSeededUser('e2ecreator');
    const listId = await createOwnedList(creator.id, { monetized: true, name: `E2E Paid ${Date.now()}` });
    try {
      const res = await request.post('/api/stripe/checkout/list', { data: { listId } });
      skipIfStripeUnconfigured(res);
      expect(res.status()).toBe(400);
      expect((await res.json()).error).toBe('creator_not_ready');
    } finally {
      await deleteList(listId);
      await deleteSeededUser(creator.id);
    }
  });

  test('non-monetized list → list_not_monetized', async ({ request }) => {
    test.setTimeout(120_000);
    loadE2EEnv();
    const creator = await createSeededUser('e2ecreator');
    const listId = await createOwnedList(creator.id, { name: `E2E Free ${Date.now()}` });
    try {
      const res = await request.post('/api/stripe/checkout/list', { data: { listId } });
      skipIfStripeUnconfigured(res);
      expect(res.status()).toBe(400);
      expect((await res.json()).error).toBe('list_not_monetized');
    } finally {
      await deleteList(listId);
      await deleteSeededUser(creator.id);
    }
  });

  test('snapshot purchase of a creator without Connect → creator_not_ready', async ({ request }) => {
    test.setTimeout(120_000);
    loadE2EEnv();
    const creator = await createSeededUser('e2ecreator');
    const listId = await createOwnedList(creator.id, { monetized: true, name: `E2E Snap ${Date.now()}` });
    try {
      const res = await request.post('/api/stripe/checkout/list', {
        data: { listId, type: 'snapshot' },
      });
      skipIfStripeUnconfigured(res);
      expect(res.status()).toBe(400);
      expect((await res.json()).error).toBe('creator_not_ready');
    } finally {
      await deleteList(listId);
      await deleteSeededUser(creator.id);
    }
  });

  // B4 — the ownership guard fires only after the Connect check (route order), so the seeded
  // creator gets a fake charges-enabled customers row; the route still returns before Stripe.
  test('B4: owner buying their own monetized list → cannot_subscribe_own_list', async ({
    playwright,
  }) => {
    test.setTimeout(180_000);
    loadE2EEnv();
    const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3032';
    const creator = await createSeededUser('e2eowner');
    await seedCreatorConnect(creator.id, `acct_e2e_fake_${Date.now().toString(36)}`);
    const listId = await createOwnedList(creator.id, {
      monetized: true,
      name: `E2E Own ${Date.now()}`,
    });
    const ownerRequest = await playwright.request.newContext({
      baseURL,
      storageState: await buildUserStorageState(creator.email, creator.password),
    });
    try {
      const res = await ownerRequest.post('/api/stripe/checkout/list', { data: { listId } });
      skipIfStripeUnconfigured(res);
      expect(res.status()).toBe(400);
      expect((await res.json()).error).toBe('cannot_subscribe_own_list');
    } finally {
      await ownerRequest.dispose();
      await deleteList(listId);
      await deleteCustomerRow(creator.id);
      await deleteSeededUser(creator.id);
    }
  });

  // B5 — a snapshot re-purchase is refused before any Stripe session is created.
  test('B5: snapshot re-purchase of an already-bought list → already_purchased', async ({
    request,
  }) => {
    test.setTimeout(180_000);
    loadE2EEnv();
    const buyerId = await getUserIdByEmail(await getE2ETestUserEmailForDb());
    test.skip(!buyerId, 'Could not resolve the shared E2E user id from email');
    if (!buyerId) return;

    const creator = await createSeededUser('e2ecreator');
    await seedCreatorConnect(creator.id, `acct_e2e_fake_${Date.now().toString(36)}`);
    const listId = await createOwnedList(creator.id, {
      monetized: true,
      name: `E2E Rebuy ${Date.now()}`,
    });
    await seedListSnapshotPurchase(listId, buyerId, null);
    try {
      const res = await request.post('/api/stripe/checkout/list', {
        data: { listId, type: 'snapshot' },
      });
      skipIfStripeUnconfigured(res);
      expect(res.status()).toBe(400);
      expect((await res.json()).error).toBe('already_purchased');
    } finally {
      await deleteListAccessRows(listId);
      await deleteList(listId);
      await deleteCustomerRow(creator.id);
      await deleteSeededUser(creator.id);
    }
  });
});
