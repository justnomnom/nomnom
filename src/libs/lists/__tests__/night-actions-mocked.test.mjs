/**
 * Tonight Night server actions with a mocked Supabase RPC client.
 */
import assert from 'node:assert/strict';
import { describe, mock, test } from 'node:test';

import { NIGHT_PLACES_ABUSE_CAP } from '../list-decide-payload.js';

const LIST_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const NIGHT_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const RESTAURANT_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const GUEST_KEY = 'guest-key-ok';

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

const { createNight, addNightPlace } = await import('../actions/night-actions.js');

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

describe('night-actions mocked RPCs', { concurrency: false }, () => {
  test('createNight: two places need_three; six places still call RPC', async () => {
    authUser = { id: USER_ID };
    supabase = makeRpcClient(() => ({ data: { night_id: NIGHT_ID }, error: null }));
    assert.deepEqual(
      await createNight({ listId: LIST_ID, restaurantIds: ['r1', 'r2'] }),
      { night: null, error: 'need_three_places' }
    );
    assert.equal(supabase.calls.length, 0);

    const six = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'];
    const out = await createNight({ listId: LIST_ID, restaurantIds: six });
    assert.equal(out.error, null);
    assert.equal(out.night?.night_id, NIGHT_ID);
    assert.deepEqual(supabase.calls[0].args.p_restaurant_ids, six);
  });

  test('createNight: abuse cap rejects without RPC', async () => {
    authUser = { id: USER_ID };
    supabase = makeRpcClient(() => ({ data: { night_id: NIGHT_ID }, error: null }));
    const ids = Array.from({ length: NIGHT_PLACES_ABUSE_CAP + 1 }, (_, i) => `r${i}`);
    assert.deepEqual(await createNight({ listId: LIST_ID, restaurantIds: ids }), {
      night: null,
      error: 'too_many_places',
    });
    assert.equal(supabase.calls.length, 0);
  });

  test('addNightPlace: validates ids and voter key before RPC', async () => {
    supabase = makeRpcClient(() => ({ data: { night_id: NIGHT_ID }, error: null }));
    assert.deepEqual(
      await addNightPlace({ nightId: '', restaurantId: RESTAURANT_ID, guestKey: GUEST_KEY }),
      { night: null, error: 'night_not_found' }
    );
    assert.deepEqual(
      await addNightPlace({ nightId: NIGHT_ID, restaurantId: '', guestKey: GUEST_KEY }),
      { night: null, error: 'invalid_restaurant_id' }
    );
    assert.deepEqual(
      await addNightPlace({ nightId: NIGHT_ID, restaurantId: RESTAURANT_ID, guestKey: 'short' }),
      { night: null, error: 'invalid_voter_key' }
    );
    assert.equal(supabase.calls.length, 0);
  });

  test('addNightPlace: maps RPC errors and returns night on success', async () => {
    supabase = makeRpcClient(() => ({ data: null, error: { message: 'not_joined' } }));
    assert.deepEqual(
      await addNightPlace({
        nightId: NIGHT_ID,
        restaurantId: RESTAURANT_ID,
        guestKey: GUEST_KEY,
      }),
      { night: null, error: 'not_joined' }
    );

    supabase = makeRpcClient(() => ({ data: { night_id: NIGHT_ID, places: [] }, error: null }));
    const out = await addNightPlace({
      nightId: NIGHT_ID,
      restaurantId: RESTAURANT_ID,
      guestKey: GUEST_KEY,
    });
    assert.equal(out.error, null);
    assert.equal(out.night?.night_id, NIGHT_ID);
    assert.equal(supabase.calls[0].rpc, 'add_night_place');
  });
});
