import { openingStatusForRow } from 'src/libs/restaurant/opening-hours';
import { RESTAURANT_ID_UUID_RE } from 'src/libs/restaurant/restaurant-id-uuid';
import { slimRestaurantCardMetadata } from 'src/lib/slim-restaurant-card-metadata';
import { createSupabaseServerClient } from 'src/libs/supabase/supabase-server-client';

export { RESTAURANT_ID_UUID_RE };

function flattenRestaurantTagsFromRow(row) {
  if (!row || typeof row !== 'object') return [];
  const junction = row.restaurant_tags;
  if (!Array.isArray(junction)) return [];
  return junction
    .map((j) => (j && typeof j === 'object' ? j.tags : null))
    .filter((tag) => tag && typeof tag === 'object' && typeof tag.slug === 'string');
}

/**
 * Load a single restaurant row for server-rendered pages (dashboard detail, public share).
 * @param {string} id
 * @returns {Promise<object | null>}
 */
export async function fetchRestaurantByIdForSsr(id) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('restaurants')
    .select(
      `
      id,
      name,
      address,
      latitude,
      longitude,
      rating,
      price_level,
      phone,
      website,
      maps_link,
      menu_url,
      menu_source,
      metadata,
      restaurant_images (
        id,
        url,
        sort_order,
        moderation_status
      ),
      restaurant_tags (
        tags (
          id,
          slug,
          label,
          category,
          sort_order
        )
      ),
      home_city:cities!restaurants_municipality_id_fkey (
        name,
        states (
          name
        )
      )
    `
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[fetchRestaurantByIdForSsr]', error);
    return null;
  }
  if (!data) return null;
  const tags = flattenRestaurantTagsFromRow(data);
  const rest = { ...data };
  delete rest.restaurant_tags;
  return {
    ...rest,
    tags,
    // Resolve opening state from the *raw* metadata, before slimming drops `hours_parsed`.
    // Shipping the derived object (tens of bytes) instead of the hours themselves keeps the
    // payload discipline that `slimRestaurantCardMetadata` exists to enforce.
    openingStatus: openingStatusForRow(rest.metadata),
    metadata: slimRestaurantCardMetadata(rest.metadata),
  };
}
