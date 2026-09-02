/**
 * getOrCreateCustomer / ensureUserRecord: session-matched upserts.
 */
import assert from 'node:assert/strict';
import { beforeEach, describe, mock, test } from 'node:test';

const USER_ID = '11111111-1111-4111-8111-111111111111';

/** @type {{ id: string, email?: string } | null} */
let authUser = { id: USER_ID, email: 'a@b.co' };
/** @type {ReturnType<typeof makeClient> | null} */
let supabase = null;
/** @type {(ctx: object) => object} */
let adminHandler = () => ({ data: null, error: null });

mock.module('src/libs/supabase/supabase-server-client.js', {
  exports: {
    createSupabaseServerClient: async () => supabase,
    getSupabaseAuthUser: async () => ({
      data: { user: authUser },
      error: authUser ? null : new Error('no session'),
    }),
  },
});

/**
 * @returns {object}
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
    const ctx = { table, op: 'select', payload: undefined };
    const api = {
      upsert(payload, opts) {
        ctx.op = 'upsert';
        ctx.payload = payload;
        ctx.upsertOpts = opts;
        return api;
      },
      select() {
        if (ctx.op !== 'upsert') ctx.op = 'select';
        return api;
      },
      single() {
        return resolve({ ...ctx, single: true });
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
  };
}

mock.module('src/libs/supabase/supabase-admin.js', {
  exports: {
    supabaseAdminClient: makeAdmin(),
  },
});

const { getOrCreateCustomer, ensureUserRecord } = await import('../actions/auth-actions.js');

/**
 * @param {(ctx: object) => object} handler
 */
function makeClient(handler) {
  const calls = [];

  function resolve(ctx) {
    calls.push(ctx);
    return Promise.resolve(handler(ctx)).then((result) => {
      if (result && typeof result === 'object' && ('data' in result || 'error' in result)) {
        return result;
      }
      return { data: result ?? null, error: null };
    });
  }

  function builder(table) {
    const ctx = { table, op: 'select', payload: undefined, filter: {} };
    const api = {
      select() {
        if (ctx.op !== 'upsert') ctx.op = 'select';
        return api;
      },
      upsert(payload, opts) {
        ctx.op = 'upsert';
        ctx.payload = payload;
        ctx.upsertOpts = opts;
        return api;
      },
      eq(col, val) {
        ctx.filter[col] = val;
        return api;
      },
      maybeSingle() {
        return resolve({ ...ctx, single: 'maybe' });
      },
      then(onFulfilled, onRejected) {
        return resolve({ ...ctx }).then(onFulfilled, onRejected);
      },
    };
    return api;
  }

  return {
    calls,
    from(table) {
      return builder(table);
    },
  };
}

describe('ensureUserRecord / getOrCreateCustomer', { concurrency: false }, () => {
  beforeEach(() => {
    authUser = { id: USER_ID, email: 'a@b.co' };
    adminHandler = () => ({ data: { id: USER_ID, email: 'a@b.co' }, error: null });
    supabase = null;
  });

  test('ensureUserRecord upserts the session identity and returns the row', async () => {
    let upserted;
    adminHandler = (ctx) => {
      if (ctx.table === 'users' && ctx.op === 'upsert') {
        upserted = ctx.payload;
        return { data: { id: USER_ID, email: 'a@b.co' }, error: null };
      }
      return { data: null, error: null };
    };
    const row = await ensureUserRecord({ id: USER_ID, email: 'ignored@evil.test' });
    assert.equal(row.id, USER_ID);
    assert.equal(upserted.id, USER_ID);
    assert.equal(upserted.email, 'a@b.co');
  });

  test('ensureUserRecord returns null when the upsert errors', async () => {
    adminHandler = () => ({ data: null, error: { message: 'unique', code: '23505' } });
    assert.equal(await ensureUserRecord({ id: USER_ID, email: 'a@b.co' }), null);
  });

  test('getOrCreateCustomer returns ok when a customers row already exists', async () => {
    supabase = makeClient((ctx) => {
      if (ctx.table === 'customers' && ctx.single === 'maybe') {
        return { data: { id: USER_ID }, error: null };
      }
      return { data: null, error: null };
    });
    assert.deepEqual(await getOrCreateCustomer({ userId: USER_ID, email: 'a@b.co' }), { ok: true });
    assert.equal(
      supabase.calls.some((c) => c.table === 'customers' && c.op === 'upsert'),
      false
    );
  });

  test('getOrCreateCustomer upserts when missing; upsert error returns null', async () => {
    supabase = makeClient((ctx) => {
      if (ctx.table === 'customers' && ctx.single === 'maybe') {
        return { data: null, error: null };
      }
      if (ctx.table === 'customers' && ctx.op === 'upsert') {
        return { data: { id: USER_ID }, error: null };
      }
      return { data: null, error: null };
    });
    assert.deepEqual(await getOrCreateCustomer({ userId: USER_ID, email: 'a@b.co' }), { ok: true });
    const upsert = supabase.calls.find((c) => c.table === 'customers' && c.op === 'upsert');
    assert.equal(upsert.payload.id, USER_ID);

    supabase = makeClient((ctx) => {
      if (ctx.table === 'customers' && ctx.single === 'maybe') {
        return { data: null, error: null };
      }
      if (ctx.table === 'customers' && ctx.op === 'upsert') {
        return { data: null, error: { message: 'fail' } };
      }
      return { data: null, error: null };
    });
    assert.equal(await getOrCreateCustomer({ userId: USER_ID, email: 'a@b.co' }), null);
  });
});
