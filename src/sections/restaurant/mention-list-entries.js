/**
 * Pure referenced-list helpers for the restaurant "Mentioned by" feed — JSX/hook-free
 * so they can be unit tested, in the same spirit as `map-sheet-restaurant-builders.js`.
 *
 * A "list entry" is one row in the "On list: …" line under a mention card: the list's id
 * and name, plus `savedAt` — the `list_items.created_at` recording when that spot went on
 * that list. That timestamp has always been read to sort the feed and was never shown, so
 * "on a list" carried no sense of whether that meant last week or three years ago.
 */

/** @typedef {{ id: string | null, name: string | null, savedAt: string | null }} ListEntry */

/**
 * The embedded `lists` relation on a `list_items` row. PostgREST returns either an object
 * or a single-element array depending on how the embed is expressed.
 *
 * @param {object | null | undefined} row
 * @returns {object | null}
 */
export function listEmbedFromItemRow(row) {
  const L = row?.lists;
  if (Array.isArray(L)) return L[0] ?? null;
  return L && typeof L === 'object' ? L : null;
}

/**
 * @param {object | null | undefined} row
 * @returns {string} trimmed list name, or '' when absent
 */
export function listNameFromItemRow(row) {
  const obj = listEmbedFromItemRow(row);
  if (obj && typeof obj.name === 'string') {
    return obj.name.trim() || '';
  }
  return '';
}

/**
 * Earliest of two ISO timestamps, ignoring nulls.
 *
 * ISO-8601 UTC strings sort lexicographically, which is why this compares directly rather
 * than parsing. Mixed offsets would break that — ingest and Postgres both emit UTC.
 *
 * @param {string | null | undefined} a
 * @param {string | null | undefined} b
 * @returns {string | null}
 */
export function earliestSavedAt(a, b) {
  const candidates = [a, b].filter((x) => typeof x === 'string' && x).sort();
  return candidates[0] ?? null;
}

/**
 * Build (or extend) the entry for the list a mention row belongs to.
 *
 * Keeps the *earliest* `savedAt` when the same list is seen twice: the interesting fact is
 * when the spot first went on the list, not when it was last touched.
 *
 * @param {object | null | undefined} row a `list_items` row with an embedded `lists`
 * @param {ListEntry | undefined} existing entry already collected for this list, if any
 * @returns {ListEntry | null} null when the row identifies no list at all
 */
export function listEntryForMentionRow(row, existing) {
  const listObj = listEmbedFromItemRow(row);
  const listId = listObj?.id ?? row?.list_id ?? null;
  const listName = listNameFromItemRow(row);
  if (listId == null && !listName) return null;

  const savedAt = typeof row?.created_at === 'string' ? row.created_at : null;
  return {
    id: listId != null ? String(listId) : null,
    name: listName || null,
    savedAt: earliestSavedAt(existing?.savedAt, savedAt),
  };
}

/**
 * Dedupe referenced lists by id, filling in whichever side knows the name or the save date.
 * Named lists sort before unnamed ones, then alphabetically.
 *
 * @param {ListEntry[] | null | undefined} primary
 * @param {ListEntry[] | null | undefined} extra
 * @returns {ListEntry[]}
 */
export function mergeReferencedListsById(primary, extra) {
  /** @type {Map<string, ListEntry>} */
  const map = new Map();
  const push = (L) => {
    if (!L || L.id == null) return;
    const id = String(L.id);
    const rawName = L.name != null ? String(L.name).trim() : '';
    const name = rawName || null;
    const savedAt = typeof L.savedAt === 'string' ? L.savedAt : null;
    const prev = map.get(id);
    if (!prev) {
      map.set(id, { id, name, savedAt });
      return;
    }
    map.set(id, {
      id,
      name: prev.name || name,
      // Either side may be the one that knows when it was saved.
      savedAt: prev.savedAt ?? savedAt,
    });
  };
  (primary ?? []).forEach(push);
  (extra ?? []).forEach(push);
  return [...map.values()].sort((a, b) => {
    const aHas = Boolean(a.name && String(a.name).trim());
    const bHas = Boolean(b.name && String(b.name).trim());
    if (aHas !== bHas) return aHas ? -1 : 1;
    return String(a.name || '').localeCompare(String(b.name || ''), undefined, {
      sensitivity: 'base',
    });
  });
}
