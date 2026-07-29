import { isRestaurantDishFacetTag } from 'src/utils/restaurant-tag-groups';

import { normalizeDishLabelKey } from 'src/lib/dish-tag-slug';
import { toCanonicalEnglishLabel } from 'src/lib/ugc-translate';
import { sortDishCatalogRows } from 'src/lib/dish-tag-catalog-sort';
import {
  fetchAllSupabasePages,
  SUPABASE_DEFAULT_PAGE_SIZE,
} from 'src/lib/supabase-fetch-all-pages';

export { sortDishCatalogRows } from 'src/lib/dish-tag-catalog-sort';

/**
 * Global dish tag catalog: all `tags.category = dish` rows plus any dish facet
 * linked on restaurants via `restaurant_tags` (deduped by tag id).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<Array<{ id: string, slug: string, label: string, category: string, sort_order: number }>>}
 */
export async function fetchDishTagsCatalog(supabase) {
  const byId = new Map();

  const addTag = (raw) => {
    if (!isRestaurantDishFacetTag(raw)) return;
    const id = raw.id != null ? String(raw.id).trim() : '';
    if (!id || byId.has(id)) return;
    byId.set(id, {
      id,
      slug: String(raw.slug ?? ''),
      label: String(raw.label ?? ''),
      category: 'dish',
      sort_order: raw.sort_order ?? 0,
    });
  };

  const dishTagRows = await fetchAllSupabasePages(async (from, pageSize) => {
    const { data, error } = await supabase
      .from('tags')
      .select('id, slug, label, category, sort_order')
      .eq('category', 'dish')
      .order('sort_order', { ascending: true })
      .order('slug', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(error.message);
    }

    return data ?? [];
  }, SUPABASE_DEFAULT_PAGE_SIZE);
  dishTagRows.forEach(addTag);

  const linkedTagRows = await fetchAllSupabasePages(async (from, pageSize) => {
    const { data, error } = await supabase
      .from('restaurant_tags')
      .select('tag_id, tags ( id, slug, label, category, sort_order )')
      .order('tag_id', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(error.message);
    }

    return data ?? [];
  }, SUPABASE_DEFAULT_PAGE_SIZE);
  linkedTagRows.forEach((row) => addTag(row?.tags));

  return sortDishCatalogRows([...byId.values()]);
}

/**
 * Curated dish tags linked to the restaurant (`restaurant_tags` + `tags.category = dish`).
 * User-typed must-try lines do not create rows here — only list_item_must_try_dishes snapshots.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} restaurantId
 * @returns {Promise<Array<{ id: string, slug: string, label: string, sort_order: number, category: string }>>}
 */
export async function fetchDishTagsForRestaurant(supabase, restaurantId) {
  const { data, error } = await supabase
    .from('restaurant_tags')
    .select('tag_id, tags ( id, slug, label, sort_order, category )')
    .eq('restaurant_id', restaurantId);
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? [])
    .map((row) => row.tags)
    .filter((t) => t && t.category === 'dish')
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

/**
 * If the user's text matches an existing curated dish tag for this restaurant, return it.
 * Does not insert into `tags` or `restaurant_tags` (must-try copy stays on the list item / review flow only).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} restaurantId
 * @param {string} rawLabel
 * @param {string} labelLocale
 * @returns {Promise<{ tagId: string, label: string, label_locale: string } | null>}
 */
export async function matchRestaurantDishTag(supabase, restaurantId, rawLabel, labelLocale) {
  const dishTags = await fetchDishTagsForRestaurant(supabase, restaurantId);
  const normUser = normalizeDishLabelKey(rawLabel);

  const direct = dishTags.find((t) => normalizeDishLabelKey(t.label) === normUser);
  if (direct) {
    return { tagId: direct.id, label: direct.label, label_locale: 'en' };
  }

  const canonUser = await toCanonicalEnglishLabel(supabase, rawLabel, labelLocale);
  const canonNorm = normalizeDishLabelKey(canonUser);

  const withCanon = await Promise.all(
    dishTags.map(async (t) => ({
      t,
      canon: await toCanonicalEnglishLabel(supabase, t.label, 'en'),
    }))
  );

  const canonMatch = withCanon.find(({ t, canon }) => normalizeDishLabelKey(canon) === canonNorm);
  if (canonMatch) {
    const { t } = canonMatch;
    return { tagId: t.id, label: t.label, label_locale: 'en' };
  }

  return null;
}
