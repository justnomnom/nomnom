import { expect, test } from '@playwright/test';

import {
  computeE2EGlobalSetupAuth,
  computeE2ELoginIdentifier,
  computeE2ETestUserEmailForDb,
} from './test-credentials-resolve';

test.describe('test-credentials-resolve (pure)', () => {
  test('global setup: succeeds with email + base env', () => {
    const r = computeE2EGlobalSetupAuth({
      url: 'https://x.supabase.co',
      anonKey: 'anon',
      password: 'secret',
      emailRaw: 'e2e@example.com',
      usernameRaw: '',
      serviceRolePresent: false,
      resolvedEmailFromUsername: null,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.email).toBe('e2e@example.com');
      expect(r.password).toBe('secret');
    }
  });

  test('global setup: email wins over username when both set', () => {
    const r = computeE2EGlobalSetupAuth({
      url: 'u',
      anonKey: 'k',
      password: 'p',
      emailRaw: 'first@x.com',
      usernameRaw: 'handle',
      serviceRolePresent: true,
      resolvedEmailFromUsername: null,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.email).toBe('first@x.com');
  });

  test('global setup: username requires service role', () => {
    const r = computeE2EGlobalSetupAuth({
      url: 'u',
      anonKey: 'k',
      password: 'p',
      emailRaw: '',
      usernameRaw: 'foo',
      serviceRolePresent: false,
      resolvedEmailFromUsername: null,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.missing.some((m) => m.includes('SERVICE_ROLE'))).toBe(true);
    }
  });

  test('global setup: username + service role + resolved email succeeds', () => {
    const r = computeE2EGlobalSetupAuth({
      url: 'u',
      anonKey: 'k',
      password: 'p',
      emailRaw: '',
      usernameRaw: 'foo',
      serviceRolePresent: true,
      resolvedEmailFromUsername: 'real@db.com',
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.email).toBe('real@db.com');
  });

  test('global setup: username resolved to null fails with profile hint', () => {
    const r = computeE2EGlobalSetupAuth({
      url: 'u',
      anonKey: 'k',
      password: 'p',
      emailRaw: '',
      usernameRaw: 'ghost',
      serviceRolePresent: true,
      resolvedEmailFromUsername: null,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.missing.some((m) => m.includes('ghost'))).toBe(true);
    }
  });

  test('global setup: lookup error surfaces', () => {
    const r = computeE2EGlobalSetupAuth({
      url: 'u',
      anonKey: 'k',
      password: 'p',
      emailRaw: '',
      usernameRaw: 'foo',
      serviceRolePresent: true,
      resolvedEmailFromUsername: null,
      usernameLookupError: 'network down',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.missing.some((m) => m.includes('network down'))).toBe(true);
    }
  });

  test('global setup: missing password', () => {
    const r = computeE2EGlobalSetupAuth({
      url: 'u',
      anonKey: 'k',
      password: '',
      emailRaw: 'a@b.com',
      usernameRaw: '',
      serviceRolePresent: true,
      resolvedEmailFromUsername: null,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing).toContain('E2E_TEST_USER_PASSWORD');
  });

  test('global setup: missing identity', () => {
    const r = computeE2EGlobalSetupAuth({
      url: 'u',
      anonKey: 'k',
      password: 'p',
      emailRaw: '',
      usernameRaw: '',
      serviceRolePresent: true,
      resolvedEmailFromUsername: null,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.missing.some((m) => m.includes('E2E_TEST_USER_EMAIL'))).toBe(true);
    }
  });

  test('login identifier: prefers email', () => {
    expect(
      computeE2ELoginIdentifier('a@b.com', 'handle')
    ).toBe('a@b.com');
  });

  test('login identifier: strips @ from username', () => {
    expect(computeE2ELoginIdentifier(undefined, '@foo')).toBe('foo');
  });

  test('login identifier: throws when empty', () => {
    expect(() => computeE2ELoginIdentifier(undefined, undefined)).toThrow(
      /E2E_TEST_USER_EMAIL or E2E_TEST_USER_USERNAME/
    );
  });

  test('DB email: from env email', () => {
    const r = computeE2ETestUserEmailForDb('User@X.COM', undefined, null);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.email).toBe('user@x.com');
  });

  test('DB email: from resolved username', () => {
    const r = computeE2ETestUserEmailForDb(undefined, 'bar', 'Bar@z.com');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.email).toBe('bar@z.com');
  });

  test('DB email: missing both', () => {
    const r = computeE2ETestUserEmailForDb(undefined, undefined, null);
    expect(r.ok).toBe(false);
  });
});
