import { createHash } from 'crypto';

/**
 * Compare dish strings loosely (trim, lower, collapse spaces).
 * @param {string} s
 */
export function normalizeDishLabelKey(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Globally-unique slug for a dish tag under a restaurant (tags.slug is unique app-wide).
 * @param {string} restaurantId uuid
 * @param {string} canonicalEn English menu-style canonical label
 */
export function dishTagSlugFromCanonical(restaurantId, canonicalEn) {
  const rid = String(restaurantId).replace(/-/g, '');
  const base = String(canonicalEn ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  const safeBase = base.length ? base : 'x';
  const h = createHash('sha256')
    .update(`${restaurantId}:${canonicalEn}`, 'utf8')
    .digest('hex')
    .slice(0, 10);
  let slug = `dish-${rid}-${safeBase}-${h}`;
  if (slug.length > 220) {
    slug = slug.slice(0, 220);
  }
  return slug;
}
