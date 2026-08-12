/**
 * Slim a restaurant's `metadata` blob down to the only keys any client actually
 * reads for a map marker, list card, or detail page.
 *
 * `restaurants.metadata` is a full ingest blob — averaging ~7.7 KB/row live, of
 * which `user_reviews` alone is ~99% (raw scraped review text). Map/search RPCs
 * slim via `public.restaurant_card_metadata()` in SQL; this helper is the shared
 * allowlist for any path that still touches raw metadata (detail SSR, ingest
 * previews, tests) so client payloads never grow the full ingest blob again.
 *
 * The allowlist below is the *complete* set of restaurant-metadata keys read
 * anywhere in the client — verified by sweeping `src/` for `metadata.<key>`
 * accesses.
 *
 * Keys deliberately dropped: user_reviews, about, popular_times,
 * mentioned_in_reviews, hours_parsed, open_hours, owner, reviews_link,
 * complete_address, categories, and every ingest_* / data_id / cid / plus_code
 * internal key. Tags for display come from the `restaurant_tags` join, not from
 * `metadata.tag_slugs` (which is only a server-side search filter), so it is not
 * in the allowlist.
 */

/** @type {ReadonlyArray<string>} */
const CARD_METADATA_KEYS = ['rating', 'review_consensus', 'photos', 'hero_url', 'image_url'];

/**
 * @param {unknown} metadata
 * @returns {Record<string, unknown> | null} slimmed object, or null if nothing survives
 */
export function slimRestaurantCardMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }
  const src = /** @type {Record<string, unknown>} */ (metadata);
  /** @type {Record<string, unknown>} */
  const slim = {};

  if (typeof src.rating === 'number' && Number.isFinite(src.rating)) {
    slim.rating = src.rating;
  }
  if (src.review_consensus && typeof src.review_consensus === 'object') {
    slim.review_consensus = src.review_consensus;
  }
  if (Array.isArray(src.photos)) {
    slim.photos = src.photos.filter((p) => typeof p === 'string' && p.trim());
  }
  if (typeof src.hero_url === 'string' && src.hero_url.trim()) {
    slim.hero_url = src.hero_url.trim();
  }
  if (typeof src.image_url === 'string' && src.image_url.trim()) {
    slim.image_url = src.image_url.trim();
  }

  return Object.keys(slim).length > 0 ? slim : null;
}

/**
 * Map an array of RPC rows, replacing each row's `metadata` with the slimmed
 * version. Rows without a `metadata` field pass through untouched. Non-array
 * input yields an empty array so callers can use it directly on `data ?? []`.
 *
 * @template {Record<string, unknown>} T
 * @param {ReadonlyArray<T> | null | undefined} rows
 * @returns {Array<T>}
 */
export function slimRestaurantRowsMetadata(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) =>
    row && typeof row === 'object' && 'metadata' in row
      ? { ...row, metadata: slimRestaurantCardMetadata(row.metadata) }
      : row
  );
}

export { CARD_METADATA_KEYS };
