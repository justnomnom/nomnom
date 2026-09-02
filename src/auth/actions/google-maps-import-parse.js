/**
 * Google Maps list-import URL allowlist + nested JSON place extraction.
 * Kept out of the `'use server'` action file so these can stay sync helpers.
 */

const GMAPS_URL_RE = /^https?:\/\/(maps\.app\.goo\.gl\/|www\.google\.com\/maps)/i;

/** Safety cap so a pathologically large shared list can't blow up the action. */
export const MAX_IMPORT_PLACES = 500;

/** @param {unknown} url */
export function isGoogleMapsUrl(url) {
  return typeof url === 'string' && GMAPS_URL_RE.test(url.trim());
}

/**
 * Walk Google's getlist JSON and collect unique named places with lat/lng.
 *
 * @param {unknown} json
 * @returns {Array<{ name: string, address: string | null, lat: number, lng: number }>}
 */
export function parsePlacesFromJson(json) {
  const places = [];
  const seen = new Set();

  function walk(node, depth) {
    if (depth > 8 || !Array.isArray(node)) return;
    if (
      node[0] === null &&
      Array.isArray(node[1]) &&
      typeof node[2] === 'string' &&
      node[2].length > 2
    ) {
      const inner = node[1];
      const coords = inner[5];
      if (
        Array.isArray(coords) &&
        coords[0] === null &&
        coords[1] === null &&
        typeof coords[2] === 'number' &&
        typeof coords[3] === 'number'
      ) {
        const name = node[2].trim();
        const key = name.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          places.push({
            name,
            address: typeof inner[4] === 'string' ? inner[4] : null,
            lat: coords[2],
            lng: coords[3],
          });
        }
        return;
      }
    }
    node.forEach((child) => walk(child, depth + 1));
  }

  walk(json, 0);
  return places.slice(0, MAX_IMPORT_PLACES);
}
