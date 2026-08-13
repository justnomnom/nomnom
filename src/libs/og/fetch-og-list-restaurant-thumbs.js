/**
 * First restaurant image URLs for a public list OG collage.
 */

import { createClient } from '@supabase/supabase-js';

import { SUPABASE_API } from 'src/config-global';
import { pickOgListRestaurantThumbUrls } from './pick-og-list-restaurant-thumbs';

// ----------------------------------------------------------------------

/**
 * @param {unknown} listId
 * @param {number} [limit]
 * @returns {Promise<string[]>}
 */
export async function fetchOgListRestaurantThumbs(listId, limit = 4) {
  if (typeof listId !== 'string' || !listId || !SUPABASE_API.url || !SUPABASE_API.key) return [];
  const max = Math.min(Math.max(Number(limit) || 4, 1), 6);
  try {
    const supabase = createClient(SUPABASE_API.url, SUPABASE_API.key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: items, error } = await supabase
      .from('list_items')
      .select(
        `
        sort_order,
        restaurants (
          restaurant_images (
            url,
            sort_order,
            moderation_status
          )
        )
      `
      )
      .eq('list_id', listId)
      .order('sort_order', { ascending: true })
      .limit(12);
    if (error || !Array.isArray(items)) return [];
    return pickOgListRestaurantThumbUrls(items, max);
  } catch {
    return [];
  }
}
