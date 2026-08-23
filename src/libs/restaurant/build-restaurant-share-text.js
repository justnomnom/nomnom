/**
 * The overview that travels with a shared spot.
 *
 * A bare link is the weakest form of a recommendation: the recipient has to open it before
 * they know whether they care. In Portugal these move through WhatsApp group chats, where a
 * link preview may not render at all (older clients, link previews disabled, forwarded
 * messages), so the essentials go in the message body itself rather than relying on the card.
 *
 * Kept deliberately short — three lines at most. This sits above the URL in a chat bubble,
 * and anything longer reads as spam rather than a recommendation.
 */

/**
 * Google-style 1–4 price level. Out-of-range and fractional values are dropped rather than
 * clamped — a bad ingest value should vanish, not render `€€€€€`. Numeric strings are
 * accepted, since DB and API payloads deliver them that way.
 */
const MIN_PRICE_LEVEL = 1;
const MAX_PRICE_LEVEL = 4;

/**
 * @param {unknown} value
 * @returns {string} `€`–`€€€€`, or `''` when the level is absent or out of range.
 */
function priceSymbols(value) {
  const level = Number(value);
  if (!Number.isInteger(level) || level < MIN_PRICE_LEVEL || level > MAX_PRICE_LEVEL) return '';
  return '€'.repeat(level);
}

/** @param {unknown} value @returns {string} */
function clean(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

/**
 * Ingest caps consensus summaries to roughly one sentence (observed 105–203 chars), so this
 * only fires if that ever changes. Cuts on a word boundary so a chat message never ends
 * mid-word.
 */
const MAX_CONSENSUS_CHARS = 240;

/** @param {string} value @returns {string} */
function clampSentence(value) {
  if (value.length <= MAX_CONSENSUS_CHARS) return value;
  const cut = value.slice(0, MAX_CONSENSUS_CHARS - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > MAX_CONSENSUS_CHARS * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * Build the plain-text overview for a shared restaurant.
 *
 * Locale-dependent values are passed in already formatted (`ratingText` comes from `fRating`,
 * which renders `4,9` under `pt`), so this stays pure and language-agnostic.
 *
 * @param {object} input
 * @param {unknown} input.name
 * @param {unknown} [input.area] locality line, e.g. `Caldas da Rainha · Leiria`.
 * @param {unknown} [input.ratingText] pre-formatted rating, e.g. `4.9`. A zero rating is
 *   dropped: a freshly ingested venue with no reviews should not be shared as `★ 0`, which
 *   reads as a bad review rather than an absent one. Matches the `rating > 0` guard the OG
 *   card uses.
 * @param {unknown} [input.priceLevel] Google-style 1–4.
 * @param {unknown} [input.consensus] `metadata.review_consensus.summary` — what reviewers
 *   agree on. Quoted with the same curly quotes the detail page renders it in.
 * @param {unknown} [input.consensusBasis] pre-localized attribution, e.g. `Based on 25
 *   reviews`. Dropped when there is no consensus to attribute it to.
 * @returns {string} newline-separated overview, or `''` when there is no name to lead with.
 */
export function buildRestaurantShareText({
  name,
  area,
  ratingText,
  priceLevel,
  consensus,
  consensusBasis,
}) {
  const title = clean(name);
  if (!title) return '';

  const ratingLabel = clean(ratingText);
  const hasRating = ratingLabel !== '' && Number.parseFloat(ratingLabel.replace(',', '.')) > 0;
  const stats = [hasRating ? `★ ${ratingLabel}` : '', priceSymbols(priceLevel)]
    .filter(Boolean)
    .join(' · ');
  const facts = [title, clean(area), stats].filter(Boolean).join('\n');

  // The consensus is the reason to open the link, so it gets its own block rather than being
  // appended to the stat line. Basis without a summary would attribute nothing, so it is
  // dropped alongside it — that is the trust-first framing BRAND.md asks for: name the source.
  const summary = clean(consensus);
  if (!summary) return facts;

  const quoted = [`“${clampSentence(summary)}”`, clean(consensusBasis)].filter(Boolean).join('\n');
  return [facts, quoted].join('\n\n');
}
