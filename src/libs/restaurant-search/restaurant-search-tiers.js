/**
 * Progressive relaxation for the AI restaurant search plan.
 *
 * A tag/cuisine search must never surface restaurants that don't match the requested filter —
 * otherwise the Map shows pins under a chip they don't belong to (e.g. "ramen" selected, but the
 * pins are random restaurants). This helper walks the plan through increasingly loose tiers but
 * STOPS before ever dropping the tag constraint entirely:
 *
 *   1. primary tags + matchAll + minRating
 *   2. if matchAll narrowed too far, the same primary tags with matchAll=false
 *   3. merge must+should tags (any-match)
 *   4. drop minRating (keep the tags)
 *
 * If every tier still comes back thin, the result is whatever the tag-constrained query returned
 * (possibly empty). Callers handle the empty case by widening the geographic SCOPE with the same
 * plan, or — only as a clearly-labelled last resort — by fetching unfiltered nearby places. The
 * decision to abandon the filter is the caller's to surface, never a silent swap inside execution.
 *
 * Note: when the plan carries no tag constraint at all (no must/should tags), tier 1 already issues
 * an unfiltered query, so a genuinely empty plan still returns everything — there is no filter to
 * betray in that case.
 */

/** Below this many matches a tier is considered too thin and the next relaxation runs. */
export const MIN_RESULTS = 4;

/**
 * @param {object} args
 * @param {string[]} args.must — must-match tag slugs (already filtered to the catalog)
 * @param {string[]} args.should — should-match tag slugs (already filtered to the catalog)
 * @param {number | null} args.minRating
 * @param {boolean} args.matchAllMust
 * @param {(tagSlugs: string[], matchAll: boolean, minRating: number | null) => Promise<Array<Record<string, unknown>>>} args.run
 *   — issues one search with the given tag set / matchAll / minRating; all other plan constraints
 *   (free text, vibe, category, sort, scope) are captured by the caller's closure.
 * @param {number} [args.minResults]
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function runTieredTagSearch({
  must,
  should,
  minRating,
  matchAllMust,
  run,
  minResults = MIN_RESULTS,
}) {
  const primary = must.length ? must : should;
  const matchAll = Boolean(matchAllMust && primary.length > 1);
  let mr = minRating;

  let rows = await run(primary, matchAll, mr);

  if (rows.length < minResults && matchAll && primary.length > 1) {
    rows = await run(primary, false, mr);
  }
  if (rows.length < minResults && must.length && should.length) {
    const merged = [...new Set([...must, ...should])];
    rows = await run(merged, false, mr);
  }
  if (rows.length < minResults && mr != null && mr > 0) {
    mr = null;
    const merged = [...new Set([...must, ...should])];
    const tagPool = merged.length ? merged : primary;
    rows = await run(tagPool, false, null);
  }

  return rows;
}
