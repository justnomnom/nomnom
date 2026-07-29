import { RESTAURANT_ID_UUID_RE } from '../../libs/restaurant/restaurant-id-uuid';

/** Clamp desktop map list panel width (px) to sensible bounds for the viewport. */
export function clampMapListPanelWidth(px, viewportW) {
  const vw = viewportW ?? (typeof window !== 'undefined' ? window.innerWidth : 1200);
  const max = Math.min(560, Math.floor(vw * 0.5));
  return Math.round(Math.min(Math.max(px, 260), max));
}

/**
 * @param {unknown} raw
 * @returns {{
 *   savedActive: boolean,
 *   followingActive: boolean,
 *   selectedSavedListIds: 'all' | string[],
 *   selectedFollowingListIds: 'all' | string[],
 * }}
 */
export function parseMapChipPrefs(raw) {
  const defaults = {
    savedActive: false,
    followingActive: false,
    selectedSavedListIds: /** @type {'all' | string[]} */ ('all'),
    selectedFollowingListIds: /** @type {'all' | string[]} */ ('all'),
  };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaults;
  const parseSelection = (v) => {
    if (v === 'all') return 'all';
    if (Array.isArray(v)) return v.filter((s) => typeof s === 'string' && s.trim()).map(String);
    return 'all';
  };
  return {
    savedActive: raw.savedActive === true,
    followingActive: raw.followingActive === true,
    selectedSavedListIds: parseSelection(raw.selectedSavedListIds),
    selectedFollowingListIds: parseSelection(raw.selectedFollowingListIds),
  };
}

/**
 * @param {unknown} raw
 * @returns {{
 *   selectedTagSlugs: string[],
 *   minRating: number,
 *   sortMode: 'relevance' | 'distance' | 'recent',
 * }}
 */
export function parseMapFilterPrefs(raw) {
  const defaults = {
    selectedTagSlugs: [],
    minRating: 0,
    sortMode: /** @type {'relevance' | 'distance' | 'recent'} */ ('distance'),
  };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return defaults;
  }
  const sortMode =
    raw.sortMode === 'distance' || raw.sortMode === 'relevance' || raw.sortMode === 'recent'
      ? raw.sortMode
      : defaults.sortMode;
  let minRating =
    typeof raw.minRating === 'number' && Number.isFinite(raw.minRating)
      ? raw.minRating
      : defaults.minRating;
  minRating = Math.max(0, Math.min(5, Math.round(minRating * 2) / 2));
  let { selectedTagSlugs } = defaults;
  if (Array.isArray(raw.selectedTagSlugs)) {
    selectedTagSlugs = raw.selectedTagSlugs
      .filter((s) => typeof s === 'string' && s.trim())
      .map((s) => s.trim());
  }
  return { selectedTagSlugs, minRating, sortMode };
}

/**
 * Minimal restaurant row for map pin + spot sheet after refresh.
 * @param {Record<string, unknown> | null | undefined} row
 * @returns {Record<string, unknown> | null}
 */
export function compactMapSelectedSpotRow(row) {
  if (!row || typeof row !== 'object' || row.id == null) return null;
  const lat = row.latitude != null ? Number(row.latitude) : NaN;
  const lng = row.longitude != null ? Number(row.longitude) : NaN;
  const out = {
    id: String(row.id),
    name: String(row.name ?? ''),
  };
  if (Number.isFinite(lat)) out.latitude = lat;
  if (Number.isFinite(lng)) out.longitude = lng;
  if (row.address != null && String(row.address).trim()) out.address = String(row.address).trim();
  if (row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)) {
    out.metadata = row.metadata;
  }
  if (row.home_city != null) out.home_city = row.home_city;
  if (row.phone != null && String(row.phone).trim()) out.phone = String(row.phone).trim();
  if (typeof row.rating === 'number' && Number.isFinite(row.rating)) out.rating = row.rating;
  if (Array.isArray(row.restaurant_images)) out.restaurant_images = row.restaurant_images;
  if (row.is_sponsored === true) out.is_sponsored = true;
  return out;
}

/**
 * @param {unknown} raw
 * @returns {{ id: string, row: Record<string, unknown> | null } | null}
 */
export function parseMapSelectedSpot(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  if (!id || !RESTAURANT_ID_UUID_RE.test(id)) return null;
  const row = compactMapSelectedSpotRow(
    raw.row && typeof raw.row === 'object' && !Array.isArray(raw.row) ? { ...raw.row, id } : null
  );
  return { id, row };
}
