/**
 * POST /api/auth/session-setup: session required; optional names are truncated.
 */
import assert from 'node:assert/strict';
import { beforeEach, describe, mock, test } from 'node:test';

/** @type {{ id: string, email: string } | null} */
let authUser = null;
/** @type {object[]} */
const customerCalls = [];

mock.module('src/libs/supabase/supabase-server-client.js', {
  exports: {
    getSupabaseAuthUser: async () => ({ data: { user: authUser }, error: null }),
  },
});

mock.module('src/auth/actions/auth-actions.js', {
  exports: {
    getOrCreateCustomer: async (input) => {
      customerCalls.push(input);
      return { id: 'cust_1' };
    },
  },
});

const { POST } = await import('../../app/(frontend)/api/auth/session-setup/route.js');

describe('POST /api/auth/session-setup', { concurrency: false }, () => {
  beforeEach(() => {
    authUser = null;
    customerCalls.length = 0;
  });

  test('no session → 401', async () => {
    const res = await POST({ json: async () => ({ firstName: 'A' }) });
    assert.equal(res.status, 401);
    assert.equal((await res.json()).error, 'unauthorized');
    assert.equal(customerCalls.length, 0);
  });

  test('authed user creates the customer row and truncates names', async () => {
    authUser = { id: '11111111-1111-4111-8111-111111111111', email: 'a@b.co' };
    const res = await POST({
      json: async () => ({ firstName: 'x'.repeat(120), lastName: 'Y' }),
    });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
    assert.equal(customerCalls.length, 1);
    assert.equal(customerCalls[0].firstName.length, 100);
    assert.equal(customerCalls[0].lastName, 'Y');
    assert.equal(customerCalls[0].email, 'a@b.co');
  });

  test('invalid JSON body still succeeds with empty names', async () => {
    authUser = { id: '11111111-1111-4111-8111-111111111111', email: 'a@b.co' };
    const res = await POST({
      json: async () => {
        throw new SyntaxError('bad json');
      },
    });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
    assert.deepEqual(customerCalls[0].firstName, '');
    assert.deepEqual(customerCalls[0].lastName, '');
  });
});
