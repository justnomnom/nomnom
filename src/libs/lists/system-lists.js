/**
 * Resolving the two lists that signup seeds for every user.
 *
 * A database trigger creates "Must go" and "Visited" on signup — asserted by
 * `tests/e2e/dashboard/delete-account.spec.ts`, which requires a fresh account to own
 * lists. No application code has ever referenced them, so today they are ordinary lists
 * distinguishable only by their name, which the user is free to change.
 *
 * The durable fix is a `lists.system_key` column plus a guard trigger (planned in
 * `docs/plan-visited-import-comments.md` §1.2). Until that migration is applied, name
 * matching is all that exists. So this resolver prefers `system_key` whenever the column
 * is present and falls back to the name — which means it starts working better the moment
 * the migration lands, with no code change.
 */

/** Seeded names, lowercased. Accents are stripped before comparison. */
const SEEDED_NAMES = Object.freeze({
  visited: ['visited'],
  must_go: ['must go'],
});

/**
 * Lowercase and strip diacritics, so a renamed "Visitado" still compares predictably.
 * Mirrors `normalizeName` in `pick-restaurant-match.js`.
 *
 * @param {unknown} value
 * @returns {string}
 */
function normalize(value) {
  if (typeof value !== 'string') return '';
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Pick the seeded lists out of a user's own list rows.
 *
 * Ties are broken by `created_at` ascending, so a user who later created their own list
 * called "Visited" does not shadow the seeded one. Rows carrying an explicit `system_key`
 * always win over a name match, whatever their age.
 *
 * @param {Array<{ id?: unknown, name?: unknown, system_key?: unknown, created_at?: unknown }> | null | undefined} rows
 * @returns {{ visited: string | null, must_go: string | null }}
 */
export function pickSystemLists(rows) {
  const byKey = { visited: null, must_go: null };
  const byName = { visited: null, must_go: null };

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    if (!row || typeof row !== 'object' || !row.id) return;
    const id = String(row.id);
    const createdAt = typeof row.created_at === 'string' ? row.created_at : '';

    const key = typeof row.system_key === 'string' ? row.system_key : '';
    if (key === 'visited' || key === 'must_go') {
      if (!byKey[key] || createdAt < byKey[key].createdAt) byKey[key] = { id, createdAt };
      return;
    }

    const name = normalize(row.name);
    Object.entries(SEEDED_NAMES).forEach(([slot, names]) => {
      if (!names.includes(name)) return;
      if (!byName[slot] || createdAt < byName[slot].createdAt) byName[slot] = { id, createdAt };
    });
  });

  return {
    visited: (byKey.visited ?? byName.visited)?.id ?? null,
    must_go: (byKey.must_go ?? byName.must_go)?.id ?? null,
  };
}

/**
 * Set difference, preserving the order of `ids`.
 *
 * Used to take visited spots out of the Roulette pool. Kept separate from the fetching so
 * the exclusion itself is trivially testable.
 *
 * @param {Array<string | null | undefined> | null | undefined} ids
 * @param {Iterable<string> | null | undefined} excludedIds
 * @returns {string[]}
 */
export function excludeIds(ids, excludedIds) {
  const excluded = new Set([...(excludedIds ?? [])].map((id) => String(id)));
  return (Array.isArray(ids) ? ids : [])
    .filter((id) => id != null && id !== '')
    .map((id) => String(id))
    .filter((id) => !excluded.has(id));
}
