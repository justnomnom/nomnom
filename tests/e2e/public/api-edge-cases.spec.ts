import { type APIResponse, expect, test } from '@playwright/test';

/**
 * Edge cases for the public/content and internal API routes: empty/odd query params,
 * wrong HTTP methods (Next returns 405 for undefined handlers), auth-gated endpoints,
 * and injection-shaped input. None of these should 500.
 */

function methodNotAllowed(res: APIResponse) {
  // Next.js returns 405 for an undefined method on a route handler.
  expect(res.status(), `${res.url()} should reject the method`).toBe(405);
}

test.describe('POST /api/email/send — internal, secret-gated', () => {
  test('no Authorization header is rejected (401) or unconfigured (503)', async ({ request }) => {
    const res = await request.post('/api/email/send', {
      data: { to: 'x@example.com', subject: 's', html: '<p>h</p>' },
    });
    expect([401, 503, 429]).toContain(res.status());
  });

  test('bogus bearer token is rejected', async ({ request }) => {
    const res = await request.post('/api/email/send', {
      headers: { authorization: 'Bearer not-the-secret' },
      data: { to: 'x@example.com', subject: 's', html: '<p>h</p>' },
    });
    expect([401, 503, 429]).toContain(res.status());
  });

  test('GET is not allowed', async ({ request }) => {
    methodNotAllowed(await request.get('/api/email/send'));
  });
});

test.describe('POST /api/restaurants/ingest — internal, secret-gated', () => {
  test('no Authorization header is rejected', async ({ request }) => {
    const res = await request.post('/api/restaurants/ingest', { data: { placeId: 'x' } });
    expect([401, 503, 429]).toContain(res.status());
  });

  test('GET is not allowed', async ({ request }) => {
    methodNotAllowed(await request.get('/api/restaurants/ingest'));
  });
});
