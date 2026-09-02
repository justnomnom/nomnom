/**
 * Title-case a URL slug for hub headings (`portugal` → `Portugal`).
 * @param {string} slug
 * @returns {string}
 */
export function displaySlug(slug) {
  return String(slug || '')
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
