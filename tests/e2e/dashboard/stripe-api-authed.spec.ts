import { type APIResponse, expect, test } from '@playwright/test';

import { dashboardTestsDisabled } from '../support/skip-dashboard';
import { E2E_DASHBOARD_AUTH_SETUP_HINT } from '../support/test-credentials';

/**
 * Stripe checkout guards that require a session (TEST-PLAN B3 nonexistent/unmonetized list,
 * verify-snapshot field validation). Runs in the dashboard project so the `request` fixture
 * carries the signed-in storage state. No Stripe calls happen: every case is rejected first.
 * Deliberately NOT covered here: POST /api/stripe/connect/onboard while authed — it would
 * create a real Stripe Connect account for the test user.
 */

function skipIfStripeUnconfigured(res: APIResponse) {
  test.skip(res.status() === 503, 'Stripe env not configured for this environment');
}

test.describe('stripe checkout — authed guard rails', () => {
  test.beforeEach(({}, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
  });

  test('nonexistent list → 400 list_not_monetized (no Stripe session created)', async ({
    request,
  }) => {
    const res = await request.post('/api/stripe/checkout/list', {
      data: { listId: '00000000-0000-4000-8000-000000000000' },
    });
    skipIfStripeUnconfigured(res);
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe('list_not_monetized');
  });

  test('snapshot type on nonexistent list → 400 list_not_monetized', async ({ request }) => {
    const res = await request.post('/api/stripe/checkout/list', {
      data: { listId: '00000000-0000-4000-8000-000000000000', type: 'snapshot' },
    });
    skipIfStripeUnconfigured(res);
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe('list_not_monetized');
  });

  test('verify-snapshot with missing fields → 400 missing_fields', async ({ request }) => {
    const res = await request.post('/api/stripe/checkout/verify-snapshot', { data: {} });
    skipIfStripeUnconfigured(res);
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe('missing_fields');
  });

  test('verify-snapshot with invalid JSON → 400 invalid_json', async ({ request }) => {
    // Buffer keeps the payload raw — a plain string would be JSON-stringified by Playwright.
    const res = await request.post('/api/stripe/checkout/verify-snapshot', {
      headers: { 'content-type': 'application/json' },
      data: Buffer.from('not-json{{{'),
    });
    skipIfStripeUnconfigured(res);
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe('invalid_json');
  });
});
