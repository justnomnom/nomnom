'use server';

import {
  getSupabaseAuthUser,
  createSupabaseServerClient,
} from 'src/libs/supabase/supabase-server-client';

import { normUuid } from 'src/libs/lists/actions/_shared';
import { mapDecideError, parseDecidePayload, isValidDecideVoterKey } from 'src/libs/lists/list-decide-payload';

/**
 * Owner starts a decide session on a public list (≥3 places).
 * @param {string} listId
 * @returns {Promise<{ session: object | null, error: string | null }>}
 */
export async function createListDecideSession(listId) {
  const id = normUuid(listId);
  if (!id) return { session: null, error: 'invalid_list' };

  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) return { session: null, error: 'unauthorized' };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('create_list_decide_session', { p_list_id: id });
  if (error) return { session: null, error: mapDecideError(error.message) };
  const session = parseDecidePayload(data);
  if (!session?.session_id) return { session: null, error: 'unknown' };
  return { session, error: null };
}

/**
 * Fetch session status + tallies (auth-free for public lists).
 * @param {string} sessionId
 * @returns {Promise<{ session: object | null, error: string | null }>}
 */
export async function fetchListDecideSession(sessionId) {
  const id = normUuid(sessionId);
  if (!id) return { session: null, error: 'invalid_session' };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_list_decide_session', { p_session_id: id });
  if (error) return { session: null, error: mapDecideError(error.message) };
  const session = parseDecidePayload(data);
  if (!session) return { session: null, error: 'session_not_found' };
  return { session, error: null };
}

/**
 * Cast or update an upvote (+1) / downvote (−1) for one place.
 * @param {{ sessionId: string, restaurantId: string, voterKey: string, vote: 1 | -1 }} params
 * @returns {Promise<{ session: object | null, error: string | null }>}
 */
export async function castListDecideVote({ sessionId, restaurantId, voterKey, vote }) {
  const sid = normUuid(sessionId);
  const rid = normUuid(restaurantId);
  if (!sid || !rid) return { session: null, error: 'invalid_session' };
  if (vote !== 1 && vote !== -1) return { session: null, error: 'invalid_vote' };
  if (!isValidDecideVoterKey(voterKey)) return { session: null, error: 'invalid_voter_key' };
  const key = voterKey.trim();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('cast_list_decide_vote', {
    p_session_id: sid,
    p_restaurant_id: rid,
    p_voter_key: key,
    p_vote: vote,
  });
  if (error) return { session: null, error: mapDecideError(error.message) };
  return { session: parseDecidePayload(data), error: null };
}

/**
 * Lock the session and set the winner (owner auth or lock_token).
 * @param {{ sessionId: string, lockToken?: string | null, winnerRestaurantId?: string | null }} params
 * @returns {Promise<{ session: object | null, error: string | null }>}
 */
export async function lockListDecideSession({ sessionId, lockToken = null, winnerRestaurantId = null }) {
  const sid = normUuid(sessionId);
  if (!sid) return { session: null, error: 'invalid_session' };
  const winner = winnerRestaurantId ? normUuid(winnerRestaurantId) : null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('lock_list_decide_session', {
    p_session_id: sid,
    p_lock_token: lockToken || null,
    p_winner_restaurant_id: winner,
  });
  if (error) return { session: null, error: mapDecideError(error.message) };
  return { session: parseDecidePayload(data), error: null };
}
