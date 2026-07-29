/**
 * Ordered unique list_item ids from snapshot purchase rows for the same list.
 * Returns `null` if any row lacks `captured_list_item_ids` (legacy) — caller shows all items.
 *
 * @param {{ captured_list_item_ids?: string[] | null }[] | null | undefined} rows
 * @returns {string[] | null}
 */
export function mergeSnapshotPurchaseCapturedItemIds(rows) {
  if (!rows?.length) return null;
  if (rows.some((r) => r.captured_list_item_ids == null)) return null;

  const merged = [];
  const seen = new Set();
  rows.forEach((r) => {
    const ids = r.captured_list_item_ids;
    if (!Array.isArray(ids)) return;
    ids.forEach((id) => {
      if (id && !seen.has(id)) {
        seen.add(id);
        merged.push(id);
      }
    });
  });
  return merged;
}
