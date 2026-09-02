const PAGE_SIZE = 6;

/**
 * Page size for `/countries/[country]/[city]/restaurants` list views.
 */
export function getRestaurantPageSize() {
  return PAGE_SIZE;
}

/**
 * Builds list href for pagination (page 1 omits `/page/N` when N is 1).
 *
 * @param {string} country
 * @param {string} city
 * @param {number} page
 * @param {string} [tag]
 */
export function restaurantListPath(country, city, page, tag) {
  const base = `/countries/${country}/${city}/restaurants`;
  if (tag) {
    if (page <= 1) return `${base}/tag/${encodeURIComponent(tag)}`;
    return `${base}/tag/${encodeURIComponent(tag)}/page/${page}`;
  }
  if (page <= 1) return base;
  return `${base}/page/${page}`;
}

/**
 * Slice a restaurant (or any) list for a 1-based page.
 *
 * @template T
 * @param {T[]} items
 * @param {number} page
 * @param {number} pageSize
 * @returns {T[]}
 */
export function paginateRestaurants(items, page, pageSize) {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 1;
  const start = (safePage - 1) * safeSize;
  return items.slice(start, start + safeSize);
}
