/**
 * Public reviews and list mentions for content hub restaurant pages.
 *
 * The dashboard's own fetchers cannot be reused here, for two separate reasons:
 *
 * 1. `fetchRestaurantReviews` builds its client with `createSupabaseServerClient()`,
 *    which awaits `cookies()`. Calling it would opt the hub route out of static
 *    generation — these are SEO pages rendered at build time with `revalidate`,
 *    and going dynamic to read a cookie nobody is authenticated with is a bad
 *    trade.
 * 2. `fetchRestaurantListMentions` is viewer-scoped by design and returns `[]`
 *    when there is no signed-in user, so on an anonymous page it is not merely
 *    unavailable — it is always empty.
 *
 * So these read as the anonymous public would: no cookies, only what RLS exposes
 * to the publishable key, and only lists explicitly marked public.
 */

import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';

import { SUPABASE_API } from 'src/config-global';

/** Hub pages are a summary surface, not the full review archive. */
const MAX_REVIEWS = 12;
const MAX_LIST_MENTIONS = 12;

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
let cachedClient = null;

function publicClient() {
  if (!cachedClient) {
    cachedClient = createClient(SUPABASE_API.url, SUPABASE_API.key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cachedClient;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Reviews for a restaurant, newest first, shaped for `RestaurantDetailView`.
 *
 * Returns `[]` on error rather than throwing: a hub page missing its reviews is
 * still a useful page, and a build that dies on a transient query is not.
 *
 * @param {string} restaurantId
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export const getPublicReviewsForRestaurant = cache(async (restaurantId) => {
  if (typeof restaurantId !== 'string' || !UUID_RE.test(restaurantId)) return [];
  if (!SUPABASE_API.url || !SUPABASE_API.key) return [];

  const { data, error } = await publicClient()
    .from('restaurant_reviews')
    .select(
      `
      id,
      restaurant_id,
      user_id,
      rating,
      body,
      media,
      author_display_name,
      author_username,
      author_avatar_url,
      created_at
    `
    )
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(MAX_REVIEWS);

  if (error) {
    console.error('[curated-restaurant-social] reviews', error);
    return [];
  }
  // `rating` is a required number in the view's propTypes; drop rows that would
  // violate it rather than rendering a broken card.
  return (data ?? []).filter((r) => r && typeof r.id === 'string' && typeof r.rating === 'number');
});

/**
 * Public lists that include this restaurant, shaped for `RestaurantDetailView`'s
 * `listMentions`.
 *
 * Only `visibility = 'public'` lists are included. A private or draft list must
 * never surface on a page that anyone — including search-engine crawlers — can
 * read.
 *
 * @param {string} restaurantId
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export const getPublicListMentionsForRestaurant = cache(async (restaurantId) => {
  if (typeof restaurantId !== 'string' || !UUID_RE.test(restaurantId)) return [];
  if (!SUPABASE_API.url || !SUPABASE_API.key) return [];

  const { data, error } = await publicClient()
    .from('list_items')
    .select(
      `
      id,
      list_id,
      restaurant_id,
      added_by,
      lists!inner (
        id,
        name,
        visibility
      )
    `
    )
    .eq('restaurant_id', restaurantId)
    .eq('lists.visibility', 'public')
    .limit(MAX_LIST_MENTIONS);

  if (error) {
    console.error('[curated-restaurant-social] list mentions', error);
    return [];
  }
  return (data ?? []).filter((m) => m && typeof m.id === 'string');
});
