import { type APIRequestContext, type APIResponse, expect, test } from '@playwright/test';

/**
 * Stripe route-handler guard rails, unauthenticated (TEST-PLAN B1, B2, B14 + connect 401).
 * No browser page and no Stripe network calls: every case is rejected before Stripe is touched.
 * When Stripe env is not configured locally, routes return 503 `stripe_not_configured` /
 * `webhook_not_configured` — those cases skip instead of failing.
 */

function skipIfStripeUnconfigured(res: APIResponse) {
  test.skip(res.status() === 503, 'Stripe env not configured for this environment');
}

/**
 * POST with a few retries when the webpack webServer is mid-restart (ECONNREFUSED /
 * connection reset). Common in long single-worker suites after memory pressure.
 */
async function postWithServerRetry(
  request: APIRequestContext,
  url: string,
  options?: Parameters<APIRequestContext['post']>[1]
): Promise<APIResponse> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await request.post(url, options);
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      if (!/ECONNREFUSED|ECONNRESET|socket hang up|connect/i.test(msg)) {
        throw e;
      }
      await new Promise((r) => setTimeout(r, 2_000 * (attempt + 1)));
    }
  }
  throw lastErr;
}

test.describe('POST /api/stripe/checkout/list — unauthenticated guards', () => {
  test('invalid JSON body → 400 invalid_json', async ({ request }) => {
    // Buffer keeps the payload raw — a plain string would be JSON-stringified by Playwright.
    const res = await postWithServerRetry(request, '/api/stripe/checkout/list', {
      headers: { 'content-type': 'application/json' },
      data: Buffer.from('not-json{{{'),
    });
    skipIfStripeUnconfigured(res);
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe('invalid_json');
  });

  test('missing listId → 400 missing_list_id', async ({ request }) => {
    const res = await postWithServerRetry(request, '/api/stripe/checkout/list', { data: {} });
    skipIfStripeUnconfigured(res);
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe('missing_list_id');
  });

  test('malformed listId → 400 invalid_list_id', async ({ request }) => {
    const res = await postWithServerRetry(request, '/api/stripe/checkout/list', {
      data: { listId: 'not-a-uuid' },
    });
    skipIfStripeUnconfigured(res);
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe('invalid_list_id');
  });

  test('well-formed listId without a session → 401 unauthorized', async ({ request }) => {
    const res = await postWithServerRetry(request, '/api/stripe/checkout/list', {
      data: { listId: '00000000-0000-4000-8000-000000000000' },
    });
    skipIfStripeUnconfigured(res);
    expect(res.status()).toBe(401);
    expect((await res.json()).error).toBe('unauthorized');
  });
});

test.describe('POST /api/stripe/connect/onboard — unauthenticated', () => {
  test('no session → 401 unauthorized', async ({ request }) => {
    const res = await postWithServerRetry(request, '/api/stripe/connect/onboard');
    skipIfStripeUnconfigured(res);
    expect(res.status()).toBe(401);
    expect((await res.json()).error).toBe('unauthorized');
  });
});

test.describe('POST /api/stripe/checkout/verify-snapshot — unauthenticated', () => {
  test('no session → 401 unauthorized', async ({ request }) => {
    const res = await postWithServerRetry(request, '/api/stripe/checkout/verify-snapshot', {
      data: { sessionId: 'cs_test_x', stripeAccountId: 'acct_x' },
    });
    skipIfStripeUnconfigured(res);
    expect(res.status()).toBe(401);
    expect((await res.json()).error).toBe('unauthorized');
  });
});

test.describe('POST /api/webhooks/stripe — signature enforcement', () => {
  test('missing stripe-signature header → 400 missing_signature', async ({ request }) => {
    const res = await postWithServerRetry(request, '/api/webhooks/stripe', {
      headers: { 'content-type': 'application/json' },
      data: JSON.stringify({ id: 'evt_fake', type: 'checkout.session.completed' }),
    });
    skipIfStripeUnconfigured(res);
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe('missing_signature');
  });

  test('bogus stripe-signature → 400 invalid_signature, no side effects', async ({ request }) => {
    const res = await postWithServerRetry(request, '/api/webhooks/stripe', {
      headers: {
        'content-type': 'application/json',
        'stripe-signature': 't=1,v1=deadbeef',
      },
      data: JSON.stringify({ id: 'evt_fake', type: 'checkout.session.completed' }),
    });
    skipIfStripeUnconfigured(res);
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe('invalid_signature');
  });
});

test.describe('POST /api/stripe/billing-portal — unauthenticated', () => {
  test('no session → 401 unauthorized', async ({ request }) => {
    const res = await postWithServerRetry(request, '/api/stripe/billing-portal', {
      data: { listSubscriptionId: '00000000-0000-4000-8000-000000000000' },
    });
    skipIfStripeUnconfigured(res);
    expect(res.status()).toBe(401);
    expect((await res.json()).error).toBe('unauthorized');
  });
});
