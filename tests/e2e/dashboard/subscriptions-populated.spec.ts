import { expect, test } from '@playwright/test';

import { loadE2EEnv } from '../load-env';
import { expectSignedInDashboardShell } from '../support/page-assertions';
import { dashboardTestsDisabled } from '../support/skip-dashboard';
import { hasServiceRoleCredentials } from '../support/service-role';
import { getUserIdByEmail } from '../support/supabase-service';
import {
  deleteList,
  publishList,
  createOwnedList,
  createSeededUser,
  deleteSeededUser,
  seedListSubscription,
  deleteListAccessRows,
} from '../support/seed';
import {
  E2E_DASHBOARD_AUTH_SETUP_HINT,
  getE2ETestUserEmailForDb,
} from '../support/test-credentials';

/**
 * TEST-PLAN §10 S4 + §4 C4 — the POPULATED states of the two subscription settings pages
 * (settings-variations.spec.ts covers the empty states). Access rows are seeded directly
 * (`seedListSubscription`, status active — no Stripe), both directions:
 *  - S4 my-subscriptions: the shared user subscribes to a seeded creator's paid list →
 *    the row renders with that list's name.
 *  - C4 subscribers: a seeded user subscribes to the shared user's own paid list → the
 *    subscriber's @handle renders.
 */
test.describe('subscription settings pages — populated states (S4/C4)', () => {
  test.beforeEach(({}, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
    if (!hasServiceRoleCredentials()) {
      testInfo.skip(true, 'Service role needed to seed subscription rows');
    }
  });

  test('S4: my-subscriptions lists the seeded active subscription', async ({ page }) => {
    test.setTimeout(240_000);
    loadE2EEnv();
    const myId = await getUserIdByEmail(await getE2ETestUserEmailForDb());
    test.skip(!myId, 'Could not resolve the shared E2E user id from email');
    if (!myId) return;

    // Do not prefix with "E2E " — `/^E2E\b/i` is hidden in local webpack unless
    // NEXT_PUBLIC_SHOW_E2E_LISTS_IN_UI=true is compiled into the reused server.
    const listName = `Subbed list ${Date.now()}`;
    const creator = await createSeededUser('e2esubcreator');
    const listId = await createOwnedList(creator.id, { monetized: true, name: listName });
    await publishList(listId);
    await seedListSubscription(listId, myId);

    try {
      await page.request.get('/dashboard/settings/my-subscriptions');
      await page.goto('/dashboard/settings/my-subscriptions', {
        waitUntil: 'domcontentloaded',
        timeout: 180_000,
      });
      await expectSignedInDashboardShell(page, { timeout: 90_000 });
      await expect(page.getByText(listName)).toBeVisible({ timeout: 90_000 });
    } finally {
      await deleteListAccessRows(listId);
      await deleteList(listId);
      await deleteSeededUser(creator.id);
    }
  });

  test('C4: subscribers lists the seeded subscriber of my paid list', async ({ page }) => {
    test.setTimeout(240_000);
    loadE2EEnv();
    const myId = await getUserIdByEmail(await getE2ETestUserEmailForDb());
    test.skip(!myId, 'Could not resolve the shared E2E user id from email');
    if (!myId) return;

    const subscriber = await createSeededUser('e2esubscriber');
    const listId = await createOwnedList(myId, {
      monetized: true,
      name: `My paid list ${Date.now()}`,
    });
    await publishList(listId);
    await seedListSubscription(listId, subscriber.id);

    try {
      await page.request.get('/dashboard/settings/subscribers');
      await page.goto('/dashboard/settings/subscribers', {
        waitUntil: 'domcontentloaded',
        timeout: 180_000,
      });
      await expectSignedInDashboardShell(page, { timeout: 90_000 });
      // The row renders the subscriber's name as a heading (no @ prefix — the display
      // name is the seeded username), and the stats card counts them as active.
      await expect(
        page.getByRole('heading', { name: subscriber.username })
      ).toBeVisible({ timeout: 60_000 });
      await expect(page.getByText('Active subscribers')).toBeVisible();
    } finally {
      await deleteListAccessRows(listId);
      await deleteList(listId);
      await deleteSeededUser(subscriber.id);
    }
  });
});
