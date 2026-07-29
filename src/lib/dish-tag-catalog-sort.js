/**
 * Sort dish catalog rows by sort_order then slug (stable for prefs / match UI).
 *
 * @param {Array<{ sort_order?: number, slug?: string }>} rows
 * @returns {Array<{ sort_order?: number, slug?: string }>}
 */
export function sortDishCatalogRows(rows) {
  if (!Array.isArray(rows)) return [];
  return [...rows].sort((a, b) => {
    const so = (a?.sort_order ?? 0) - (b?.sort_order ?? 0);
    if (so !== 0) return so;
    return String(a?.slug ?? '').localeCompare(String(b?.slug ?? ''));
  });
}
