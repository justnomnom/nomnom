'use server';

import { pickSystemLists } from 'src/libs/lists/system-lists';
import {
  getSupabaseAuthUser,
  createSupabaseServerClient,
} from 'src/libs/supabase/supabase-server-client';

/**
 * Reads over the "Visited" list that signup seeds for every user.
 *
 * There is no separate visits table, and there should not be: a list has exactly one
 * owner, so a row in `list_items` for the Visited list *is* a (user, restaurant) pair.
 * Adding a second store would mean two sources of truth for one fact, with no good answer
 * to "the user added a spot to the Visited list by hand — does the flag flip?".
 *
 * See `docs/plan-visited-import-comments.md` §1 for the full reasoning and the
 * `lists.system_key` migration that will make the lookup below robust to renaming.
 */

/**
 * The caller's seeded list ids.
 *
 * Selects `system_key` when the column exists and retries without it when it does not,
 * mirroring the RPC-unavailable fallback already used by `fetchMyLists`. That keeps this
 * working both before and after the migration.
 *
 * @returns {Promise<{ visited: string | null, must_go: string | null, error: string | null }>}
 */
export async function fetchMySystemListIds() {
  const empty = { visited: null, must_go: null };
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user?.id) return { ...empty, error: 'unauthorized' };

  const load = (columns) =>
    supabase
      .from('lists')
      .select(columns)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

  let { data, error } = await load('id, name, created_at, system_key');
  if (error) {
    // `system_key` not deployed yet — undefined_column (42703).
    ({ data, error } = await load('id, name, created_at'));
  }
  if (error) {
    console.error('[fetchMySystemListIds]', error);
    return { ...empty, error: error.message };
  }

  return { ...pickSystemLists(data), error: null };
}

/**
 * Restaurant ids on the caller's Visited list.
 *
 * @returns {Promise<{ restaurantIds: string[], error: string | null }>}
 */
export async function fetchMyVisitedRestaurantIds() {
  const { visited, error: listErr } = await fetchMySystemListIds();
  if (listErr) return { restaurantIds: [], error: listErr };
  // No Visited list (deleted, or renamed before `system_key` existed) is not an error —
  // it just means nothing is excluded.
  if (!visited) return { restaurantIds: [], error: null };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('list_items')
    .select('restaurant_id')
    .eq('list_id', visited);

  if (error) {
    console.error('[fetchMyVisitedRestaurantIds]', error);
    return { restaurantIds: [], error: error.message };
  }

  const restaurantIds = [
    ...new Set(
      (data ?? [])
        .map((row) => (row?.restaurant_id != null ? String(row.restaurant_id) : ''))
        .filter(Boolean)
    ),
  ];
  return { restaurantIds, error: null };
}

/**
 * "47 saved · 6 been" for the saved hub.
 *
 * `saved` counts distinct restaurants across every list the caller owns, so a spot on
 * three lists counts once — the alternative reads as inflated and people notice.
 *
 * @returns {Promise<{ saved: number, visited: number, error: string | null }>}
 */
export async function fetchMyVisitSummary() {
  const empty = { saved: 0, visited: 0 };
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user?.id) return { ...empty, error: 'unauthorized' };

  const [{ data: ownedLists, error: listsErr }, { restaurantIds: visitedIds, error: visitedErr }] =
    await Promise.all([
      supabase.from('lists').select('id').eq('user_id', user.id),
      fetchMyVisitedRestaurantIds(),
    ]);

  if (listsErr) {
    console.error('[fetchMyVisitSummary] lists', listsErr);
    return { ...empty, error: listsErr.message };
  }
  if (visitedErr) return { ...empty, error: visitedErr };

  const listIds = (ownedLists ?? []).map((l) => String(l.id)).filter(Boolean);
  if (listIds.length === 0) return { ...empty, error: null };

  const { data: items, error: itemsErr } = await supabase
    .from('list_items')
    .select('restaurant_id')
    .in('list_id', listIds);

  if (itemsErr) {
    console.error('[fetchMyVisitSummary] items', itemsErr);
    return { ...empty, error: itemsErr.message };
  }

  const saved = new Set(
    (items ?? [])
      .map((row) => (row?.restaurant_id != null ? String(row.restaurant_id) : ''))
      .filter(Boolean)
  );
  const visited = visitedIds.filter((id) => saved.has(id));

  return { saved: saved.size, visited: visited.length, error: null };
}
