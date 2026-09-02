/**
 * OAuth callback destination (TEST-PLAN A8): new users go to onboarding, returning
 * users keep returnTo, open redirects and exchange failures never leave the origin.
 */
import assert from 'node:assert/strict';
import { beforeEach, describe, mock, test } from 'node:test';

import { SUPABASE_API } from 'src/config-global.js';

const FALLBACK_SUPABASE_URL = 'https://proj.supabase.co';
const FALLBACK_SUPABASE_KEY = 'anon-key';

/** @type {{ name: string, value: string }[]} */
let cookieJar = [];
/** @type {object | null} */
let exchangeError = null;
/** @type {{ id: string } | null} */
let sessionUser = null;
/** @type {{ data: { onboarding_completed_at: string | null } | null, error: object | null }} */
let profileRow = { data: null, error: null };

mock.module('next/headers', {
  exports: {
    cookies: async () => ({
      get: (name) => cookieJar.find((c) => c.name === name),
      getAll: () => cookieJar,
      set() {},
    }),
  },
});

mock.module('@supabase/ssr', {
  exports: {
    createServerClient: () => ({
      auth: {
        exchangeCodeForSession: async () => ({ error: exchangeError }),
        getUser: async () => ({ data: { user: sessionUser } }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => profileRow,
          }),
        }),
      }),
    }),
  },
});

const { GET } = await import('../../app/(frontend)/auth/callback/route.js');

/**
 * @param {string} path
 * @returns {{ url: string }}
 */
function request(path) {
  return { url: `http://localhost:3032${path}` };
}

describe('auth/callback GET', { concurrency: false }, () => {
  beforeEach(() => {
    cookieJar = [];
    exchangeError = null;
    sessionUser = null;
    profileRow = { data: null, error: null };
    if (!SUPABASE_API.url) SUPABASE_API.url = FALLBACK_SUPABASE_URL;
    if (!SUPABASE_API.key) SUPABASE_API.key = FALLBACK_SUPABASE_KEY;
  });

  test('missing code redirects to a sanitized returnTo', async () => {
    const res = await GET(request('/auth/callback?returnTo=/about'));
    assert.equal(res.headers.get('location'), 'http://localhost:3032/about');
  });

  test('open-redirect shaped returnTo falls back to home', async () => {
    const res = await GET(request('/auth/callback?returnTo=https://evil.example/'));
    assert.equal(res.headers.get('location'), 'http://localhost:3032/');
  });

  test('auth_return_to cookie supplies returnTo when the query is empty', async () => {
    cookieJar = [{ name: 'auth_return_to', value: encodeURIComponent('/dashboard/lists') }];
    const res = await GET(request('/auth/callback'));
    assert.equal(res.headers.get('location'), 'http://localhost:3032/dashboard/lists');
  });

  test('missing supabase config redirects to login with configuration error', async () => {
    const savedUrl = SUPABASE_API.url;
    const savedKey = SUPABASE_API.key;
    SUPABASE_API.url = '';
    SUPABASE_API.key = '';
    try {
      const res = await GET(request('/auth/callback?code=pkce'));
      const location = res.headers.get('location') || '';
      assert.match(location, /auth_error=1/);
      assert.match(location, /error=configuration/);
    } finally {
      SUPABASE_API.url = savedUrl || FALLBACK_SUPABASE_URL;
      SUPABASE_API.key = savedKey || FALLBACK_SUPABASE_KEY;
    }
  });

  test('exchange failure redirects to login', async () => {
    exchangeError = { message: 'invalid_grant' };
    const res = await GET(request('/auth/callback?code=pkce&returnTo=/dashboard/discover'));
    const location = res.headers.get('location') || '';
    assert.match(location, /auth_error=1/);
    assert.match(location, /error=exchange_failed/);
  });

  test('new user without onboarding_completed_at lands on /onboarding', async () => {
    sessionUser = { id: '11111111-1111-4111-8111-111111111111' };
    profileRow = { data: { onboarding_completed_at: null }, error: null };
    const res = await GET(request('/auth/callback?code=pkce&returnTo=/dashboard/discover'));
    assert.equal(res.headers.get('location'), 'http://localhost:3032/onboarding');
  });

  test('returning user keeps returnTo', async () => {
    sessionUser = { id: '11111111-1111-4111-8111-111111111111' };
    profileRow = { data: { onboarding_completed_at: '2026-01-01T00:00:00.000Z' }, error: null };
    const res = await GET(request('/auth/callback?code=pkce&returnTo=/dashboard/discover'));
    assert.equal(res.headers.get('location'), 'http://localhost:3032/dashboard/discover');
  });

  test('profile read error does not force onboarding', async () => {
    sessionUser = { id: '11111111-1111-4111-8111-111111111111' };
    profileRow = { data: null, error: { message: 'timeout' } };
    const res = await GET(request('/auth/callback?code=pkce&returnTo=/dashboard/discover'));
    assert.equal(res.headers.get('location'), 'http://localhost:3032/dashboard/discover');
  });
});
