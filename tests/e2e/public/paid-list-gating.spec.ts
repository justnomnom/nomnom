import { type Page, type Browser, expect, test } from '@playwright/test';

import { hasServiceRoleCredentials } from '../support/service-role';
import { getAnyMunicipalityId } from '../support/supabase-service';
import { LIST_FREEMIUM_FREE_PLACES_COUNT } from '../../../src/libs/stripe/list-stripe-constants';
import {
  deleteList,
  publishList,
  seedRestaurant,
  createOwnedList,
  createSeededUser,
  deleteSeededUser,
  deleteCustomerRow,
  deleteRestaurants,
  seedCreatorConnect,
  deleteListAccessRows,
  seedListSubscription,
  buildUserStorageState,
  seedListItemReturningId,
  seedListSnapshotPurchase,
  type SeededUser,
} from '../support/seed';

/**
 * Paid-list PAYWALL CONTENT GATING on the public list page (`/lists/:id`), WITHOUT live Stripe
 * (TEST-PLAN B15).
 *
 * A monetized `public_subscribers` list is seeded (service role) with N places of varying recency,
 * then access rows are inserted directly into the tables the app reads (`list_subscriptions`,
 * `list_snapshot_purchases`) so we can assert exactly which places each viewer sees:
 *
 *   (a) anonymous            → paywall + only the `FREEMIUM_PREVIEW_COUNT` most-recent places
 *   (b) signed-in non-buyer  → same freemium preview + paywall
 *   (c) subscription buyer   → the whole live list, no paywall
 *   (d) snapshot buyer       → exactly the places captured at purchase time, no paywall
 *
 * This exercises `fetchListPage`'s freemium ordering (`created_at desc`, capped at the free count),
 * `src/libs/paywall/paywall-recency.js` (the "Updated …" value-prop label), and
 * `src/libs/lists/merge-snapshot-purchase-captured-item-ids` (snapshot capture) end to end. It does
 * not touch Stripe — access is granted by seeding the DB rows the webhook would have written.
 */

const PAYWALL_TITLE = 'Unlock every place on this list';
const SNAPSHOT_UPSELL = /This is a snapshot from/i;
const FREE = LIST_FREEMIUM_FREE_PLACES_COUNT;
const TOTAL = FREE + 2; // two places beyond the free preview are locked for non-buyers

type Seeded = {
  listId: string;
  creator: SeededUser;
  nonSubscriber: SeededUser;
  subscriber: SeededUser;
  snapshotBuyer: SeededUser;
  restaurantIds: string[];
  /** Place display names, newest (index 0) → oldest (index TOTAL-1). */
  names: string[];
  /** list_item ids, aligned with `names` by index. */
  itemIds: string[];
  /** Indices captured by the snapshot buyer (one inside the free window, one locked). */
  capturedIdx: number[];
};

let seeded: Seeded | null = null;
let skipReason: string | null = null;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  test.setTimeout(120_000); // seeding does many service-role round-trips
  if (!hasServiceRoleCredentials()) {
    skipReason = 'Set E2E_SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY to seed the gating list.';
    return;
  }
  const municipalityId = await getAnyMunicipalityId();
  if (!municipalityId) {
    skipReason = 'No municipality/restaurant rows to derive a locality_id — seed data or skip.';
    return;
  }

  const stamp = Date.now().toString(36);
  const creator = await createSeededUser('e2egatecreator');
  // A charges-enabled Connect row makes the paywall render its real CTAs (not the
  // "payments not ready" fallback) — closer to what a real viewer sees.
  await seedCreatorConnect(creator.id, `acct_e2egate_${stamp}`, { chargesEnabled: true });

  const listId = await createOwnedList(creator.id, {
    monetized: true,
    name: `E2E Gate ${stamp} list`,
    monthlyAmountCents: 500,
    currency: 'eur',
  });

  // N places of decreasing recency: index 0 newest … index TOTAL-1 oldest.
  const names: string[] = [];
  const itemIds: string[] = [];
  const restaurantIds: string[] = [];
  const now = Date.now();
  for (let i = 0; i < TOTAL; i += 1) {
    const name = `E2E Gate ${stamp} slot-${i}`;
    const rid = await seedRestaurant(name, municipalityId);
    // Older as the index grows so `created_at desc` yields slot-0 first.
    const createdAt = new Date(now - i * 86_400_000).toISOString();
    const itemId = await seedListItemReturningId(listId, rid, creator.id, {
      createdAt,
      sortOrder: i,
    });
    names.push(name);
    itemIds.push(itemId);
    restaurantIds.push(rid);
  }

  await publishList(listId);

  const nonSubscriber = await createSeededUser('e2egatenosub');
  const subscriber = await createSeededUser('e2egatesub');
  const snapshotBuyer = await createSeededUser('e2egatesnap');

  // (c) recurring access to this paid list.
  await seedListSubscription(listId, subscriber.id, { status: 'active' });

  // (d) snapshot capture: one place inside the free window (FREE-1) + one that is otherwise locked
  // (the oldest, TOTAL-1). The buyer must see exactly these two regardless of the free gate.
  const capturedIdx = [FREE - 1, TOTAL - 1];
  await seedListSnapshotPurchase(
    listId,
    snapshotBuyer.id,
    capturedIdx.map((i) => itemIds[i])
  );

  seeded = {
    listId,
    creator,
    nonSubscriber,
    subscriber,
    snapshotBuyer,
    restaurantIds,
    names,
    itemIds,
    capturedIdx,
  };
});

test.afterAll(async () => {
  test.setTimeout(120_000);
  if (!seeded) return;
  const s = seeded;
  // Snapshot rows FK the list with ON DELETE RESTRICT → drop access rows before the list.
  await deleteListAccessRows(s.listId);
  await deleteList(s.listId); // deletes list_items then the list
  await deleteRestaurants(s.restaurantIds);
  await deleteCustomerRow(s.creator.id);
  await deleteSeededUser(s.creator.id);
  await deleteSeededUser(s.nonSubscriber.id);
  await deleteSeededUser(s.subscriber.id);
  await deleteSeededUser(s.snapshotBuyer.id);
  seeded = null;
});

test.beforeEach(() => {
  test.skip(Boolean(skipReason), skipReason ?? '');
});

/** Navigate to the public list page, tolerating a cold dev-server first-route compile. */
async function gotoList(page: Page, listId: string): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(`/lists/${listId}`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
      return;
    } catch (e) {
      const msg = (e as Error).message;
      if (!/ERR_CONNECTION_(RESET|REFUSED)|ECONNRESET|ECONNREFUSED|Timeout/i.test(msg)) throw e;
      await new Promise((r) => setTimeout(r, 4_000));
    }
  }
  await page.goto(`/lists/${listId}`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
}

/** Assert the exact set of seeded places rendered on the page: `visibleIdx` shown, all others gone. */
async function expectVisiblePlaces(page: Page, visibleIdx: number[]): Promise<void> {
  const s = seeded!;
  const visible = new Set(visibleIdx);
  for (let i = 0; i < s.names.length; i += 1) {
    const locator = page.getByText(s.names[i], { exact: true });
    if (visible.has(i)) {
      await expect(locator, `place slot-${i} should be visible`).toBeVisible();
    } else {
      await expect(locator, `place slot-${i} should be gated`).toHaveCount(0);
    }
  }
}

/** Open the list as a signed-in seeded user in a fresh context, run `fn`, then dispose the context. */
async function asUser(
  browser: Browser,
  user: SeededUser,
  listId: string,
  fn: (page: Page) => Promise<void>
): Promise<void> {
  const storageState = await buildUserStorageState(user.email, user.password);
  const context = await browser.newContext({ storageState });
  try {
    const page = await context.newPage();
    await gotoList(page, listId);
    await fn(page);
  } finally {
    await context.close();
  }
}

test('(a) anonymous viewer: paywall + only the free-preview places, the rest locked', async ({
  page,
}) => {
  test.setTimeout(150_000);
  const s = seeded!;
  await gotoList(page, s.listId);

  // Paywall present, including the recency value-prop label (paywall-recency.js, < 90 days).
  await expect(page.getByText(PAYWALL_TITLE)).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText(/^Updated /).first()).toBeVisible();

  // Only the FREE most-recent places (indices 0…FREE-1) render; the rest are locked.
  await expectVisiblePlaces(
    page,
    Array.from({ length: FREE }, (_, i) => i)
  );
});

test('(b) signed-in non-subscriber: same freemium preview + paywall', async ({ browser }) => {
  test.setTimeout(150_000);
  const s = seeded!;
  await asUser(browser, s.nonSubscriber, s.listId, async (page) => {
    await expect(page.getByText(PAYWALL_TITLE)).toBeVisible({ timeout: 45_000 });
    await expectVisiblePlaces(
      page,
      Array.from({ length: FREE }, (_, i) => i)
    );
  });
});

test('(c) subscription buyer: whole live list, no paywall', async ({ browser }) => {
  test.setTimeout(150_000);
  const s = seeded!;
  await asUser(browser, s.subscriber, s.listId, async (page) => {
    // Wait for hydration to settle on the newest place, then assert the whole list is present.
    await expect(page.getByText(s.names[0], { exact: true })).toBeVisible({ timeout: 45_000 });
    await expectVisiblePlaces(
      page,
      Array.from({ length: TOTAL }, (_, i) => i)
    );
    await expect(page.getByText(PAYWALL_TITLE)).toHaveCount(0);
  });
});

test('(d) snapshot buyer: exactly the captured places, no paywall', async ({ browser }) => {
  test.setTimeout(150_000);
  const s = seeded!;
  await asUser(browser, s.snapshotBuyer, s.listId, async (page) => {
    // Settle on the first captured place, then assert exactly the captured set renders — a
    // non-captured place inside the free window (slot-0) must NOT show for a snapshot buyer.
    await expect(page.getByText(s.names[s.capturedIdx[0]], { exact: true })).toBeVisible({
      timeout: 45_000,
    });
    await expectVisiblePlaces(page, s.capturedIdx);

    // Snapshot buyers get the "this is a snapshot" upsell, not the locked paywall.
    await expect(page.getByText(SNAPSHOT_UPSELL)).toBeVisible();
    await expect(page.getByText(PAYWALL_TITLE)).toHaveCount(0);
  });
});
