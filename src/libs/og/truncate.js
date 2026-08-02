/**
 * Text fitting for the share cards.
 *
 * Plain JS rather than living in `og-card.tsx`: it is pure string logic with no JSX, and the
 * unit-test loader resolves `.tsx` but cannot execute it, so anything left in that file is
 * untestable. Matches the rest of `src/libs/og/`.
 */

/**
 * Collapse whitespace and cut to `max` characters, preferring a word boundary.
 *
 * Breaking mid-word is only accepted when the last space falls in the first 60% of the
 * budget — otherwise a long final word would eat most of the line and leave a stub.
 *
 * @param {unknown} value non-strings (null, numbers, objects) collapse to `''`.
 * @param {number} max maximum length of the result, ellipsis included.
 * @returns {string}
 */
export function truncate(value, max) {
  const text = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
