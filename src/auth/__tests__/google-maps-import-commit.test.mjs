/**
 * commitGoogleMapsImport: list create/add, upsert failure, missing-place support email.
 */
import assert from 'node:assert/strict';
import { beforeEach, describe, mock, test } from 'node:test';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const LIST_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const RESTAURANT_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const DUP_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

/** @type {{ id: string, email?: string } | null} */
let authUser = { id: USER_ID, email: 'importer@nomnom.test' };
/** @type {ReturnType<typeof makeSupabaseMock> | null} */
let supabase = null;
const sent = [];
/** @type {(payload: object) => Promise<void>} */
let sendImpl = async (payload) => {
  sent.push(payload);
};

mock.module('src/libs/supabase/supabase-server-client.js', {
  exports: {
    createSupabaseServerClient: async () => supabase,
    getSupabaseAuthUser: async () => ({ data: { user: authUser }, error: null }),
  },
});

mock.module('src/config-global.js', {
  exports: {
    RESEND_API: { key: 'rk', from: 'NomNom <hi@nomnom.test>', to: 'ops@nomnom.test' },
    FEEDBACK_INBOUND_EMAIL: 'ops@nomnom.test',
  },
});

mock.module('src/libs/email/resend-server-send.js', {
  exports: {
    sendResendEmail: async (payload) => sendImpl(payload),
  },
});

const { commitGoogleMapsImport } = await import('../actions/google-maps-import-actions.js');

/**
 * @param {(ctx: object) => object} handler
 */
function makeSupabaseMock(handler) {
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
    const ctx = {
      kind: 'from',
      table,
      op: 'select',
      payload: undefined,
      filter: {},
    };
    const api = {
      select() {
        if (ctx.op !== 'update' && ctx.op !== 'upsert') ctx.op = 'select';
        return api;
      },
      upsert(payload, opts) {
        ctx.op = 'upsert';
        ctx.payload = payload;
        ctx.upsertOpts = opts;
        return api;
      },
      update(payload) {
        ctx.op = 'update';
        ctx.payload = payload;
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
    rpc(name, args) {
      const p = resolve({ kind: 'rpc', rpc: name, args });
      return { then: p.then.bind(p), catch: p.catch.bind(p) };
    },
  };
}

describe('commitGoogleMapsImport', { concurrency: false }, () => {
  beforeEach(() => {
    authUser = { id: USER_ID, email: 'importer@nomnom.test' };
    sent.length = 0;
    sendImpl = async (payload) => {
      sent.push(payload);
    };
    supabase = null;
  });

  test('invalid visibility falls back to public on create', async () => {
    supabase = makeSupabaseMock((ctx) => {
      if (ctx.rpc === 'create_user_list') {
        return { data: LIST_ID, error: null };
      }
      return { data: null, error: null };
    });
    const out = await commitGoogleMapsImport({
      listName: 'Lisbon',
      restaurantIds: [RESTAURANT_ID],
      visibility: 'friends_only',
    });
    assert.deepEqual(out, { error: null, listId: LIST_ID });
    const create = supabase.calls.find((c) => c.rpc === 'create_user_list');
    assert.equal(create.args.p_visibility, 'public');
    const publish = supabase.calls.find((c) => c.table === 'lists' && c.op === 'update');
    assert.ok(publish?.payload?.published_at);
  });

  test('existing list skips create; duplicate restaurant ids become one upsert row', async () => {
    supabase = makeSupabaseMock((ctx) => {
      if (ctx.table === 'lists' && ctx.single === 'maybe') {
        return { data: { id: LIST_ID, user_id: USER_ID }, error: null };
      }
      return { data: null, error: null };
    });
    const out = await commitGoogleMapsImport({
      listId: LIST_ID,
      restaurantIds: [RESTAURANT_ID, RESTAURANT_ID, DUP_ID],
      visibility: 'private',
    });
    assert.deepEqual(out, { error: null, listId: LIST_ID });
    const upsert = supabase.calls.find((c) => c.table === 'list_items' && c.op === 'upsert');
    assert.equal(upsert.payload.length, 2);
    assert.equal(upsert.upsertOpts.onConflict, 'list_id,restaurant_id');
    assert.equal(
      supabase.calls.some((c) => c.rpc === 'create_user_list'),
      false
    );
    assert.equal(
      supabase.calls.some((c) => c.table === 'lists' && c.op === 'update'),
      false
    );
  });

  test('list_items upsert error → restaurants_add_failed keeps listId', async () => {
    supabase = makeSupabaseMock((ctx) => {
      if (ctx.rpc === 'create_user_list') {
        return { data: LIST_ID, error: null };
      }
      if (ctx.table === 'list_items' && ctx.op === 'upsert') {
        return { data: null, error: { message: 'unique' } };
      }
      return { data: null, error: null };
    });
    const out = await commitGoogleMapsImport({
      listName: 'Saved',
      restaurantIds: [RESTAURANT_ID],
    });
    assert.deepEqual(out, { error: 'restaurants_add_failed', listId: LIST_ID });
  });

  test('missingPlaces emails support and still succeeds', async () => {
    supabase = makeSupabaseMock((ctx) => {
      if (ctx.table === 'lists' && ctx.single === 'maybe') {
        return { data: { id: LIST_ID, user_id: USER_ID }, error: null };
      }
      return { data: null, error: null };
    });
    const out = await commitGoogleMapsImport({
      listId: LIST_ID,
      listName: 'Lisbon lunch',
      restaurantIds: [RESTAURANT_ID],
      missingPlaces: [
        { name: 'Hidden tasca', address: 'Alfama', lat: 38.71, lng: -9.13 },
        { name: '   ' },
      ],
    });
    assert.deepEqual(out, { error: null, listId: LIST_ID });
    assert.equal(sent.length, 1);
    assert.match(sent[0].subject, /Missing restaurants from Maps import \(2\)/);
    assert.match(sent[0].html, /Hidden tasca/);
    assert.match(sent[0].html, /importer@nomnom.test/);
    assert.equal(sent[0].to, 'ops@nomnom.test');
  });

  test('support email throw does not fail the import', async () => {
    sendImpl = async () => {
      throw new Error('smtp_down');
    };
    supabase = makeSupabaseMock((ctx) => {
      if (ctx.table === 'lists' && ctx.single === 'maybe') {
        return { data: { id: LIST_ID, user_id: USER_ID }, error: null };
      }
      return { data: null, error: null };
    });
    const out = await commitGoogleMapsImport({
      listId: LIST_ID,
      restaurantIds: [RESTAURANT_ID],
      missingPlaces: [{ name: 'Tasca' }],
    });
    assert.deepEqual(out, { error: null, listId: LIST_ID });
  });
});
