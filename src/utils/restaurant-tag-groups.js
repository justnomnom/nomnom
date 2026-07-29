/** Display order for tag filter sections (matches DB `tags.category`). */
export const RESTAURANT_TAG_CATEGORY_ORDER = [
  'cuisine',
  'dish',
  'vibe',
  'award',
  'price',
  'other',
  'accessibility',
  'service',
];

/** @type {Record<string, string>} */
export const RESTAURANT_TAG_SECTION_I18N = {
  cuisine: 'pages.dashboard.tag_filters.section_cuisine',
  dish: 'pages.dashboard.tag_filters.section_dish',
  vibe: 'pages.dashboard.tag_filters.section_vibe',
  award: 'pages.dashboard.tag_filters.section_award',
  price: 'pages.dashboard.tag_filters.section_price',
  other: 'pages.dashboard.tag_filters.section_other',
  accessibility: 'pages.dashboard.tag_filters.section_accessibility',
  service: 'pages.dashboard.tag_filters.section_service',
};

/** DB `tags.slug` for `category = 'price'` — used for i18n range suffixes. */
const PRICE_TAG_SLUGS = new Set(['budget', 'moderate', 'upscale', 'fine_dining']);

/**
 * Label shown in filter UIs: for price tiers, appends an indicative per-person € range.
 *
 * @param {{ slug: string, label: string, category: string }} tag
 * @param {(key: string) => string} t i18next `t`
 */
export function getRestaurantTagDisplayLabel(tag, t) {
  const base = tag && typeof tag.label === 'string' ? tag.label : '';
  if (!tag || tag.category !== 'price' || !PRICE_TAG_SLUGS.has(tag.slug)) {
    return base;
  }
  const rangeKey = `pages.dashboard.tag_filters.price_between_${tag.slug}`;
  const range = t(rangeKey);
  if (!range || range === rangeKey) {
    return base;
  }
  return `${base} (${range})`;
}

function sortTagRows(rows) {
  return [...rows].sort((a, b) => {
    const so = (a.sort_order ?? 0) - (b.sort_order ?? 0);
    if (so !== 0) return so;
    return String(a.slug ?? '').localeCompare(String(b.slug ?? ''));
  });
}

/**
 * @param {Array<{ id: string, slug: string, label: string, category: string, sort_order?: number }>} tags
 * @returns {Array<{ category: string, tags: typeof tags }>}
 */
function normTagIdForMerge(id) {
  if (id == null || id === '') return '';
  return String(id).trim().toLowerCase();
}

/**
 * Merge the user's must-try dish tags into the catalog so the Dishes picker shows
 * personal history plus every global dish tag (deduped by id).
 *
 * @param {Array<{ id: string, slug: string, label: string, category: string, sort_order?: number }>} catalogTags
 * @param {Array<{ id: string, slug: string, label: string, category: string, sort_order?: number }>} userDishTags
 * @returns {typeof catalogTags}
 */
export function mergeDishTagsForPreferences(catalogTags, userDishTags) {
  const catalog = Array.isArray(catalogTags) ? catalogTags : [];
  const userDishes = Array.isArray(userDishTags) ? userDishTags : [];

  const dishById = new Map();
  catalog
    .filter((tag) => tag?.category === 'dish')
    .forEach((tag) => {
      const id = normTagIdForMerge(tag.id);
      if (id) dishById.set(id, tag);
    });
  userDishes.forEach((tag) => {
    const id = normTagIdForMerge(tag?.id);
    if (!id || dishById.has(id)) return;
    dishById.set(id, { ...tag, category: 'dish' });
  });

  const nonDish = catalog.filter((tag) => tag?.category !== 'dish');
  const mergedDishes = sortTagRows([...dishById.values()]);
  return [...nonDish, ...mergedDishes];
}

/**
 * @param {Array<{ id: string }>} userDishTags
 * @returns {Set<string>}
 */
export function userDishTagIdSet(userDishTags) {
  const ids = new Set();
  (userDishTags ?? []).forEach((tag) => {
    const id = normTagIdForMerge(tag?.id);
    if (id) ids.add(id);
  });
  return ids;
}

export function groupRestaurantTagsByCategory(tags) {
  if (!Array.isArray(tags) || tags.length === 0) return [];

  const byCat = tags.reduce((map, row) => {
    const c = row.category && String(row.category) ? String(row.category) : 'other';
    const list = map.get(c) ?? [];
    list.push(row);
    map.set(c, list);
    return map;
  }, new Map());

  const ordered = RESTAURANT_TAG_CATEGORY_ORDER.flatMap((cat) => {
    const list = byCat.get(cat);
    if (!list?.length) return [];
    return [{ category: cat, tags: sortTagRows(list) }];
  });

  const extras = Array.from(byCat.entries())
    .filter(([cat, list]) => !RESTAURANT_TAG_CATEGORY_ORDER.includes(cat) && list?.length)
    .map(([cat, list]) => ({ category: cat, tags: sortTagRows(list) }));

  return [...ordered, ...extras];
}

/**
 * Flat list of tags for read-only display (e.g. restaurant detail), using the same category order as filters.
 *
 * @param {Array<{ id: string, slug: string, label: string, category: string, sort_order?: number }>} tags
 */
export function orderRestaurantTagsForDetail(tags) {
  if (!Array.isArray(tags) || tags.length === 0) return [];
  return groupRestaurantTagsByCategory(tags).flatMap((s) => s.tags);
}

/** Matches `dishTagSlugFromCanonical` output: `dish` + 32-char hex (uuid without hyphens) + label + hash. */
const DISH_CANONICAL_SLUG_RE = /^dish-[a-f0-9]{32}-/i;

/**
 * Facets that belong in the “Dishes” block on restaurant detail (below cuisine/vibe/price chips).
 * @param {{ category?: string, slug?: string } | null | undefined} tag
 */
export function isRestaurantDishFacetTag(tag) {
  if (!tag || typeof tag !== 'object') return false;
  if (tag.category === 'dish') return true;
  const slug = tag.slug != null ? String(tag.slug) : '';
  return DISH_CANONICAL_SLUG_RE.test(slug);
}

/**
 * Primary chips first (all non-dish facets, same order as filters), then dish chips — for stacked detail UI.
 * @param {Array<{ id: string, slug: string, label: string, category: string, sort_order?: number }>} tags
 */
export function splitRestaurantTagsForDetailDisplay(tags) {
  const ordered = orderRestaurantTagsForDetail(tags);
  const detailDishTags = ordered.filter(isRestaurantDishFacetTag);
  const detailTagsPrimary = ordered.filter((t) => !isRestaurantDishFacetTag(t));
  return { detailTagsPrimary, detailDishTags };
}
