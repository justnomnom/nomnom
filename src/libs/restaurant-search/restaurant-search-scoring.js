/**
 * Pure ranking helpers for restaurant search results (no Supabase / LLM).
 */

/**
 * @param {Record<string, unknown>} row
 * @returns {number}
 */
export function ratingFromRow(row) {
  if (!row || typeof row !== 'object') return 0;
  const m =
    row.metadata && typeof row.metadata === 'object' && row.metadata !== null
      ? /** @type {Record<string, unknown>} */ (row.metadata)
      : {};
  const r = row.rating;
  if (typeof r === 'number' && Number.isFinite(r)) return r;
  const mr = m.rating;
  if (typeof mr === 'number' && Number.isFinite(mr)) return mr;
  return 0;
}

/**
 * @param {unknown} slugs
 * @param {Set<string>} allowed
 * @returns {string[]}
 */
export function filterSlugs(slugs, allowed) {
  if (!Array.isArray(slugs)) return [];
  const allow = allowed && typeof allowed.has === 'function' ? allowed : new Set();
  return slugs.map((s) => String(s).trim()).filter((s) => allow.has(s));
}

/**
 * @param {Record<string, unknown>} row
 * @param {string[]} must
 * @param {string[]} should
 * @param {Map<string, string[]>} slugMap
 * @returns {number}
 */
export function scoreRow(row, must, should, slugMap) {
  const id = row?.id != null ? String(row.id) : '';
  const map = slugMap instanceof Map ? slugMap : new Map();
  const slugs = new Set(map.get(id) ?? []);
  let score = 0;
  (Array.isArray(must) ? must : []).forEach((slug) => {
    if (slugs.has(slug)) score += 100;
  });
  (Array.isArray(should) ? should : []).forEach((slug) => {
    if (slugs.has(slug)) score += 30;
  });
  score += ratingFromRow(row) * 2;
  return score;
}
