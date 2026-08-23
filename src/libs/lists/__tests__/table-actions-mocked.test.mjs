/**
 * Table server actions with a mocked Supabase RPC client.
 */
import assert from 'node:assert/strict';
import { describe, mock, test } from 'node:test';

import { TABLE_PLACES_ABUSE_CAP } from '../table-payload.js';

const LIST_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const TABLE_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const RESTAURANT_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const GUEST_KEY = 'guest-key-ok';

/** UUIDs are normalized before the RPC, so the shortlist must be real ids. */
const uuid = (n) => `dddddddd-dddd-4ddd-8ddd-${String(n).padStart(12, '0')}`;

/** @type {object | null} */
let authUser = { id: USER_ID };
/** @type {ReturnType<typeof makeRpcClient> | null} */
let supabase = null;

mock.module('src/libs/supabase/supabase-server-client.js', {
  exports: {
    createSupabaseServerClient: async () => supabase,
    getSupabaseAuthUser: async () => ({ data: { user: authUser }, error: null }),
  },
});

const { startTable, fetchTable, fetchTableDecide, addTablePlace, castTableVote, nameGuest, lockTable } =
  await import('../actions/table-actions.js');

/**
 * @param {(ctx: { rpc: string, args: object }) => object} handler
 */
function makeRpcClient(handler) {
  const calls = [];
  return {
    calls,
    rpc(name, args) {
      const ctx = { kind: 'rpc', rpc: name, args };
      calls.push(ctx);
      return Promise.resolve(handler(ctx)).then((result) => {
        if (result && typeof result === 'object' && ('data' in result || 'error' in result)) {
          return result;
        }
        return { data: result ?? null, error: null };
      });
    },
  };
}

describe('table-actions mocked RPCs', { concurrency: false }, () => {
  test('startTable: two places need_three; six places still call RPC', async () => {
    authUser = { id: USER_ID };
    supabase = makeRpcClient(() => ({ data: { table_id: TABLE_ID }, error: null }));
    assert.deepEqual(await startTable({ listId: LIST_ID, restaurantIds: [uuid(1), uuid(2)] }), {
      table: null,
      error: 'need_three_places',
    });
    assert.equal(supabase.calls.length, 0);

    const six = [uuid(1), uuid(2), uuid(3), uuid(4), uuid(5), uuid(6)];
    const out = await startTable({ listId: LIST_ID, restaurantIds: six });
    assert.equal(out.error, null);
    assert.equal(out.table?.table_id, TABLE_ID);
    assert.equal(supabase.calls[0].rpc, 'start_table');
    assert.deepEqual(supabase.calls[0].args.p_restaurant_ids, six);
    assert.equal(supabase.calls[0].args.p_starts_at, null);
  });

  test('startTable: forwards a timestamptz and drops timezone-less local strings', async () => {
    authUser = { id: USER_ID };
    supabase = makeRpcClient(() => ({ data: { table_id: TABLE_ID }, error: null }));
    const iso = '2026-08-19T19:00:00.000Z';
    const withIso = await startTable({
      listId: LIST_ID,
      restaurantIds: [uuid(1), uuid(2), uuid(3)],
      startsAt: iso,
    });
    assert.equal(withIso.error, null);
    assert.equal(supabase.calls[0].args.p_starts_at, iso);

    const local = await startTable({
      listId: LIST_ID,
      restaurantIds: [uuid(1), uuid(2), uuid(3)],
      startsAt: '2026-08-19T20:00',
    });
    assert.equal(local.error, null);
    assert.equal(supabase.calls[1].args.p_starts_at, null);
  });

  test('startTable: de-dupes the shortlist before counting places', async () => {
    authUser = { id: USER_ID };
    supabase = makeRpcClient(() => ({ data: { table_id: TABLE_ID }, error: null }));
    // Four entries, three distinct — the duplicate must not buy its way past the minimum.
    const out = await startTable({
      listId: LIST_ID,
      restaurantIds: [uuid(1), uuid(1), uuid(2), uuid(3)],
    });
    assert.equal(out.error, null);
    assert.deepEqual(supabase.calls[0].args.p_restaurant_ids, [uuid(1), uuid(2), uuid(3)]);
  });

  test('startTable: needs a signed-in user and a list id', async () => {
    supabase = makeRpcClient(() => ({ data: { table_id: TABLE_ID }, error: null }));
    authUser = { id: USER_ID };
    assert.deepEqual(
      await startTable({ listId: null, restaurantIds: [uuid(1), uuid(2), uuid(3)] }),
      { table: null, error: 'invalid_list' }
    );

    authUser = null;
    assert.deepEqual(
      await startTable({ listId: LIST_ID, restaurantIds: [uuid(1), uuid(2), uuid(3)] }),
      { table: null, error: 'unauthorized' }
    );
    assert.equal(supabase.calls.length, 0);
    authUser = { id: USER_ID };
  });

  test('startTable: abuse cap rejects without RPC', async () => {
    authUser = { id: USER_ID };
    supabase = makeRpcClient(() => ({ data: { table_id: TABLE_ID }, error: null }));
    const ids = Array.from({ length: TABLE_PLACES_ABUSE_CAP + 1 }, (_, i) => uuid(i));
    assert.deepEqual(await startTable({ listId: LIST_ID, restaurantIds: ids }), {
      table: null,
      error: 'too_many_places',
    });
    assert.equal(supabase.calls.length, 0);
  });

  test('addTablePlace: validates ids and guest key before RPC', async () => {
    supabase = makeRpcClient(() => ({ data: { table_id: TABLE_ID }, error: null }));
    assert.deepEqual(
      await addTablePlace({ tableId: '', restaurantId: RESTAURANT_ID, guestKey: GUEST_KEY }),
      { table: null, error: 'table_not_found' }
    );
    assert.deepEqual(
      await addTablePlace({ tableId: TABLE_ID, restaurantId: '', guestKey: GUEST_KEY }),
      { table: null, error: 'invalid_restaurant_id' }
    );
    assert.deepEqual(
      await addTablePlace({ tableId: TABLE_ID, restaurantId: RESTAURANT_ID, guestKey: 'short' }),
      { table: null, error: 'invalid_voter_key' }
    );
    assert.equal(supabase.calls.length, 0);
  });

  test('addTablePlace: maps RPC errors and returns the table on success', async () => {
    supabase = makeRpcClient(() => ({ data: null, error: { message: 'session_locked' } }));
    assert.deepEqual(
      await addTablePlace({
        tableId: TABLE_ID,
        restaurantId: RESTAURANT_ID,
        guestKey: GUEST_KEY,
      }),
      { table: null, error: 'table_locked' }
    );

    supabase = makeRpcClient(() => ({ data: { table_id: TABLE_ID, places: [] }, error: null }));
    const out = await addTablePlace({
      tableId: TABLE_ID,
      restaurantId: RESTAURANT_ID,
      guestKey: GUEST_KEY,
    });
    assert.equal(out.error, null);
    assert.equal(out.table?.table_id, TABLE_ID);
    assert.equal(supabase.calls[0].rpc, 'add_table_place');
  });

  test('castTableVote: only ±1 reaches the RPC', async () => {
    supabase = makeRpcClient(() => ({ data: { table_id: TABLE_ID }, error: null }));
    assert.deepEqual(
      await castTableVote({
        tableId: TABLE_ID,
        restaurantId: RESTAURANT_ID,
        guestKey: GUEST_KEY,
        vote: 2,
      }),
      { table: null, error: 'invalid_vote' }
    );
    assert.equal(supabase.calls.length, 0);

    const out = await castTableVote({
      tableId: TABLE_ID,
      restaurantId: RESTAURANT_ID,
      guestKey: GUEST_KEY,
      vote: -1,
    });
    assert.equal(out.error, null);
    assert.equal(supabase.calls[0].rpc, 'cast_table_vote');
    assert.equal(supabase.calls[0].args.p_vote, -1);
  });

  test('nameGuest: rejects blank and over-long names before RPC', async () => {
    supabase = makeRpcClient(() => ({ data: { table_id: TABLE_ID }, error: null }));
    assert.deepEqual(
      await nameGuest({ tableId: TABLE_ID, guestKey: GUEST_KEY, displayName: '   ' }),
      { table: null, error: 'invalid_display_name' }
    );
    assert.deepEqual(
      await nameGuest({ tableId: TABLE_ID, guestKey: GUEST_KEY, displayName: 'x'.repeat(81) }),
      { table: null, error: 'invalid_display_name' }
    );
    assert.equal(supabase.calls.length, 0);

    const out = await nameGuest({ tableId: TABLE_ID, guestKey: GUEST_KEY, displayName: '  Ana ' });
    assert.equal(out.error, null);
    assert.equal(supabase.calls[0].rpc, 'join_table');
    assert.equal(supabase.calls[0].args.p_display_name, 'Ana');
  });

  test('lockTable: passes the lock token through and normalizes the winner id', async () => {
    supabase = makeRpcClient(() => ({ data: { table_id: TABLE_ID, status: 'locked' }, error: null }));
    const out = await lockTable({
      tableId: TABLE_ID,
      lockToken: 'tok',
      winnerRestaurantId: RESTAURANT_ID,
    });
    assert.equal(out.error, null);
    assert.equal(supabase.calls[0].rpc, 'lock_table');
    assert.equal(supabase.calls[0].args.p_lock_token, 'tok');
    assert.equal(supabase.calls[0].args.p_winner_restaurant_id, RESTAURANT_ID);

    supabase = makeRpcClient(() => ({ data: null, error: { message: 'not_authorized_to_lock' } }));
    assert.deepEqual(await lockTable({ tableId: TABLE_ID }), {
      table: null,
      error: 'not_authorized_to_lock',
    });
  });

  test('startTable: empty title becomes Table; RPC errors and missing table_id map cleanly', async () => {
    authUser = { id: USER_ID };
    supabase = makeRpcClient(() => ({ data: { table_id: TABLE_ID }, error: null }));
    const titled = await startTable({
      listId: LIST_ID,
      restaurantIds: [uuid(1), uuid(2), uuid(3)],
      title: '',
    });
    assert.equal(titled.error, null);
    assert.equal(supabase.calls[0].args.p_title, 'Table');

    supabase = makeRpcClient(() => ({ data: null, error: { message: 'list_not_public' } }));
    assert.deepEqual(
      await startTable({ listId: LIST_ID, restaurantIds: [uuid(1), uuid(2), uuid(3)] }),
      { table: null, error: 'list_not_public' }
    );

    supabase = makeRpcClient(() => ({ data: { status: 'open' }, error: null }));
    assert.deepEqual(
      await startTable({ listId: LIST_ID, restaurantIds: [uuid(1), uuid(2), uuid(3)] }),
      { table: null, error: 'unknown' }
    );
  });

  test('startTable: non-array and all-blank ids never reach the RPC', async () => {
    authUser = { id: USER_ID };
    supabase = makeRpcClient(() => ({ data: { table_id: TABLE_ID }, error: null }));
    assert.deepEqual(await startTable({ listId: LIST_ID, restaurantIds: null }), {
      table: null,
      error: 'need_three_places',
    });
    assert.deepEqual(await startTable({ listId: LIST_ID, restaurantIds: ['', null, ''] }), {
      table: null,
      error: 'need_three_places',
    });
    assert.equal(supabase.calls.length, 0);
  });

  test('fetchTable / fetchTableDecide: reject empty ids, map RPC errors, and parse payloads', async () => {
    supabase = makeRpcClient(() => ({ data: { table_id: TABLE_ID }, error: null }));
    assert.deepEqual(await fetchTable(''), { table: null, error: 'table_not_found' });
    assert.deepEqual(await fetchTableDecide(null), { slice: null, error: 'table_not_found' });
    assert.equal(supabase.calls.length, 0);

    supabase = makeRpcClient(() => ({ data: null, error: { message: 'table_not_found' } }));
    assert.deepEqual(await fetchTable(TABLE_ID), { table: null, error: 'table_not_found' });
    assert.equal(supabase.calls[0].rpc, 'get_table');

    supabase = makeRpcClient(() => ({ data: null, error: null }));
    assert.deepEqual(await fetchTable(TABLE_ID), { table: null, error: 'table_not_found' });
    assert.deepEqual(await fetchTableDecide(TABLE_ID), { slice: null, error: 'table_not_found' });

    supabase = makeRpcClient(() => ({
      data: JSON.stringify({ table_id: TABLE_ID, guest_count: 2 }),
      error: null,
    }));
    const full = await fetchTable(TABLE_ID);
    assert.equal(full.error, null);
    assert.equal(full.table?.table_id, TABLE_ID);

    const slice = await fetchTableDecide(TABLE_ID);
    assert.equal(slice.error, null);
    assert.equal(slice.slice?.guest_count, 2);
    assert.equal(supabase.calls[1].rpc, 'get_table_decide');
  });

  test('nameGuest / castTableVote / addTablePlace / lockTable: more pre-RPC guards', async () => {
    supabase = makeRpcClient(() => ({ data: { table_id: TABLE_ID }, error: null }));
    assert.deepEqual(
      await nameGuest({ tableId: '', guestKey: GUEST_KEY, displayName: 'Ana' }),
      { table: null, error: 'table_not_found' }
    );
    assert.deepEqual(
      await nameGuest({ tableId: TABLE_ID, guestKey: 'short', displayName: 'Ana' }),
      { table: null, error: 'invalid_voter_key' }
    );
    assert.deepEqual(
      await nameGuest({ tableId: TABLE_ID, guestKey: GUEST_KEY, displayName: 12 }),
      { table: null, error: 'invalid_display_name' }
    );
    assert.deepEqual(
      await castTableVote({
        tableId: '',
        restaurantId: RESTAURANT_ID,
        guestKey: GUEST_KEY,
        vote: 1,
      }),
      { table: null, error: 'table_not_found' }
    );
    assert.deepEqual(
      await castTableVote({
        tableId: TABLE_ID,
        restaurantId: RESTAURANT_ID,
        guestKey: 'tiny',
        vote: 1,
      }),
      { table: null, error: 'invalid_voter_key' }
    );
    assert.deepEqual(
      await lockTable({ tableId: '' }),
      { table: null, error: 'table_not_found' }
    );
    assert.equal(supabase.calls.length, 0);

    const up = await castTableVote({
      tableId: TABLE_ID,
      restaurantId: RESTAURANT_ID,
      guestKey: GUEST_KEY,
      vote: 1,
    });
    assert.equal(up.error, null);
    assert.equal(supabase.calls[0].args.p_vote, 1);

    supabase = makeRpcClient(() => ({ data: { places: [] }, error: null }));
    assert.deepEqual(
      await addTablePlace({
        tableId: TABLE_ID,
        restaurantId: RESTAURANT_ID,
        guestKey: GUEST_KEY,
      }),
      { table: null, error: 'unknown' }
    );

    supabase = makeRpcClient(() => ({ data: { table_id: TABLE_ID, status: 'locked' }, error: null }));
    const locked = await lockTable({ tableId: TABLE_ID, lockToken: '', winnerRestaurantId: '' });
    assert.equal(locked.error, null);
    assert.equal(supabase.calls[0].args.p_lock_token, null);
    assert.equal(supabase.calls[0].args.p_winner_restaurant_id, null);
  });
});
