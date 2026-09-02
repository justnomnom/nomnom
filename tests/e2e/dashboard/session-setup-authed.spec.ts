import { expect, test } from '@playwright/test';

import { dashboardTestsDisabled } from '../support/skip-dashboard';
import { E2E_DASHBOARD_AUTH_SETUP_HINT } from '../support/test-credentials';

/**
 * Authed session-setup: the login client POSTs here after cookies land so the
 * customers/users rows exist before the dashboard hydrate.
 */
test.describe('POST /api/auth/session-setup — authed', () => {
  test.beforeEach(({}, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
  });

  test('signed-in request returns ok without requiring names', async ({ request }) => {
    const res = await request.post('/api/auth/session-setup', { data: {} });
    expect(res.status()).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });
});
