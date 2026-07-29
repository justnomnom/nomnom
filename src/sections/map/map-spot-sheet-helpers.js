import {
  getRestaurantTagDisplayLabel,
  splitRestaurantTagsForDetailDisplay,
} from '../../utils/restaurant-tag-groups';

/**
 * Avatar URL + display name for the signed-in viewer (map sheet list “You” ring).
 * @param {import('@supabase/supabase-js').User | null | undefined} user
 * @returns {{ avatarUrl: string | null, displayName: string | null }}
 */
export function mapSheetViewerIdentityFromUser(user) {
  if (!user || typeof user !== 'object') {
    return { avatarUrl: null, displayName: null };
  }
  const m = user.user_metadata && typeof user.user_metadata === 'object' ? user.user_metadata : {};
  const pick = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  let avatarUrl = pick(m.avatar_url) || pick(m.picture) || null;
  if (!avatarUrl) {
    const identities = Array.isArray(user.identities) ? user.identities : [];
    const fromIdentity = identities
      .map((idn) => {
        const d =
          idn?.identity_data && typeof idn.identity_data === 'object' ? idn.identity_data : {};
        return pick(d.avatar_url) || pick(d.picture) || pick(d.image_url) || null;
      })
      .find((u) => u != null);
    avatarUrl = fromIdentity || null;
  }
  const displayName =
    pick(m.display_name) || pick(m.full_name) || pick(m.name) || pick(user.email) || null;
  return { avatarUrl, displayName };
}

// ----------------------------------------------------------------------

function buildMapsUrl({ name, address, latitude, longitude, maps_link: mapsLink }) {
  if (typeof mapsLink === 'string' && mapsLink.trim()) return mapsLink.trim();
  const nameQ = name && String(name).trim();
  const addressQ = address && String(address).trim();
  const q = [nameQ, addressQ].filter(Boolean).join(' ');
  if (q) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  const lat = latitude != null ? Number(latitude) : NaN;
  const lng = longitude != null ? Number(longitude) : NaN;
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
  }
  return null;
}

/** @param {unknown} phone */
function buildTelHref(phone) {
  if (phone == null) return null;
  const raw = String(phone).trim();
  if (!raw) return null;
  const beforeExt = raw.split(/\s*(?:ext\.?|x)\s*/i)[0]?.trim() ?? raw;
  const hasPlus = beforeExt.trimStart().startsWith('+');
  const digits = beforeExt.replace(/\D/g, '');
  if (digits.length < 7) return null;
  const href = hasPlus ? `tel:+${digits}` : `tel:${digits}`;
  return { href, display: raw };
}

/** Single-line address for maps search fallback (matches `buildSheetRestaurantFromMapPlace`). */
/**
 * Map sheet list row shape from a nested `restaurants` object on a list item.
 * Does not require coordinates (unlike list map pins).
 * @param {object | null | undefined} r
 */
export function mapPlaceFromListRestaurant(r) {
  if (!r || typeof r !== 'object' || !r.id) return null;
  const meta = r.metadata && typeof r.metadata === 'object' ? r.metadata : {};
  let fromMeta = '';
  if (typeof meta.address === 'string' && meta.address.trim()) {
    fromMeta = meta.address.trim();
  } else if (typeof meta.formatted_address === 'string') {
    fromMeta = meta.formatted_address.trim();
  }
  const fromRow = r.address != null && String(r.address).trim() ? String(r.address).trim() : '';
  const address = fromRow || fromMeta || null;
  const lat = r.latitude != null ? Number(r.latitude) : NaN;
  const lng = r.longitude != null ? Number(r.longitude) : NaN;
  return {
    id: String(r.id),
    name: String(r.name ?? ''),
    ...(Number.isFinite(lat) ? { latitude: lat } : {}),
    ...(Number.isFinite(lng) ? { longitude: lng } : {}),
    metadata: meta,
    address,
    home_city: r.home_city ?? undefined,
    ...(r.phone != null && String(r.phone).trim() ? { phone: String(r.phone).trim() } : {}),
    ...(typeof r.rating === 'number' && Number.isFinite(r.rating) ? { rating: r.rating } : {}),
    ...(Array.isArray(r.restaurant_images) ? { restaurant_images: r.restaurant_images } : {}),
    ...(r.is_sponsored === true ? { is_sponsored: true } : {}),
    ...(r.added_at != null ? { added_at: r.added_at } : {}),
  };
}

/**
 * Normalize bbox / RPC rows for the map Nom Nom List sheet (parity with Discover).
 * @param {Array<Record<string, unknown>> | null | undefined} places
 * @returns {Array<Record<string, unknown>>}
 */
export function normalizeMapSheetPlaces(places) {
  if (!Array.isArray(places) || places.length === 0) return [];
  return places.map((r) => mapPlaceFromListRestaurant(r) ?? r).filter((r) => r && r.id);
}

/**
 * Surface sponsored rows at the top of the Nom Nom List (Discover parity).
 * @param {Array<Record<string, unknown>> | null | undefined} places
 * @returns {Array<Record<string, unknown>>}
 */
export function sortMapSheetPlacesWithSponsoredFirst(places) {
  if (!Array.isArray(places) || places.length < 2) return places ?? [];
  return [...places].sort((a, b) => {
    const aSponsored = a?.is_sponsored === true ? 1 : 0;
    const bSponsored = b?.is_sponsored === true ? 1 : 0;
    return bSponsored - aSponsored;
  });
}

/** Normalize + sponsored-first sort for map sheet list rows. */
export function prepareMapSheetPlaces(places) {
  return sortMapSheetPlacesWithSponsoredFirst(normalizeMapSheetPlaces(places));
}

/** Parse a row's `added_at` (saved/added-to-list time) to epoch ms, or -Infinity when absent. */
function mapPlaceAddedAtMs(row) {
  const raw = row?.added_at;
  if (raw == null) return -Infinity;
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : -Infinity;
}

/**
 * "Last added" ordering for the Nom Nom List: newest `added_at` first, sponsored rows kept on
 * top (Discover parity). Rows without an `added_at` (e.g. bbox browse results, which carry no
 * per-restaurant added time) hold their existing relative order below the timestamped ones.
 * Stable sort.
 * @param {Array<Record<string, unknown>> | null | undefined} places
 * @returns {Array<Record<string, unknown>>}
 */
export function sortMapSheetPlacesByRecency(places) {
  if (!Array.isArray(places) || places.length < 2) return places ?? [];
  return places
    .map((p, i) => ({ p, i }))
    .sort((a, b) => {
      const aSponsored = a.p?.is_sponsored === true ? 1 : 0;
      const bSponsored = b.p?.is_sponsored === true ? 1 : 0;
      if (aSponsored !== bSponsored) return bSponsored - aSponsored;
      const at = mapPlaceAddedAtMs(a.p);
      const bt = mapPlaceAddedAtMs(b.p);
      if (at !== bt) return bt - at;
      return a.i - b.i;
    })
    .map((x) => x.p);
}

export function mapPlaceAddressLine(row) {
  if (!row || typeof row !== 'object') return null;
  const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  let fromMeta = '';
  if (typeof meta.address === 'string' && meta.address.trim()) {
    fromMeta = meta.address.trim();
  } else if (typeof meta.formatted_address === 'string') {
    fromMeta = meta.formatted_address.trim();
  }
  const fromRow =
    row.address != null && String(row.address).trim() ? String(row.address).trim() : '';
  return fromRow || fromMeta || null;
}

/** @param {object} row — map pin / sheet list row */
export function mapPlaceMapsUrl(row) {
  const meta = row?.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  const mapsLink =
    (typeof row?.maps_link === 'string' && row.maps_link.trim()) ||
    (typeof meta.maps_link === 'string' && meta.maps_link.trim()) ||
    (typeof meta.url === 'string' && meta.url.trim()) ||
    null;
  return buildMapsUrl({
    name: row?.name,
    address: mapPlaceAddressLine(row),
    latitude: row?.latitude,
    longitude: row?.longitude,
    maps_link: mapsLink,
  });
}

/** @param {object} row */
export function mapPlaceTelHref(row) {
  if (!row || typeof row !== 'object') return null;
  const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  let phone = null;
  if (row.phone != null && String(row.phone).trim()) {
    phone = String(row.phone).trim();
  } else if (typeof meta.phone === 'string' && meta.phone.trim()) {
    phone = meta.phone.trim();
  } else if (
    typeof meta.formatted_phone_number === 'string' &&
    meta.formatted_phone_number.trim()
  ) {
    phone = meta.formatted_phone_number.trim();
  }
  return buildTelHref(phone);
}

/**
 * Ordered gallery URLs for map rows — mirrors `RestaurantDetailView` (`restaurant_images` then metadata).
 * @param {object | null | undefined} row
 * @returns {string[]}
 */
export function mapGalleryUrlsFromRow(row) {
  if (!row || typeof row !== 'object') return [];
  const ri = row.restaurant_images;
  if (Array.isArray(ri) && ri.length > 0) {
    const allowed = ri.filter((x) => x && x.moderation_status !== 'rejected');
    const urls = [...allowed]
      .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0))
      .map((r) => r.url)
      .filter((u) => typeof u === 'string' && u.trim());
    if (urls.length > 0) return urls;
  }
  const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  /** @type {string[]} */
  const out = [];
  const add = (u) => {
    if (typeof u === 'string' && u.trim()) {
      const s = u.trim();
      if (!out.includes(s)) out.push(s);
    }
  };
  if (Array.isArray(meta.photos) && meta.photos.length > 0) {
    meta.photos.forEach((p) => add(typeof p === 'string' ? p : ''));
  }
  add(typeof meta.hero_url === 'string' ? meta.hero_url : '');
  add(typeof meta.image_url === 'string' ? meta.image_url : '');
  return out;
}

/** @param {object | null | undefined} row */
export function mapThumbFromRow(row) {
  const urls = mapGalleryUrlsFromRow(row);
  if (urls.length > 0) return urls[0];
  return null;
}

/**
 * @param {object} row
 * @param {function} t — i18n `t`
 * @param {Array<{ slug: string, label?: string }>} tagCatalog
 * @param {{ tagCatalogLoaded?: boolean }} [opts] — when `tagCatalogLoaded` is false, returns `[]` so list rows don't flash slug-prettified fallback labels (e.g. "Award Michelin 3 Stars") before the catalog resolves.
 * @returns {string[]}
 */
function orderedTagLabelsForMapRow(row, t, tagCatalog, opts) {
  const tagCatalogLoaded = opts?.tagCatalogLoaded !== false;
  if (!tagCatalogLoaded) return [];
  const meta = row?.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  const slugList = Array.isArray(meta.tag_slugs)
    ? meta.tag_slugs
        .filter((s) => s != null && typeof s !== 'object')
        .map((s) => String(s).trim())
        .filter(Boolean)
    : [];
  if (slugList.length === 0) return [];
  const bySlug = new Map((Array.isArray(tagCatalog) ? tagCatalog : []).map((r) => [r.slug, r]));
  const rawTags = slugList.map((slug) => {
    const hit = bySlug.get(slug);
    if (hit) return hit;
    const slugStr = String(slug);
    const pretty = slugStr
      .split('-')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
    return {
      id: `slug:${slugStr}`,
      slug: slugStr,
      label: pretty,
      category: 'other',
      sort_order: 0,
    };
  });
  const { detailTagsPrimary, detailDishTags } = splitRestaurantTagsForDetailDisplay(rawTags);
  return [...detailTagsPrimary, ...detailDishTags]
    .map((tag) => getRestaurantTagDisplayLabel(tag, t))
    .filter((s) => typeof s === 'string' && s.trim());
}

/** @param {object} row */
export function mapPlaceNumericRating(row) {
  const meta = row?.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  const { rating: rowRating } = row;
  const { rating: metaRating } = meta;
  if (typeof rowRating === 'number' && Number.isFinite(rowRating)) {
    return rowRating;
  }
  if (typeof metaRating === 'number' && Number.isFinite(metaRating)) {
    return metaRating;
  }
  return null;
}

const MAP_SHEET_MAX_CHIPS = 8;

/**
 * Tag labels for map sheet list rows — one continuous wrap row uses full width between avatar and actions.
 * @param {object} row
 * @param {function} t
 * @param {Array<{ slug: string, label?: string }>} tagCatalog
 * @param {{ tagCatalogLoaded?: boolean }} [opts] — pass `tagCatalogLoaded: false` while the catalog is still resolving to suppress slug-prettified fallback chips.
 * @returns {string[]}
 */
export function mapPlaceTagLabelsCapped(row, t, tagCatalog, opts) {
  const labels = orderedTagLabelsForMapRow(row, t, tagCatalog, opts);
  return labels.slice(0, MAP_SHEET_MAX_CHIPS);
}

/**
 * Number of tag slugs on a row (capped to {@link MAP_SHEET_MAX_CHIPS}) — used to render the right
 * count of skeleton chips while the tag catalog is still loading.
 *
 * @param {object} row
 * @returns {number}
 */
export function mapPlaceTagSkeletonCount(row) {
  const meta = row?.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  if (!Array.isArray(meta.tag_slugs)) return 0;
  const n = meta.tag_slugs.filter((s) => typeof s === 'string' && s.trim()).length;
  return Math.min(n, MAP_SHEET_MAX_CHIPS);
}

/**
 * @param {object} row
 * @param {function} t — i18n `t`
 * @param {Array<{ slug: string, label?: string }>} tagCatalog
 */
export function mapSpotListSubtitle(row, t, tagCatalog) {
  const labels = orderedTagLabelsForMapRow(row, t, tagCatalog);
  let label = t('pages.dashboard.restaurant.category_fallback');
  if (labels.length > 0) {
    const joined = labels.join(' · ');
    if (joined) label = joined;
  }
  const rating = mapPlaceNumericRating(row);
  if (rating != null) {
    return `${label} · ★ ${rating.toFixed(1)}`;
  }
  return label;
}
