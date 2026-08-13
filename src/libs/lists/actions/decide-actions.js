'use server';

import {
  getSupabaseAuthUser,
  createSupabaseServerClient,
} from 'src/libs/supabase/supabase-server-client';

import { normUuid } from 'src/libs/lists/actions/_shared';

// ----------------------------------------------------------------------

/**
 * Normalize RPC error messages into stable app error codes.
 * @param {unknown} message
 * @returns {string}
 */
function mapDecideError(message) {
  const m = String(message || '');
  if (m.includes('not_authenticated')) return 'unauthorized';
  if (m.includes('only_owner_can_decide')) return 'only_owner';
  if (m.includes('list_not_public')) return 'list_not_public';
  if (m.includes('need_at_least_three_places')) return 'need_three_places';
  if (m.includes('session_not_found')) return 'session_not_found';
  if (m.includes('session_locked')) return 'session_locked';
  if (m.includes('restaurant_not_on_list')) return 'restaurant_not_on_list';
  if (m.includes('invalid_voter_key')) return 'invalid_voter_key';
  if (m.includes('invalid_vote')) return 'invalid_vote';
  if (m.includes('rate_limited')) return 'rate_limited';
  if (m.includes('not_authorized_to_lock')) return 'not_authorized_to_lock';
  // Hide raw Postgres internals (e.g. missing extension) behind a stable key.
  if (/gen_random_bytes|permission denied|PGRST|postgres/i.test(m)) return 'unknown';
  return m || 'unknown';
}

/**
 * @param {unknown} raw
 * @returns {object | null}
 */
function parseDecidePayload(raw) {
  if (raw == null) return null;
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

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
  const key = typeof voterKey === 'string' ? voterKey.trim() : '';
  if (key.length < 8 || key.length > 128) return { session: null, error: 'invalid_voter_key' };

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
