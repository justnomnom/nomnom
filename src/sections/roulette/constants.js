// Fallback bbox covering Portugal mainland + islands for `restaurants_in_bbox`.
export const ROULETTE_PREVIEW_BBOX = { west: -31.3, south: 32.6, east: -6.2, north: 42.2 };

/** Map loads any geocoded row; avoids empty map when spots sit outside the roulette preview band (e.g. tropics). */
export const MAP_VIEW_BBOX = { west: -180, south: -85, east: 180, north: 85 };

/** Greater Lisbon bbox for the public `/roleta/lisboa` tool. */
export const LISBOA_ROULETTE_BBOX = { west: -9.52, south: 38.68, east: -8.95, north: 39.08 };

/**
 * Roulette candidate-pool ceiling. The spin picks uniformly at random across the *whole* bbox, so
 * the pool must include every eligible restaurant — not a name-ordered prefix. We fetch lean id-only
 * rows via `restaurants_in_bbox_pins` (cap 5000), which keeps the payload tiny even at this ceiling.
 */
export const ROULETTE_POOL_FETCH_LIMIT = 5000;

/**
 * Page size for the map's scrollable spot list. Each row mounts a photo carousel + observers, so
 * we fetch detail one page at a time and let the user load more (the *pins* show the full set —
 * see {@link MAP_VIEW_PINS_LIMIT}).
 */
export const MAP_VIEW_FETCH_LIMIT = 80;

/**
 * Ceiling for the paginated spot list (matches the `restaurants_in_bbox` server cap). The map
 * still shows every pin beyond this; nobody scrolls a detail list past a few hundred rows.
 */
export const MAP_VIEW_DETAIL_MAX = 500;

/**
 * Map pins/clusters fetch cap (`restaurants_in_bbox_pins`). Lean payload (id/name/lat/lng/
 * rating/sponsored), so it can return every pin in view and feed Mapbox clustering true counts
 * instead of clustering a misleading 80-row slice. Matches the RPC's own server-side ceiling.
 */
export const MAP_VIEW_PINS_LIMIT = 5000;
