/**
 * Pure review body truncation — JSX-free for unit tests.
 */

/**
 * @param {string} str
 * @param {number} maxChars
 * @returns {{ text: string, truncated: boolean }}
 */
export function previewTruncatedBody(str, maxChars) {
  if (typeof str !== 'string') return { text: '', truncated: false };
  if (!Number.isFinite(maxChars) || maxChars <= 0) {
    return { text: str, truncated: false };
  }
  if (str.length <= maxChars) return { text: str, truncated: false };
  const slice = str.slice(0, maxChars);
  const breakAt = Math.max(slice.lastIndexOf('\n'), slice.lastIndexOf(' '));
  const cut = breakAt > maxChars * 0.55 ? slice.slice(0, breakAt) : slice;
  const trimmed = cut.trimEnd();
  const base = trimmed.length > 0 ? trimmed : slice.trimEnd();
  return { text: `${base}…`, truncated: true };
}
