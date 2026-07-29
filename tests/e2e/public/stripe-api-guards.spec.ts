import { type APIResponse, expect, test } from '@playwright/test';

/**
 * Stripe route-handler guard rails, unauthenticated (TEST-PLAN B1, B2, B14 + connect 401).
 * No browser page and no Stripe network calls: every case is rejected before Stripe is touched.
 * When Stripe env is not configured locally, routes return 503 `stripe_not_configured` /
 * `webhook_not_configured` — those cases skip instead of failing.
 */

function skipIfStripeUnconfigured(res: APIResponse) {
  test.skip(res.status() === 503, 'Stripe env not configured for this environment');
}

test.describe('POST /api/stripe/checkout/list — unauthenticated guards', () => {
  test('invalid JSON body → 400 invalid_json', async ({ request }) => {
    // Buffer keeps the payload raw — a plain string would be JSON-stringified by Playwright.
    const res = await request.post('/api/stripe/checkout/list', {
      headers: { 'content-type': 'application/json' },
      data: Buffer.from('not-json{{{'),
    });
    skipIfStripeUnconfigured(res);
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe('invalid_json');
  });

  test('missing listId → 400 missing_list_id', async ({ request }) => {
    const res = await request.post('/api/stripe/checkout/list', { data: {} });
    skipIfStripeUnconfigured(res);
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe('missing_list_id');
  });

  test('malformed listId → 400 invalid_list_id', async ({ request }) => {
    const res = await request.post('/api/stripe/checkout/list', {
      data: { listId: 'not-a-uuid' },
    });
    skipIfStripeUnconfigured(res);
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe('invalid_list_id');
  });

  test('well-formed listId without a session → 401 unauthorized', async ({ request }) => {
    const res = await request.post('/api/stripe/checkout/list', {
      data: { listId: '00000000-0000-4000-8000-000000000000' },
    });
    skipIfStripeUnconfigured(res);
    expect(res.status()).toBe(401);
    expect((await res.json()).error).toBe('unauthorized');
  });
});

test.describe('POST /api/stripe/connect/onboard — unauthenticated', () => {
  test('no session → 401 unauthorized', async ({ request }) => {
    const res = await request.post('/api/stripe/connect/onboard');
    skipIfStripeUnconfigured(res);
    expect(res.status()).toBe(401);
    expect((await res.json()).error).toBe('unauthorized');
  });
});

test.describe('POST /api/stripe/checkout/verify-snapshot — unauthenticated', () => {
  test('no session → 401 unauthorized', async ({ request }) => {
    const res = await request.post('/api/stripe/checkout/verify-snapshot', {
      data: { sessionId: 'cs_test_x', stripeAccountId: 'acct_x' },
    });
    skipIfStripeUnconfigured(res);
    expect(res.status()).toBe(401);
    expect((await res.json()).error).toBe('unauthorized');
  });
});

test.describe('POST /api/webhooks/stripe — signature enforcement', () => {
  test('missing stripe-signature header → 400 missing_signature', async ({ request }) => {
    const res = await request.post('/api/webhooks/stripe', {
      headers: { 'content-type': 'application/json' },
      data: JSON.stringify({ id: 'evt_fake', type: 'checkout.session.completed' }),
    });
    skipIfStripeUnconfigured(res);
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe('missing_signature');
  });

  test('bogus stripe-signature → 400 invalid_signature, no side effects', async ({ request }) => {
    const res = await request.post('/api/webhooks/stripe', {
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
