import { expect, test } from '@playwright/test';

import { loadE2EEnv } from '../load-env';
import { dashboardTestsDisabled } from '../support/skip-dashboard';
import { hasServiceRoleCredentials } from '../support/service-role';
import { getAnyMunicipalityId } from '../support/supabase-service';
import {
  deleteList,
  publishList,
  createOwnedList,
  createSeededUser,
  deleteSeededUser,
  seedRestaurant,
  deleteRestaurants,
  seedListItemReturningId,
} from '../support/seed';
import { E2E_DASHBOARD_AUTH_SETUP_HINT } from '../support/test-credentials';

/**
 * TEST-PLAN §5 B16 — how the UI handles a not-ready creator. Finding from the first run:
 * the paywall PRE-EMPTS the checkout error — when the creator has no charges-enabled
 * Connect account it renders `pages.lists.freemium_payments_not_ready` ("The creator
 * hasn’t enabled payments yet…") and hides the Subscribe CTA entirely, so the
 * `creator_not_ready` snackbar is only reachable in a render/click race. This spec
 * asserts that pre-emptive gate; the checkout error→copy mapping itself stays covered by
 * the `stripe-checkout-errors` unit tests.
 */
test.describe('paid list paywall — not-ready creator gate (B16)', () => {
  test.beforeEach(({}, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
    if (!hasServiceRoleCredentials()) {
      testInfo.skip(true, 'Service role needed to seed the monetized list');
    }
  });

  test('paywall renders the not-ready notice and withholds the Subscribe CTA', async ({
    page,
    request,
  }) => {
    test.setTimeout(300_000);
    loadE2EEnv();

    // Pre-flight: 503 means no Stripe env at all — the UI would show the generic
    // "temporarily unavailable" copy instead; skip rather than assert the wrong branch.
    const probe = await request.post('/api/stripe/checkout/list', { data: {} });
    test.skip(probe.status() === 503, 'Stripe env not configured for this environment');

    const municipalityId = await getAnyMunicipalityId();
    test.skip(!municipalityId, 'No municipalities seeded — cannot create a restaurant');
    if (!municipalityId) return;

    const stamp = Date.now();
    const creator = await createSeededUser('e2epaywall');
    const listId = await createOwnedList(creator.id, {
      monetized: true,
      name: `E2E Paywall ${stamp}`,
    });
    const restaurantId = await seedRestaurant(`E2E Paywall Spot ${stamp}`, municipalityId);
    await seedListItemReturningId(listId, restaurantId, creator.id);
    await publishList(listId);

    try {
      await page.goto(`/lists/${listId}`, { waitUntil: 'domcontentloaded', timeout: 180_000 });

      // Paywall shell renders…
      await expect(
        page.getByRole('heading', { name: 'Unlock every place on this list' })
      ).toBeVisible({ timeout: 60_000 });
      // …with the not-ready notice instead of any purchase CTA.
      await expect(
        page.getByText('The creator hasn’t enabled payments yet. Check back soon.')
      ).toBeVisible({ timeout: 30_000 });
      await expect(page.getByRole('button', { name: 'Subscribe', exact: true })).toHaveCount(0);
    } finally {
      await deleteList(listId);
      await deleteRestaurants([restaurantId]);
      await deleteSeededUser(creator.id);
    }
  });
});
