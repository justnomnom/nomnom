import { expect, test } from '@playwright/test';

import { dashboardTestsDisabled } from '../support/skip-dashboard';
import { E2E_DASHBOARD_AUTH_SETUP_HINT } from '../support/test-credentials';

/**
 * Web Push route-handler field validation for a signed-in user.
 * Uses the `request` fixture (storage state) so webpack never has to compile a page.
 */

test.describe('push subscribe/unsubscribe — authed guard rails', () => {
  test.beforeEach(({}, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
  });

  test('subscribe invalid JSON → 400 invalid_json', async ({ request }) => {
    const res = await request.post('/api/push/subscribe', {
      headers: { 'content-type': 'application/json' },
      data: Buffer.from('not-json{{{'),
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe('invalid_json');
  });

  test('subscribe missing keys → 400 invalid_subscription', async ({ request }) => {
    const res = await request.post('/api/push/subscribe', { data: { endpoint: 'https://x' } });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe('invalid_subscription');
  });

  test('unsubscribe invalid JSON → 400 invalid_json', async ({ request }) => {
    const res = await request.post('/api/push/unsubscribe', {
      headers: { 'content-type': 'application/json' },
      data: Buffer.from('not-json{{{'),
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe('invalid_json');
  });

  test('unsubscribe missing endpoint → 400 missing_endpoint', async ({ request }) => {
    const res = await request.post('/api/push/unsubscribe', { data: {} });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe('missing_endpoint');
  });
});
