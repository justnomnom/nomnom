'use server';

import { normUuid } from 'src/libs/lists/actions/_shared';
import {
  getSupabaseAuthUser,
  createSupabaseServerClient,
} from 'src/libs/supabase/supabase-server-client';
import {
  mapTableError,
  isValidGuestKey,
  parseTablePayload,
  TABLE_PLACES_ABUSE_CAP,
} from 'src/libs/lists/table-payload';

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
function normUuidList(raw) {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map((item) => normUuid(item)).filter(Boolean))];
}

/**
 * Owner starts a Table (shortlist + voting) on a public list they own.
 * @param {{ listId: string, restaurantIds: string[], title?: string, startsAt?: string | null }} params
 * @returns {Promise<{ table: object | null, error: string | null }>}
 */
export async function startTable({ listId, restaurantIds, title = 'Table', startsAt = null }) {
  const id = normUuid(listId);
  const ids = normUuidList(restaurantIds);
  if (!id) return { table: null, error: 'invalid_list' };
  if (ids.length < 3) return { table: null, error: 'need_three_places' };
  if (ids.length > TABLE_PLACES_ABUSE_CAP) return { table: null, error: 'too_many_places' };

  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) return { table: null, error: 'unauthorized' };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('start_table', {
    p_list_id: id,
    p_restaurant_ids: ids,
    p_title: title || 'Table',
    p_starts_at: startsAt || null,
  });
  if (error) return { table: null, error: mapTableError(error.message) };
  const table = parseTablePayload(data);
  if (!table?.table_id) return { table: null, error: 'unknown' };
  return { table, error: null };
}

/**
 * Full Table payload (places, guests, embedded decide).
 * @param {string} tableId
 * @returns {Promise<{ table: object | null, error: string | null }>}
 */
export async function fetchTable(tableId) {
  const id = normUuid(tableId);
  if (!id) return { table: null, error: 'table_not_found' };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_table', { p_table_id: id });
  if (error) return { table: null, error: mapTableError(error.message) };
  const table = parseTablePayload(data);
  if (!table) return { table: null, error: 'table_not_found' };
  return { table, error: null };
}

/**
 * Slim poll payload (decide + guest_count + guests + places).
 * @param {string} tableId
 * @returns {Promise<{ slice: object | null, error: string | null }>}
 */
export async function fetchTableDecide(tableId) {
  const id = normUuid(tableId);
  if (!id) return { slice: null, error: 'table_not_found' };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_table_decide', { p_table_id: id });
  if (error) return { slice: null, error: mapTableError(error.message) };
  const slice = parseTablePayload(data);
  if (!slice) return { slice: null, error: 'table_not_found' };
  return { slice, error: null };
}

/**
 * Put a name to a seat. Optional — voting never waits on this.
 * @param {{ tableId: string, guestKey: string, displayName: string }} params
 * @returns {Promise<{ table: object | null, error: string | null }>}
 */
export async function nameGuest({ tableId, guestKey, displayName }) {
  const id = normUuid(tableId);
  if (!id) return { table: null, error: 'table_not_found' };
  if (!isValidGuestKey(guestKey)) return { table: null, error: 'invalid_voter_key' };
  const name = typeof displayName === 'string' ? displayName.trim() : '';
  if (!name || name.length > 80) return { table: null, error: 'invalid_display_name' };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('join_table', {
    p_table_id: id,
    p_guest_key: guestKey.trim(),
    p_display_name: name,
  });
  if (error) return { table: null, error: mapTableError(error.message) };
  return { table: parseTablePayload(data), error: null };
}

/**
 * Cast or update an upvote (+1) / downvote (−1). Open to anyone with the link.
 * @param {{ tableId: string, restaurantId: string, guestKey: string, vote: 1 | -1 }} params
 * @returns {Promise<{ table: object | null, error: string | null }>}
 */
export async function castTableVote({ tableId, restaurantId, guestKey, vote }) {
  const tid = normUuid(tableId);
  const rid = normUuid(restaurantId);
  if (!tid || !rid) return { table: null, error: 'table_not_found' };
  if (vote !== 1 && vote !== -1) return { table: null, error: 'invalid_vote' };
  if (!isValidGuestKey(guestKey)) return { table: null, error: 'invalid_voter_key' };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('cast_table_vote', {
    p_table_id: tid,
    p_restaurant_id: rid,
    p_guest_key: guestKey.trim(),
    p_vote: vote,
  });
  if (error) return { table: null, error: mapTableError(error.message) };
  return { table: parseTablePayload(data), error: null };
}

/**
 * Widen the shortlist while the Table is open.
 * @param {{ tableId: string, restaurantId: string, guestKey: string }} params
 * @returns {Promise<{ table: object | null, error: string | null }>}
 */
export async function addTablePlace({ tableId, restaurantId, guestKey }) {
  const tid = normUuid(tableId);
  const rid = normUuid(restaurantId);
  if (!tid) return { table: null, error: 'table_not_found' };
  if (!rid) return { table: null, error: 'invalid_restaurant_id' };
  if (!isValidGuestKey(guestKey)) return { table: null, error: 'invalid_voter_key' };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('add_table_place', {
    p_table_id: tid,
    p_restaurant_id: rid,
    p_guest_key: guestKey.trim(),
  });
  if (error) return { table: null, error: mapTableError(error.message) };
  const table = parseTablePayload(data);
  if (!table?.table_id) return { table: null, error: 'unknown' };
  return { table, error: null };
}

/**
 * Settle the Table on a winner (owner auth, or whoever holds the lock token).
 * @param {{ tableId: string, lockToken?: string | null, winnerRestaurantId?: string | null }} params
 * @returns {Promise<{ table: object | null, error: string | null }>}
 */
export async function lockTable({ tableId, lockToken = null, winnerRestaurantId = null }) {
  const tid = normUuid(tableId);
  if (!tid) return { table: null, error: 'table_not_found' };
  const winner = winnerRestaurantId ? normUuid(winnerRestaurantId) : null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('lock_table', {
    p_table_id: tid,
    p_lock_token: lockToken || null,
    p_winner_restaurant_id: winner,
  });
  if (error) return { table: null, error: mapTableError(error.message) };
  return { table: parseTablePayload(data), error: null };
}
