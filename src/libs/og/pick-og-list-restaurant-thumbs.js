/**
 * Pick unique restaurant image URLs for a public list OG collage.
 * @param {unknown} items
 * @param {number} [limit]
 * @returns {string[]}
 */
export function pickOgListRestaurantThumbUrls(items, limit = 4) {
  const max = Math.min(Math.max(Number(limit) || 4, 1), 6);
  if (!Array.isArray(items)) return [];

  const urls = [];
  items.some((row) => {
    const images = row?.restaurants?.restaurant_images;
    if (!Array.isArray(images) || !images.length) return false;
    const sorted = images
      .filter((img) => img?.url && img.moderation_status !== 'rejected')
      .toSorted((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const first = sorted[0]?.url;
    if (first && !urls.includes(first)) urls.push(first);
    return urls.length >= max;
  });
  return urls;
}
