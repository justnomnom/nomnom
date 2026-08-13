/**
 * Share → Decide server actions with a mocked Supabase RPC client.
 */
import assert from 'node:assert/strict';
import { describe, mock, test } from 'node:test';

const LIST_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SESSION_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const RESTAURANT_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const USER_ID = '11111111-1111-4111-8111-111111111111';

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

const {
  createListDecideSession,
  fetchListDecideSession,
  castListDecideVote,
  lockListDecideSession,
} = await import('../actions/decide-actions.js');

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

describe('decide-actions mocked RPCs', { concurrency: false }, () => {
  test('createListDecideSession: invalid list and unauthorized skip RPC', async () => {
    authUser = { id: USER_ID };
    supabase = makeRpcClient(() => ({ data: null, error: null }));
    assert.deepEqual(await createListDecideSession(''), { session: null, error: 'invalid_list' });
    assert.deepEqual(await createListDecideSession(null), { session: null, error: 'invalid_list' });

    authUser = null;
    assert.deepEqual(await createListDecideSession(LIST_ID), {
      session: null,
      error: 'unauthorized',
    });
    assert.equal(supabase.calls.length, 0);
  });

  test('createListDecideSession: maps RPC errors and missing session_id', async () => {
    authUser = { id: USER_ID };
    supabase = makeRpcClient(() => ({
      data: null,
      error: { message: 'only_owner_can_decide' },
    }));
    assert.deepEqual(await createListDecideSession(LIST_ID), {
      session: null,
      error: 'only_owner',
    });

    supabase = makeRpcClient(() => ({
      data: null,
      error: { message: 'function gen_random_bytes(integer) does not exist' },
    }));
    assert.deepEqual(await createListDecideSession(LIST_ID), { session: null, error: 'unknown' });

    supabase = makeRpcClient(() => ({ data: { status: 'open' }, error: null }));
    assert.deepEqual(await createListDecideSession(LIST_ID), { session: null, error: 'unknown' });
  });

  test('createListDecideSession: returns session + lock_token on success', async () => {
    authUser = { id: USER_ID };
    const payload = { session_id: SESSION_ID, lock_token: 'tok', status: 'open' };
    supabase = makeRpcClient(() => ({ data: payload, error: null }));
    const out = await createListDecideSession(LIST_ID);
    assert.deepEqual(out, { session: payload, error: null });
    assert.deepEqual(supabase.calls[0].args, { p_list_id: LIST_ID });
  });

  test('fetchListDecideSession: invalid id, not found, JSON string payload', async () => {
    supabase = makeRpcClient(() => ({ data: null, error: null }));
    assert.deepEqual(await fetchListDecideSession(''), {
      session: null,
      error: 'invalid_session',
    });

    supabase = makeRpcClient(() => ({ data: null, error: null }));
    assert.deepEqual(await fetchListDecideSession(SESSION_ID), {
      session: null,
      error: 'session_not_found',
    });

    const payload = { session_id: SESSION_ID, status: 'locked', tallies: {} };
    supabase = makeRpcClient(() => ({ data: JSON.stringify(payload), error: null }));
    assert.deepEqual(await fetchListDecideSession(SESSION_ID), { session: payload, error: null });
    assert.equal(supabase.calls[0].rpc, 'get_list_decide_session');
  });

  test('castListDecideVote: validates ids, vote, and voter key before RPC', async () => {
    supabase = makeRpcClient(() => ({ data: { session_id: SESSION_ID }, error: null }));
    assert.deepEqual(
      await castListDecideVote({
        sessionId: '',
        restaurantId: RESTAURANT_ID,
        voterKey: '12345678',
        vote: 1,
      }),
      { session: null, error: 'invalid_session' }
    );
    assert.deepEqual(
      await castListDecideVote({
        sessionId: SESSION_ID,
        restaurantId: RESTAURANT_ID,
        voterKey: '12345678',
        vote: 0,
      }),
      { session: null, error: 'invalid_vote' }
    );
    assert.deepEqual(
      await castListDecideVote({
        sessionId: SESSION_ID,
        restaurantId: RESTAURANT_ID,
        voterKey: 'short',
        vote: -1,
      }),
      { session: null, error: 'invalid_voter_key' }
    );
    assert.equal(supabase.calls.length, 0);
  });

  test('castListDecideVote: trims key, maps locked error, returns session', async () => {
    supabase = makeRpcClient(() => ({
      data: null,
      error: { message: 'session_locked' },
    }));
    assert.deepEqual(
      await castListDecideVote({
        sessionId: SESSION_ID,
        restaurantId: RESTAURANT_ID,
        voterKey: '  12345678  ',
        vote: 1,
      }),
      { session: null, error: 'session_locked' }
    );
    assert.equal(supabase.calls[0].args.p_voter_key, '12345678');
    assert.equal(supabase.calls[0].args.p_vote, 1);

    const session = { session_id: SESSION_ID, status: 'open', tallies: { [RESTAURANT_ID]: { up: 1 } } };
    supabase = makeRpcClient(() => ({ data: session, error: null }));
    assert.deepEqual(
      await castListDecideVote({
        sessionId: SESSION_ID,
        restaurantId: RESTAURANT_ID,
        voterKey: 'abcdefgh',
        vote: -1,
      }),
      { session, error: null }
    );
  });

  test('lockListDecideSession: invalid session, empty token becomes null, success', async () => {
    supabase = makeRpcClient(() => ({ data: null, error: null }));
    assert.deepEqual(await lockListDecideSession({ sessionId: '' }), {
      session: null,
      error: 'invalid_session',
    });

    supabase = makeRpcClient(() => ({
      data: { session_id: SESSION_ID, status: 'locked', winner_restaurant_id: RESTAURANT_ID },
      error: null,
    }));
    const out = await lockListDecideSession({
      sessionId: SESSION_ID,
      lockToken: '',
      winnerRestaurantId: RESTAURANT_ID,
    });
    assert.equal(out.error, null);
    assert.equal(out.session.status, 'locked');
    assert.equal(supabase.calls[0].args.p_lock_token, null);
    assert.equal(supabase.calls[0].args.p_winner_restaurant_id, RESTAURANT_ID);
  });

  test('lockListDecideSession: maps not_authorized_to_lock', async () => {
    supabase = makeRpcClient(() => ({
      data: null,
      error: { message: 'not_authorized_to_lock' },
    }));
    assert.deepEqual(await lockListDecideSession({ sessionId: SESSION_ID, lockToken: 'nope' }), {
      session: null,
      error: 'not_authorized_to_lock',
    });
  });

  test('createListDecideSession: parses JSON-string RPC payloads', async () => {
    authUser = { id: USER_ID };
    const payload = { session_id: SESSION_ID, lock_token: 'tok', status: 'open' };
    supabase = makeRpcClient(() => ({ data: JSON.stringify(payload), error: null }));
    assert.deepEqual(await createListDecideSession(LIST_ID), { session: payload, error: null });
  });

  test('fetchListDecideSession: maps RPC errors', async () => {
    supabase = makeRpcClient(() => ({
      data: null,
      error: { message: 'permission denied for schema public' },
    }));
    assert.deepEqual(await fetchListDecideSession(SESSION_ID), {
      session: null,
      error: 'unknown',
    });
  });

  test('fetchListDecideSession: empty object payload is not treated as missing', async () => {
    supabase = makeRpcClient(() => ({ data: {}, error: null }));
    assert.deepEqual(await fetchListDecideSession(SESSION_ID), { session: {}, error: null });
  });

  test('castListDecideVote: invalid restaurant id skips RPC', async () => {
    supabase = makeRpcClient(() => ({ data: null, error: null }));
    assert.deepEqual(
      await castListDecideVote({
        sessionId: SESSION_ID,
        restaurantId: '',
        voterKey: '12345678',
        vote: 1,
      }),
      { session: null, error: 'invalid_session' }
    );
    assert.equal(supabase.calls.length, 0);
  });

  test('castListDecideVote: string "1" and other non ±1 votes are invalid', async () => {
    supabase = makeRpcClient(() => ({ data: null, error: null }));
    assert.deepEqual(
      await castListDecideVote({
        sessionId: SESSION_ID,
        restaurantId: RESTAURANT_ID,
        voterKey: '12345678',
        vote: '1',
      }),
      { session: null, error: 'invalid_vote' }
    );
    assert.deepEqual(
      await castListDecideVote({
        sessionId: SESSION_ID,
        restaurantId: RESTAURANT_ID,
        voterKey: '12345678',
        vote: 2,
      }),
      { session: null, error: 'invalid_vote' }
    );
    assert.equal(supabase.calls.length, 0);
  });

  test('castListDecideVote: null payload without error returns session null', async () => {
    supabase = makeRpcClient(() => ({ data: null, error: null }));
    assert.deepEqual(
      await castListDecideVote({
        sessionId: SESSION_ID,
        restaurantId: RESTAURANT_ID,
        voterKey: '12345678',
        vote: 1,
      }),
      { session: null, error: null }
    );
  });

  test('lockListDecideSession: blank winner becomes null; invalid uuid still forwarded', async () => {
    supabase = makeRpcClient(() => ({
      data: { session_id: SESSION_ID, status: 'locked' },
      error: null,
    }));
    await lockListDecideSession({ sessionId: SESSION_ID, winnerRestaurantId: '   ' });
    assert.equal(supabase.calls[0].args.p_winner_restaurant_id, '   ');

    supabase = makeRpcClient(() => ({
      data: { session_id: SESSION_ID, status: 'locked' },
      error: null,
    }));
    await lockListDecideSession({ sessionId: SESSION_ID, winnerRestaurantId: null });
    assert.equal(supabase.calls[0].args.p_winner_restaurant_id, null);
  });

  test('lockListDecideSession: maps session_locked', async () => {
    supabase = makeRpcClient(() => ({
      data: null,
      error: { message: 'ERROR: session_locked' },
    }));
    assert.deepEqual(await lockListDecideSession({ sessionId: SESSION_ID, lockToken: 'tok' }), {
      session: null,
      error: 'session_locked',
    });
  });

  test('createListDecideSession: maps remaining owner-gate RPC errors', async () => {
    authUser = { id: USER_ID };
    supabase = makeRpcClient(() => ({
      data: null,
      error: { message: 'list_not_public' },
    }));
    assert.deepEqual(await createListDecideSession(LIST_ID), {
      session: null,
      error: 'list_not_public',
    });

    supabase = makeRpcClient(() => ({
      data: null,
      error: { message: 'need_at_least_three_places' },
    }));
    assert.deepEqual(await createListDecideSession(LIST_ID), {
      session: null,
      error: 'need_three_places',
    });

    supabase = makeRpcClient(() => ({
      data: null,
      error: { message: 'not_authenticated' },
    }));
    assert.deepEqual(await createListDecideSession(LIST_ID), {
      session: null,
      error: 'unauthorized',
    });
  });

  test('fetchListDecideSession: arrays and invalid JSON are session_not_found', async () => {
    supabase = makeRpcClient(() => ({ data: '[]', error: null }));
    assert.deepEqual(await fetchListDecideSession(SESSION_ID), {
      session: null,
      error: 'session_not_found',
    });

    supabase = makeRpcClient(() => ({ data: '[1]', error: null }));
    assert.deepEqual(await fetchListDecideSession(SESSION_ID), {
      session: null,
      error: 'session_not_found',
    });

    supabase = makeRpcClient(() => ({ data: '{', error: null }));
    assert.deepEqual(await fetchListDecideSession(SESSION_ID), {
      session: null,
      error: 'session_not_found',
    });
  });

  test('castListDecideVote: maps restaurant_not_on_list and rate_limited', async () => {
    supabase = makeRpcClient(() => ({
      data: null,
      error: { message: 'restaurant_not_on_list' },
    }));
    assert.deepEqual(
      await castListDecideVote({
        sessionId: SESSION_ID,
        restaurantId: RESTAURANT_ID,
        voterKey: '12345678',
        vote: 1,
      }),
      { session: null, error: 'restaurant_not_on_list' }
    );

    supabase = makeRpcClient(() => ({
      data: null,
      error: { message: 'rate_limited' },
    }));
    assert.deepEqual(
      await castListDecideVote({
        sessionId: SESSION_ID,
        restaurantId: RESTAURANT_ID,
        voterKey: '12345678',
        vote: -1,
      }),
      { session: null, error: 'rate_limited' }
    );
  });

  test('lockListDecideSession: already-locked payload is success; missing session maps', async () => {
    const locked = {
      session_id: SESSION_ID,
      status: 'locked',
      winner_restaurant_id: RESTAURANT_ID,
    };
    supabase = makeRpcClient(() => ({ data: locked, error: null }));
    assert.deepEqual(await lockListDecideSession({ sessionId: SESSION_ID, lockToken: 'tok' }), {
      session: locked,
      error: null,
    });

    supabase = makeRpcClient(() => ({
      data: null,
      error: { message: 'session_not_found' },
    }));
    assert.deepEqual(await lockListDecideSession({ sessionId: SESSION_ID }), {
      session: null,
      error: 'session_not_found',
    });
  });

  test('lockListDecideSession: omitted lockToken is sent as null', async () => {
    supabase = makeRpcClient(() => ({
      data: { session_id: SESSION_ID, status: 'locked' },
      error: null,
    }));
    await lockListDecideSession({ sessionId: SESSION_ID });
    assert.equal(supabase.calls[0].args.p_lock_token, null);
    assert.equal(supabase.calls[0].args.p_winner_restaurant_id, null);
  });
});
