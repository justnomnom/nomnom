/**
 * Title-case-ish label from a URL slug (`lisbon-lunch` → `lisbon lunch`).
 *
 * @param {string} slug
 * @returns {string}
 */
export function formatSlugLabel(slug) {
  return slug.replace(/-/g, ' ');
}

/**
 * When multiple siblings exist, link the section label to another doc in the same folder
 * (never the current page).
 *
 * @param {string[]} slugs
 * @param {string} currentSlug
 * @param {(s: string) => string} hrefForSlug
 * @returns {string | null}
 */
export function siblingHubHref(slugs, currentSlug, hrefForSlug) {
  const sorted = [...new Set(slugs)].sort();
  if (sorted.length <= 1) return null;
  const other = sorted.find((s) => s !== currentSlug);
  return hrefForSlug(other ?? sorted[0]);
}
