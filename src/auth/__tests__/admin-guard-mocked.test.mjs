/**
 * assertAdminUser: session + ADMIN_USER_IDS allowlist.
 */
import assert from 'node:assert/strict';
import { describe, mock, test } from 'node:test';

const ADMIN_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_ID = '11111111-1111-4111-8111-111111111111';

/** @type {object | null} */
let authUser = null;

mock.module('src/libs/supabase/supabase-server-client.js', {
  exports: {
    getSupabaseAuthUser: async () => ({ data: { user: authUser }, error: null }),
    createSupabaseServerClient: async () => ({}),
  },
});

mock.module('src/libs/auth/admin-allowlist.js', {
  exports: {
    isAdminUserId: (id) => id === ADMIN_ID,
  },
});

const { assertAdminUser } = await import('../actions/admin-guard.js');

describe('assertAdminUser', { concurrency: false }, () => {
  test('throws forbidden without a session', async () => {
    authUser = null;
    await assert.rejects(() => assertAdminUser(), /forbidden/);
  });

  test('throws forbidden for a non-allowlisted user', async () => {
    authUser = { id: USER_ID };
    await assert.rejects(() => assertAdminUser(), /forbidden/);
  });

  test('returns the user when allowlisted', async () => {
    authUser = { id: ADMIN_ID, email: 'ops@nomnom.test' };
    const user = await assertAdminUser();
    assert.equal(user.id, ADMIN_ID);
  });
});
