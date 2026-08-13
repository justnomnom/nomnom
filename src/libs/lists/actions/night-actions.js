'use server';

import {
  getSupabaseAuthUser,
  createSupabaseServerClient,
} from 'src/libs/supabase/supabase-server-client';

import { normUuid } from 'src/libs/lists/actions/_shared';
import {
  mapDecideError,
  parseDecidePayload,
  isValidDecideVoterKey,
} from 'src/libs/lists/list-decide-payload';

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
function normUuidList(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  const seen = new Set();
  for (const item of raw) {
    const id = normUuid(item);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/**
 * Owner creates a Night (shortlist + Decide session) atomically.
 * @param {{ listId: string, restaurantIds: string[], title?: string, startsAt?: string | null }} params
 * @returns {Promise<{ night: object | null, error: string | null }>}
 */
export async function createNight({ listId, restaurantIds, title = 'Tonight', startsAt = null }) {
  const id = normUuid(listId);
  const ids = normUuidList(restaurantIds);
  if (!id) return { night: null, error: 'invalid_list' };
  if (ids.length < 3) return { night: null, error: 'need_three_places' };
  if (ids.length > 5) return { night: null, error: 'too_many_places' };

  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) return { night: null, error: 'unauthorized' };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('create_night', {
    p_list_id: id,
    p_restaurant_ids: ids,
    p_title: title || 'Tonight',
    p_starts_at: startsAt || null,
  });
  if (error) return { night: null, error: mapDecideError(error.message) };
  const night = parseDecidePayload(data);
  if (!night?.night_id) return { night: null, error: 'unknown' };
  return { night, error: null };
}

/**
 * Full Night payload (places, guests, embedded decide).
 * @param {string} nightId
 * @returns {Promise<{ night: object | null, error: string | null }>}
 */
export async function fetchNight(nightId) {
  const id = normUuid(nightId);
  if (!id) return { night: null, error: 'night_not_found' };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_night', { p_night_id: id });
  if (error) return { night: null, error: mapDecideError(error.message) };
  const night = parseDecidePayload(data);
  if (!night) return { night: null, error: 'night_not_found' };
  return { night, error: null };
}

/**
 * Slim poll payload (decide + guest_count).
 * @param {string} nightId
 * @returns {Promise<{ slice: object | null, error: string | null }>}
 */
export async function fetchNightDecide(nightId) {
  const id = normUuid(nightId);
  if (!id) return { slice: null, error: 'night_not_found' };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_night_decide', { p_night_id: id });
  if (error) return { slice: null, error: mapDecideError(error.message) };
  const slice = parseDecidePayload(data);
  if (!slice) return { slice: null, error: 'night_not_found' };
  return { slice, error: null };
}

/**
 * Auth-free join with display name (guest_key === Decide voter_key).
 * @param {{ nightId: string, guestKey: string, displayName: string }} params
 * @returns {Promise<{ night: object | null, error: string | null }>}
 */
export async function joinNight({ nightId, guestKey, displayName }) {
  const id = normUuid(nightId);
  if (!id) return { night: null, error: 'night_not_found' };
  if (!isValidDecideVoterKey(guestKey)) return { night: null, error: 'invalid_voter_key' };
  const name = typeof displayName === 'string' ? displayName.trim() : '';
  if (!name || name.length > 80) return { night: null, error: 'invalid_display_name' };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('join_night', {
    p_night_id: id,
    p_guest_key: guestKey.trim(),
    p_display_name: name,
  });
  if (error) return { night: null, error: mapDecideError(error.message) };
  return { night: parseDecidePayload(data), error: null };
}

/**
 * Cast vote on a Night (requires prior join).
 * @param {{ nightId: string, restaurantId: string, guestKey: string, vote: 1 | -1 }} params
 * @returns {Promise<{ session: object | null, error: string | null }>}
 */
export async function castNightVote({ nightId, restaurantId, guestKey, vote }) {
  const nid = normUuid(nightId);
  const rid = normUuid(restaurantId);
  if (!nid || !rid) return { session: null, error: 'invalid_session' };
  if (vote !== 1 && vote !== -1) return { session: null, error: 'invalid_vote' };
  if (!isValidDecideVoterKey(guestKey)) return { session: null, error: 'invalid_voter_key' };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('cast_night_vote', {
    p_night_id: nid,
    p_restaurant_id: rid,
    p_guest_key: guestKey.trim(),
    p_vote: vote,
  });
  if (error) return { session: null, error: mapDecideError(error.message) };
  return { session: parseDecidePayload(data), error: null };
}
