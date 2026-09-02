/**
 * deleteAccount: subscriber block, Stripe teardown abort, success path.
 */
import assert from 'node:assert/strict';
import { beforeEach, describe, mock, test } from 'node:test';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const LIST_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

/** @type {{ id: string } | null} */
let authUser = { id: USER_ID };
/** @type {{ ok: boolean, error?: string }} */
let teardown = { ok: true };
let authDeleteError = null;
const deleted = [];

mock.module('src/libs/supabase/supabase-server-client.js', {
  exports: {
    createSupabaseServerClient: async () => ({}),
    getSupabaseAuthUser: async () => ({
      data: { user: authUser },
      error: authUser ? null : new Error('no session'),
    }),
  },
});

mock.module('src/libs/stripe/stripe-server.js', {
  exports: {
    getStripe: () => null,
  },
});

mock.module('src/libs/stripe/user-stripe-teardown.js', {
  exports: {
    tearDownUserStripe: async () => teardown,
  },
});

/**
 * @returns {object} Chainable admin client stub.
 */
function makeAdmin() {
  function resolve(ctx) {
    return Promise.resolve(adminHandler(ctx)).then((result) => {
      if (result && typeof result === 'object' && ('data' in result || 'error' in result)) {
        return result;
      }
      return { data: result ?? null, error: null };
    });
  }

  function builder(table) {
    const ctx = { table, op: 'select', filter: {}, inFilter: undefined };
    const api = {
      select() {
        if (ctx.op !== 'delete') ctx.op = 'select';
        return api;
      },
      delete() {
        ctx.op = 'delete';
        deleted.push(table);
        return api;
      },
      eq(col, val) {
        ctx.filter[col] = val;
        return api;
      },
      in(col, vals) {
        ctx.inFilter = { col, vals };
        return api;
      },
      not() {
        return api;
      },
      or() {
        return api;
      },
      limit() {
        return api;
      },
      then(onFulfilled, onRejected) {
        return resolve({ ...ctx }).then(onFulfilled, onRejected);
      },
    };
    return api;
  }

  return {
    from(table) {
      return builder(table);
    },
    auth: {
      admin: {
        deleteUser: async () => ({ error: authDeleteError }),
      },
    },
  };
}

/** @type {(ctx: object) => object} */
let adminHandler = () => ({ data: [], error: null });

mock.module('src/libs/supabase/supabase-admin.js', {
  exports: {
    supabaseAdminClient: makeAdmin(),
  },
});

const { deleteAccount } = await import('../actions/auth-actions.js');

describe('deleteAccount', { concurrency: false }, () => {
  beforeEach(() => {
    authUser = { id: USER_ID };
    teardown = { ok: true };
    authDeleteError = null;
    deleted.length = 0;
    adminHandler = () => ({ data: [], error: null });
  });

  test('blocks deletion while owned lists have active subscribers', async () => {
    adminHandler = (ctx) => {
      if (ctx.table === 'lists' && ctx.op === 'select') {
        return { data: [{ id: LIST_ID }], error: null };
      }
      if (ctx.table === 'list_subscriptions' && ctx.op === 'select') {
        return { data: [{ id: 'sub_1' }], error: null };
      }
      return { data: [], error: null };
    };
    assert.deepEqual(await deleteAccount(), {
      success: false,
      error: 'has_active_subscribers',
    });
  });

  test('aborts when Stripe teardown fails', async () => {
    teardown = { ok: false, error: 'stripe_teardown_failed' };
    adminHandler = () => ({ data: [], error: null });
    assert.deepEqual(await deleteAccount(), {
      success: false,
      error: 'stripe_teardown_failed',
    });
  });

  test('deletes profile rows and auth user when teardown succeeds', async () => {
    adminHandler = (ctx) => {
      if (ctx.table === 'lists' && ctx.op === 'select' && !ctx.inFilter) {
        return { data: [{ id: LIST_ID }], error: null };
      }
      return { data: [], error: null };
    };
    assert.deepEqual(await deleteAccount(), { success: true });
    assert.ok(deleted.includes('customers'));
    assert.ok(deleted.includes('users'));
    assert.ok(deleted.includes('user_follows'));
    assert.ok(deleted.includes('list_items'));
    assert.ok(deleted.includes('lists'));
  });

  test('auth delete error surfaces', async () => {
    authDeleteError = { message: 'auth_gone' };
    assert.deepEqual(await deleteAccount(), {
      success: false,
      error: 'auth_gone',
    });
  });
});
