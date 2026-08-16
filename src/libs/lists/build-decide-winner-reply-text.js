/**
 * Plain-text body for “The Reply” — paste the locked winner back into WhatsApp.
 *
 * The restaurant page URL is attached separately (share sheet / clipboard join) so the
 * link preview can show a photo. Maps goes in the body when present so the chat has a
 * one-tap directions line even if the preview fails.
 */

/** @param {unknown} value @returns {string} */
function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * @param {object} input
 * @param {unknown} input.lead Localized lead line, e.g. `We're going here: Taberna`.
 * @param {unknown} [input.mapsLink] Google Maps (or similar) URL for the winner.
 * @returns {string} Message body without the restaurant page URL.
 */
export function buildDecideWinnerReplyText({ lead, mapsLink }) {
  const head = clean(lead);
  if (!head) return '';
  const maps = clean(mapsLink);
  if (!maps) return head;
  return `${head}\n\n${maps}`;
}
