// Opening-hook copy for restaurant reels.
//
// Every reel used to open on the same hardcoded line, which reads as
// mass-produced the moment two of them run back to back. These templates vary
// the hook using only figures the database actually holds — a mention count, a
// review count, a rating — so nothing new is claimed. The template is chosen by
// hashing the subject id, so a venue always opens the same way.
//
// The hook renders at 106px serif on a 1080px canvas, so a line longer than
// MAX_LINE_CHARS would overflow. Templates that cannot fit are skipped, not
// truncated.

export const MAX_LINE_CHARS = 14;
/** Below this a "N reviews mention…" line is not worth claiming. */
export const MIN_MENTIONS = 3;
/** Below this a review count is not impressive enough to lead with. */
export const MIN_REVIEW_COUNT = 50;

const fits = (lines) => lines.every((l) => String(l).length <= MAX_LINE_CHARS);

/** Stable non-cryptographic hash so a subject keeps its hook across runs. */
export function hashId(id) {
  let h = 0;
  for (const ch of String(id ?? '')) h = (h * 31 + ch.codePointAt(0)) % 100_000;
  return h;
}

const dishName = (d) => (Array.isArray(d) ? d[0] : d);
const dishMentions = (d) => (Array.isArray(d) && Number.isFinite(d[1]) ? d[1] : null);

/**
 * Build the hook for one restaurant.
 *
 * @param {{ id: string, location?: string, dishes?: Array, rating?: number|null,
 *   reviewCount?: number|null }} subject
 * @returns {{ overline: string, lines: string[], template: string }}
 */
export function buildHook({ id, location, dishes = [], rating, reviewCount } = {}) {
  const overline = `${location || 'Right here'} · right now`;
  const candidates = [];

  // "21 reviews / mention the / Carbonara." — the count comes straight from the
  // ingest metadata's mention tally.
  const topDish = dishes.find((d) => (dishMentions(d) ?? 0) >= MIN_MENTIONS && dishName(d));
  if (topDish) {
    const lines = [`${dishMentions(topDish)} reviews`, 'mention the', `${dishName(topDish)}.`];
    if (fits(lines)) candidates.push({ template: 'mentions', lines });
  }

  // "924 reviews. / 4.9 stars. / See why." — both figures are real; the last
  // line is an invitation, not a claim.
  const count = Number(reviewCount);
  const stars = Number(rating);
  if (Number.isFinite(count) && count >= MIN_REVIEW_COUNT && Number.isFinite(stars) && stars > 0) {
    const lines = [`${count.toLocaleString('en-US')} reviews.`, `${stars.toFixed(1)} stars.`, 'See why.'];
    if (fits(lines)) candidates.push({ template: 'numbers', lines });
  }

  // The original copy is the floor, not a peer: a real figure always beats
  // generic marketing copy, so it is only used when no template qualified.
  if (!candidates.length) {
    candidates.push({ template: 'default', lines: ['Locals', "won't stop", 'talking about', 'this spot.'] });
  }

  const chosen = candidates[hashId(id) % candidates.length];
  return { overline, lines: chosen.lines, template: chosen.template };
}
