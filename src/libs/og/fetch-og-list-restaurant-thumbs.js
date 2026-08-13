/**
 * First restaurant image URLs for a public list OG collage.
 */

import { createClient } from '@supabase/supabase-js';

import { SUPABASE_API } from 'src/config-global';

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

    const urls = [];
    for (const row of items) {
      const images = row?.restaurants?.restaurant_images;
      if (!Array.isArray(images) || !images.length) continue;
      const sorted = images
        .filter((img) => img?.url && img.moderation_status !== 'rejected')
        .toSorted((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      const first = sorted[0]?.url;
      if (first && !urls.includes(first)) urls.push(first);
      if (urls.length >= max) break;
    }
    return urls;
  } catch {
    return [];
  }
}
