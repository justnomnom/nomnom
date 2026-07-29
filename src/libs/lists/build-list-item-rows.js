/**
 * Build `list_items` upsert rows from a set of restaurant ids.
 *
 * Dedupes the ids first. A single `INSERT ... ON CONFLICT (list_id, restaurant_id)`
 * statement that contains the same pair twice is rejected by Postgres with
 * "ON CONFLICT DO UPDATE command cannot affect row a second time" (SQLSTATE 21000),
 * which fails the whole batch. This bit Google Maps imports: two distinct Maps
 * places can resolve to the same NomNom restaurant (coordinate-box match falling
 * back to the nearest row, or the `ilike` name fallback), producing duplicate ids.
 *
 * Falsy ids are dropped. `sort_order` is contiguous over the deduped rows.
 *
 * @param {{ listId: string, restaurantIds?: (string|null|undefined)[], addedBy: string }} input
 * @returns {{ list_id: string, restaurant_id: string, sort_order: number, added_by: string }[]}
 */
export function buildListItemRows({ listId, restaurantIds, addedBy }) {
  const seen = new Set();
  return (Array.isArray(restaurantIds) ? restaurantIds : []).reduce((rows, restaurantId) => {
    if (restaurantId && !seen.has(restaurantId)) {
      seen.add(restaurantId);
      rows.push({
        list_id: listId,
        restaurant_id: restaurantId,
        sort_order: rows.length,
        added_by: addedBy,
      });
    }
    return rows;
  }, []);
}
