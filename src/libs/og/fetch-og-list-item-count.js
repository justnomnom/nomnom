/**
 * Spot count for a list's share card.
 *
 * Split out rather than added to `fetchListMetadata()` so every list page's
 * `generateMetadata` does not pay for a count it never renders. Only ever called after
 * `fetchListMetadata` has already established that the list is publicly visible, so
 * counting its rows leaks nothing that the page itself does not show.
 */

import { createClient } from '@supabase/supabase-js';

import { SUPABASE_API } from 'src/config-global';

// ----------------------------------------------------------------------

/**
 * @param {unknown} listId
 * @returns {Promise<number>} 0 when the list is empty, unreadable, or Supabase is unconfigured.
 */
export async function fetchOgListItemCount(listId) {
  if (typeof listId !== 'string' || !listId || !SUPABASE_API.url || !SUPABASE_API.key) return 0;
  try {
    const supabase = createClient(SUPABASE_API.url, SUPABASE_API.key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { count, error } = await supabase
      .from('list_items')
      .select('id', { count: 'exact', head: true })
      .eq('list_id', listId);
    if (error) return 0;
    return Number.isFinite(count) && count > 0 ? count : 0;
  } catch {
    return 0;
  }
}
