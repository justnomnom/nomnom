import { expect, test } from '@playwright/test';

/**
 * Web Push route-handler guards, unauthenticated.
 * Body parse starts before auth; missing session still 401s before persist.
 */

test.describe('POST /api/push/subscribe — unauthenticated', () => {
  test('no session → 401 unauthorized', async ({ request }) => {
    const res = await request.post('/api/push/subscribe', {
      data: {
        endpoint: 'https://push.example/sub',
        keys: { p256dh: 'x', auth: 'y' },
      },
    });
    expect(res.status()).toBe(401);
    expect((await res.json()).error).toBe('unauthorized');
  });
});

test.describe('POST /api/push/unsubscribe — unauthenticated', () => {
  test('no session → 401 unauthorized', async ({ request }) => {
    const res = await request.post('/api/push/unsubscribe', {
      data: { endpoint: 'https://push.example/sub' },
    });
    expect(res.status()).toBe(401);
    expect((await res.json()).error).toBe('unauthorized');
  });
});
