/**
 * user_location_follows sync: delete-then-insert with snapshot restore on insert failure.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  syncUserLocalityFollows,
  syncUserPrimaryLocalityFollow,
} from '../actions/location-follow-sync.js';

/**
 * @param {{
 *   previous?: object[],
 *   readError?: object | null,
 *   deleteError?: object | null,
 *   insertError?: object | null,
 *   restoreError?: object | null,
 * }} opts
 */
function makeClient(opts = {}) {
  const calls = [];
  let insertRound = 0;
  return {
    calls,
    from(table) {
      const ctx = { table, op: 'select', payload: undefined, filter: {} };
      const api = {
        select() {
          ctx.op = ctx.op === 'insert' ? 'insert' : 'select';
          return api;
        },
        insert(payload) {
          ctx.op = 'insert';
          ctx.payload = payload;
          return api;
        },
        delete() {
          ctx.op = 'delete';
          return api;
        },
        eq(col, val) {
          ctx.filter[col] = val;
          return api;
        },
        then(onFulfilled, onRejected) {
          calls.push({ ...ctx, payload: ctx.payload });
          let result;
          if (ctx.op === 'select') {
            result = opts.readError
              ? { data: null, error: opts.readError }
              : { data: opts.previous ?? [], error: null };
          } else if (ctx.op === 'delete') {
            result = { data: null, error: opts.deleteError ?? null };
          } else if (ctx.op === 'insert') {
            insertRound += 1;
            const err = insertRound === 1 ? opts.insertError : opts.restoreError;
            result = { data: ctx.payload, error: err ?? null };
          } else {
            result = { data: null, error: null };
          }
          return Promise.resolve(result).then(onFulfilled, onRejected);
        },
      };
      return api;
    },
  };
}

test('syncUserLocalityFollows: read error does not delete', async () => {
  const supabase = makeClient({ readError: { message: 'rls' } });
  const out = await syncUserLocalityFollows(supabase, 'u1', ['loc-1']);
  assert.deepEqual(out, { error: 'rls' });
  assert.equal(
    supabase.calls.some((c) => c.op === 'delete'),
    false
  );
});

test('syncUserLocalityFollows: empty ids still delete then skip insert', async () => {
  const supabase = makeClient({ previous: [{ user_id: 'u1', locality_id: 'old', sort_order: 0 }] });
  const out = await syncUserLocalityFollows(supabase, 'u1', []);
  assert.deepEqual(out, { ok: true });
  assert.equal(
    supabase.calls.some((c) => c.op === 'delete'),
    true
  );
  assert.equal(
    supabase.calls.some((c) => c.op === 'insert'),
    false
  );
});

test('syncUserPrimaryLocalityFollow: writes sort_order 0 for the single locality', async () => {
  const supabase = makeClient();
  const out = await syncUserPrimaryLocalityFollow(supabase, 'u1', 'loc-a');
  assert.deepEqual(out, { ok: true });
  const ins = supabase.calls.find((c) => c.op === 'insert');
  assert.deepEqual(ins.payload, [{ user_id: 'u1', locality_id: 'loc-a', sort_order: 0 }]);
});

test('syncUserLocalityFollows: insert FK failure restores snapshot and maps invalid_location', async () => {
  const previous = [{ user_id: 'u1', locality_id: 'old', sort_order: 0 }];
  const supabase = makeClient({
    previous,
    insertError: { message: 'fk', code: '23503' },
  });
  const out = await syncUserLocalityFollows(supabase, 'u1', ['bad-loc']);
  assert.deepEqual(out, { error: 'invalid_location' });
  const inserts = supabase.calls.filter((c) => c.op === 'insert');
  assert.equal(inserts.length, 2);
  assert.deepEqual(inserts[1].payload, previous);
});

test('syncUserLocalityFollows: generic insert error restores and returns the message', async () => {
  const supabase = makeClient({
    previous: [{ user_id: 'u1', locality_id: 'old', sort_order: 0 }],
    insertError: { message: 'timeout', code: '57014' },
  });
  const out = await syncUserLocalityFollows(supabase, 'u1', ['loc-1']);
  assert.deepEqual(out, { error: 'timeout' });
});
