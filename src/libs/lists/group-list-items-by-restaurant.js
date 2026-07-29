/**
 * Group raw `list_items` rows into a saved-list membership map: restaurant id → list ids.
 *
 * Shared by the map's saved-state resolvers — the bounded per-place lookup
 * (`listIdsByRestaurantIdsForUser`) and the complete viewer map (`fetchViewerSavedListMap`).
 * Both fan the same `{ list_id, restaurant_id }` rows out the same way; keeping the shape in one
 * pure function means the map pin color and the detail card read identical membership logic.
 *
 * Rows with a missing `restaurant_id` or `list_id` are skipped; list ids are de-duplicated so a
 * restaurant on the same list twice (shouldn't happen, but RLS/joins can surface dupes) collapses
 * to a single entry. Insertion order is preserved.
 *
 * @param {Array<{ list_id?: string | null, restaurant_id?: string | null }> | null | undefined} items
 * @returns {Record<string, string[]>}
 */
export function groupListItemsByRestaurant(items) {
  /** @type {Record<string, Set<string>>} */
  const byRestaurant = {};
  if (!Array.isArray(items)) return {};
  items.forEach((row) => {
    const rid = row?.restaurant_id;
    const lid = row?.list_id;
    if (!rid || !lid) return;
    const key = String(rid);
    if (!byRestaurant[key]) byRestaurant[key] = new Set();
    byRestaurant[key].add(String(lid));
  });

  /** @type {Record<string, string[]>} */
  const map = {};
  Object.keys(byRestaurant).forEach((rid) => {
    map[rid] = [...byRestaurant[rid]];
  });
  return map;
}
