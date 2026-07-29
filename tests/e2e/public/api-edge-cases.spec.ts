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

test.describe('GET /api/posts/search', () => {
  test('no query returns an empty result set', async ({ request }) => {
    test.setTimeout(120_000); // first hit cold-compiles the route handler
    const res = await request.get('/api/posts/search');
    expect(res.status()).toBe(200);
    expect((await res.json()).results).toEqual([]);
  });

  test('blank query returns an empty result set', async ({ request }) => {
    const res = await request.get('/api/posts/search?query=%20%20');
    expect(res.status()).toBe(200);
    expect((await res.json()).results).toEqual([]);
  });

  test('injection-shaped query does not 500', async ({ request }) => {
    const res = await request.get(`/api/posts/search?query=${encodeURIComponent("'; DROP TABLE posts;--")}`);
    expect(res.status()).toBe(200);
  });

  test('POST is not allowed', async ({ request }) => {
    methodNotAllowed(await request.post('/api/posts/search', { data: {} }));
  });
});

test.describe('GET /api/posts/latest', () => {
  test('returns latestPosts array', async ({ request }) => {
    const res = await request.get('/api/posts/latest');
    expect(res.status()).toBe(200);
    expect(Array.isArray((await res.json()).latestPosts)).toBe(true);
  });

  test('POST is not allowed', async ({ request }) => {
    methodNotAllowed(await request.post('/api/posts/latest', { data: {} }));
  });
});

test.describe('GET /api/posts', () => {
  test('list shape without title', async ({ request }) => {
    const res = await request.get('/api/posts');
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('posts');
    expect(json).toHaveProperty('totalPages');
  });

  test('unknown title returns 404', async ({ request }) => {
    const res = await request.get('/api/posts?title=definitely-not-a-real-post-xyz');
    expect(res.status()).toBe(404);
  });

  test('non-numeric limit/page do not 500', async ({ request }) => {
    const res = await request.get('/api/posts?limit=abc&page=-3');
    expect(res.status()).toBeLessThan(500);
  });
});

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
