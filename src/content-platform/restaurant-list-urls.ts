const PAGE_SIZE = 6;

export function getRestaurantPageSize() {
  return PAGE_SIZE;
}

/**
 * Builds list href for pagination (page 1 omits `/page/N` when N is 1).
 */
export function restaurantListPath(
  country: string,
  city: string,
  page: number,
  tag?: string
): string {
  const base = `/countries/${country}/${city}/restaurants`;
  if (tag) {
    if (page <= 1) return `${base}/tag/${encodeURIComponent(tag)}`;
    return `${base}/tag/${encodeURIComponent(tag)}/page/${page}`;
  }
  if (page <= 1) return base;
  return `${base}/page/${page}`;
}
