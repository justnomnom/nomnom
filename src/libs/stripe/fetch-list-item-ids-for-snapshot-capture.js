import { supabaseAdminClient } from 'src/libs/supabase/supabase-admin';
import {
  fetchAllSupabasePages,
  SUPABASE_DEFAULT_PAGE_SIZE,
} from 'src/libs/supabase/supabase-fetch-all-pages';

import { mapListItemRowsToIds } from './map-list-item-rows-to-ids';

/**
 * Current list_item ids for a list (sort_order ascending, then newest created_at).
 * Aligns with list snapshot SQL backfill ordering.
 *
 * Pages past PostgREST's 1000-row window so a snapshot of a >1000-item list captures every
 * item, not just the first 1000 (this feeds a paid snapshot purchase — silent truncation would
 * sell an incomplete list). A stable `id` tiebreaker keeps `.range()` paging deterministic.
 *
 * @param {string} listId
 * @returns {Promise<string[]>}
 */
export async function fetchListItemIdsForSnapshotCapture(listId) {
  if (!listId) return [];
  try {
    const data = await fetchAllSupabasePages(async (from, pageSize) => {
      const { data: page, error } = await supabaseAdminClient
        .from('list_items')
        .select('id')
        .eq('list_id', listId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })
        .order('id', { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) {
        throw error;
      }
      return page ?? [];
    }, SUPABASE_DEFAULT_PAGE_SIZE);
    return mapListItemRowsToIds(data);
  } catch (e) {
    console.error('[snapshot capture] list_items', listId, e?.message ?? e);
    return [];
  }
}
