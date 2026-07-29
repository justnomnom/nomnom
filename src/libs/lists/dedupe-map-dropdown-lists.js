/**
 * Deduplicate map dropdown list rows by string id (owned / collab / following chips).
 *
 * @param {Array<object | null | undefined> | null | undefined} lists
 * @returns {Array<object>}
 */
export function dedupeMapDropdownLists(lists) {
  if (!Array.isArray(lists)) return [];
  return lists.reduce(
    (acc, l) => {
      if (l?.id == null) return acc;
      const id = String(l.id);
      if (acc.seen.has(id)) return acc;
      acc.seen.add(id);
      acc.list.push({ ...l, id });
      return acc;
    },
    { seen: new Set(), list: [] }
  ).list;
}
