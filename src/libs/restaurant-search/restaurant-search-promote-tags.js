/**
 * Deterministic rescue for the AI restaurant search plan.
 *
 * The LLM that builds the search plan sometimes drops a clear cuisine/dish term
 * (e.g. "ramen", "sushi", "fine dining") into `freeTextSearch` instead of selecting its
 * catalog tag. When that happens the Map filter UI never lights up — `planPrimaryTagSlugs`
 * has no `mustTagSlugs`/`shouldTagSlugs` to surface, so the user sees results with no
 * matching filter chip selected.
 *
 * This module post-processes the plan with a conservative, exact whole-word match: if a
 * catalog tag's slug or label appears as a standalone token/phrase in the user's query, we
 * add that slug to `mustTagSlugs`. An identical `freeTextSearch` is cleared so the search
 * isn't double-constrained (tag AND name must both contain the term).
 */

/** Escape a string for safe inclusion in a RegExp. */
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Whole-word (token/phrase) match of `needle` inside a padded, lowercased query.
 * Boundaries are any non-alphanumeric char, so "ramen" matches "cosy ramen tonight" but not
 * "ramenya"; "fine dining" matches as a phrase. Terms under 3 chars are ignored to avoid
 * accidental matches on tiny labels.
 *
 * @param {string} paddedQuery — query lowercased and wrapped in spaces
 * @param {string} needle
 */
function hasWholeWord(paddedQuery, needle) {
  const n = needle.trim().toLowerCase();
  if (n.length < 3) return false;
  const re = new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(n)}(?:$|[^a-z0-9])`, 'i');
  return re.test(paddedQuery);
}

/**
 * @param {string} query — the raw user request
 * @param {object} plan — structured plan from the LLM (shape of restaurantSearchPlanSchema)
 * @param {Array<{ slug?: string, label?: string }>} tagsCatalog
 * @returns {object} the plan, with exact catalog-tag mentions promoted into `mustTagSlugs`
 */
export function promoteExactQueryTags(query, plan, tagsCatalog) {
  if (!plan || typeof plan !== 'object') return plan;
  if (typeof query !== 'string' || !query.trim() || !Array.isArray(tagsCatalog)) return plan;

  const paddedQuery = ` ${query.toLowerCase()} `;

  /** @type {string[]} */
  const matchedSlugs = [];
  /** @type {Set<string>} */
  const matchedTerms = new Set();

  tagsCatalog.forEach((tag) => {
    const slug = typeof tag?.slug === 'string' ? tag.slug.trim() : '';
    if (!slug) return;
    const slugLower = slug.toLowerCase();
    const slugSpaced = slugLower.replace(/-/g, ' ');
    const label = typeof tag?.label === 'string' ? tag.label.trim().toLowerCase() : '';

    const candidates = [slugLower, slugSpaced, label].filter(Boolean);
    const hit = candidates.find((c) => hasWholeWord(paddedQuery, c));
    if (hit) {
      matchedSlugs.push(slug);
      candidates.forEach((c) => matchedTerms.add(c));
    }
  });

  if (!matchedSlugs.length) return plan;

  const existingMust = Array.isArray(plan.mustTagSlugs) ? plan.mustTagSlugs : [];
  const mustTagSlugs = [...new Set([...existingMust, ...matchedSlugs])];

  // Clear a free-text term now fully captured by a promoted tag — leaving it would also force
  // the restaurant name/metadata to contain it, over-filtering the results.
  let { freeTextSearch } = plan;
  if (typeof freeTextSearch === 'string') {
    const ft = freeTextSearch.trim().toLowerCase();
    if (matchedTerms.has(ft)) {
      freeTextSearch = null;
    }
  }

  return { ...plan, mustTagSlugs, freeTextSearch };
}
