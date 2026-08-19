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
 * @param {unknown} [input.when] Localized table time, e.g. `Tonight at 20:00`.
 * @param {unknown} [input.mapsLink] Google Maps (or similar) URL for the winner.
 * @returns {string} Message body without the restaurant page URL.
 */
export function buildWinnerReplyText({ lead, when, mapsLink }) {
  const head = clean(lead);
  if (!head) return '';
  const whenLine = clean(when);
  const body = whenLine ? `${head}\n${whenLine}` : head;
  const maps = clean(mapsLink);
  if (!maps) return body;
  return `${body}\n\n${maps}`;
}
