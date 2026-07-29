import { haversineKm } from '../../utils/geo-distance';

/** @returns {value is 'list' | 'map'} */
export function isPlacesView(value) {
  return value === 'list' || value === 'map';
}

/**
 * Reorder list items for the public list page sort modes.
 * Rows without coordinates sink to the end of "Nearest"; rows without a timestamp sink
 * to the end of "Last added". Both sorts are stable.
 *
 * @param {Array<{ created_at?: string, restaurants?: { latitude?: number, longitude?: number } }>} items
 * @param {'relevance' | 'distance' | 'recent'} sortMode
 * @param {{ lat: number, lng: number } | null} [geoRef]
 * @returns {typeof items}
 */
export function sortListItemsByMode(items, sortMode, geoRef = null) {
  const base = Array.isArray(items) ? items : [];
  if (base.length < 2) return base;
  if (sortMode === 'recent') {
    return base
      .map((it, i) => ({ it, i }))
      .sort((a, b) => {
        const at = new Date(a.it?.created_at ?? 0).getTime() || -Infinity;
        const bt = new Date(b.it?.created_at ?? 0).getTime() || -Infinity;
        if (at !== bt) return bt - at;
        return a.i - b.i;
      })
      .map((x) => x.it);
  }
  if (sortMode === 'distance' && geoRef) {
    return base
      .map((it, i) => ({
        it,
        i,
        d: haversineKm(
          geoRef.lat,
          geoRef.lng,
          Number(it?.restaurants?.latitude),
          Number(it?.restaurants?.longitude)
        ),
      }))
      .sort((a, b) => (a.d !== b.d ? a.d - b.d : a.i - b.i))
      .map((x) => x.it);
  }
  return base;
}
