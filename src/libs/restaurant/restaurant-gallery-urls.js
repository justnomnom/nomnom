/**
 * Shared gallery URL resolution for restaurant rows (detail page, roulette, map).
 * Prefer `restaurant_images` when the relation is loaded; otherwise metadata photos.
 */

/**
 * Blank-vs-whitespace matters here: a truthiness check passes `'   '`, which
 * reaches the DOM as `<img src="   ">` and renders as a broken image. Trim
 * first, exactly like `add()` below, so both paths agree on what "no image"
 * means for the same blob.
 *
 * @param {unknown} metadata
 */
function heroImageFromMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') return null;
  const firstNonBlank = (value) =>
    typeof value === 'string' && value.trim() ? value.trim() : null;
  const hero = firstNonBlank(metadata.hero_url);
  if (hero) return hero;
  const image = firstNonBlank(metadata.image_url);
  if (image) return image;
  if (Array.isArray(metadata.photos)) {
    const photo = firstNonBlank(metadata.photos[0]);
    if (photo) return photo;
  }
  return null;
}

/**
 * All gallery URLs from metadata (photos[], hero_url, image_url).
 * @param {unknown} metadata
 * @returns {string[]}
 */
export function galleryImagesFromMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') return [];
  const out = [];
  const add = (u) => {
    if (typeof u === 'string' && u.trim()) {
      const s = u.trim();
      if (!out.includes(s)) out.push(s);
    }
  };
  if (Array.isArray(metadata.photos) && metadata.photos.length > 0) {
    metadata.photos.forEach((p) => add(typeof p === 'string' ? p : ''));
  }
  add(typeof metadata.hero_url === 'string' ? metadata.hero_url : '');
  add(typeof metadata.image_url === 'string' ? metadata.image_url : '');
  if (out.length === 0) {
    const h = heroImageFromMetadata(metadata);
    if (h) out.push(h);
  }
  return out;
}

/**
 * Prefer normalized `restaurant_images` rows when present (ordered, moderation-aware).
 * @param {unknown} restaurant
 * @returns {string[] | null} null when no usable rows
 */
export function galleryImagesFromRestaurantRow(restaurant) {
  const rows = restaurant?.restaurant_images;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const allowed = rows.filter((row) => row && row.moderation_status !== 'rejected');
  if (allowed.length === 0) return null;
  return [...allowed]
    .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0))
    .map((r) => r.url)
    .filter((u) => typeof u === 'string' && u.trim());
}

/**
 * Primary image for carousel / hero: curated images first, then metadata.
 * @param {unknown} restaurant
 * @returns {string[]}
 */
export function galleryUrlsForRestaurant(restaurant) {
  const meta = restaurant?.metadata;
  return galleryImagesFromRestaurantRow(restaurant) ?? galleryImagesFromMetadata(meta);
}
