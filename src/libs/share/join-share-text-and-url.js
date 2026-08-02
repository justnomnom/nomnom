/**
 * Composing a share message for the clipboard fallback.
 *
 * Lives here rather than beside the restaurant share text because `useShareLink` is generic —
 * lists, profiles, the discover feed and the map sheet all use it. A hook that eight surfaces
 * depend on should not import from a restaurant module, and the next surface to grow an
 * overview will want this same join.
 */

/** @param {unknown} value @returns {string} */
function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Join an overview and a link for the clipboard, where there is no share sheet to keep the
 * two apart. Either side may be absent.
 *
 * @param {unknown} text
 * @param {unknown} url
 * @returns {string} blank-line separated, or whichever side is present.
 */
export function joinShareTextAndUrl(text, url) {
  return [clean(text), clean(url)].filter(Boolean).join('\n\n');
}
