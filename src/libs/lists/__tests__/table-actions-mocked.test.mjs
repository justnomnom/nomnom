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

const { startTable, addTablePlace, castTableVote, nameGuest, lockTable } = await import(
  '../actions/table-actions.js'
);

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
});
