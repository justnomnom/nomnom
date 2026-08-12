'use server';

import { unstable_rethrow } from 'next/navigation';

import { RESTAURANT_TAG_CATEGORY_ORDER } from 'src/utils/restaurant-tag-groups';

import { fetchDishTagsCatalog } from 'src/libs/dish-tags/dish-tag-resolve';
import { attachOpeningStatusToRows } from 'src/libs/restaurant/opening-hours';
import { slimRestaurantRowsMetadata } from 'src/libs/restaurant/slim-restaurant-card-metadata';
import { RESTAURANT_ID_UUID_RE } from 'src/libs/restaurant/fetch-restaurant-by-id-for-ssr';
import {
  fetchAllSupabasePages,
  SUPABASE_DEFAULT_PAGE_SIZE,
} from 'src/libs/supabase/supabase-fetch-all-pages';
import {
  getSupabaseAuthUser,
  createSupabaseServerClient,
} from 'src/libs/supabase/supabase-server-client';

import { LISBOA_ROULETTE_BBOX, ROULETTE_POOL_FETCH_LIMIT } from 'src/sections/roulette/constants';

/**
 * @param {number} lng
 * @param {number} lat
 * @returns {{ ok: false, error: string } | { ok: true }}
 */
function validateWgs84Coordinates(lng, lat) {
  if (
    typeof lng !== 'number' ||
    typeof lat !== 'number' ||
    !Number.isFinite(lng) ||
    !Number.isFinite(lat)
  ) {
    return { ok: false, error: 'invalid_coordinates' };
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { ok: false, error: 'invalid_coordinates' };
  }
  return { ok: true };
}

/**
 * Active locality for a WGS84 point via `locality_for_point`.
 *
 * @param {number} lng
 * @param {number} lat
 * @returns {Promise<{ location: { id: string, locality_slug: string, locality_name: string, country_name: string } | null, error?: string }>}
 */
export async function resolveLocalityFromCoordinates(lng, lat) {
  const v = validateWgs84Coordinates(Number(lng), Number(lat));
  if (!v.ok) {
    return { location: null, error: v.error };
  }
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await getSupabaseAuthUser();
    if (authError || !user) {
      return { location: null, error: 'Unauthorized' };
    }
    const { data, error } = await supabase.rpc('locality_for_point', {
      p_lng: Number(lng),
      p_lat: Number(lat),
    });
    if (error) {
      console.error('[resolveLocalityFromCoordinates]', error);
      return { location: null, error: error.message };
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.id) {
      return { location: null };
    }
    return {
      location: {
        id: String(row.id),
        locality_slug: String(row.locality_slug ?? ''),
        locality_name: String(row.locality_name ?? ''),
        country_name: row.country_name != null ? String(row.country_name) : '',
      },
    };
  } catch (e) {
    console.error('[resolveLocalityFromCoordinates]', e);
    return { location: null, error: e?.message };
  }
}

/**
 * Active onboarding localities from `list_location_localities` (excludes municipality rows).
 *
 * @returns {Promise<{ locations: Array<Record<string, unknown>>, error?: string }>}
 */
export async function fetchLocationLocalities() {
  try {
    const supabase = await createSupabaseServerClient();
    // Page through the RPC: the full locality catalog (CAOP2025) exceeds PostgREST's
    // 1000-row window, and the RPC orders by country/state/name — a single call would
    // truncate mid-alphabet (e.g. drop every Lisbon/Porto locality, including Arroios).
    //
    // The picker only needs id / name / slug / centroid, so call the lean path
    // (p_include_boundary => false): the RPC skips ST_AsGeoJSON entirely instead of
    // shipping a large per-row GeoJSON blob from DB → server just to be discarded.
    const rows = await fetchAllSupabasePages(async (from, pageSize) => {
      const { data, error } = await supabase
        .rpc('list_location_localities', { p_include_boundary: false })
        .range(from, from + pageSize - 1);

      if (error) {
        throw error;
      }

      return data ?? [];
    }, SUPABASE_DEFAULT_PAGE_SIZE);

    return { locations: rows };
  } catch (e) {
    console.error('[fetchLocationLocalities]', e);
    return { locations: [], error: e?.message };
  }
}

/**
 * Returns the signed-in user's home locality id (`users.home_locality_id` → active locality `cities.id`).
 *
 * @returns {Promise<{ localityId: string | null, error?: string | null }>}
 */
export async function fetchUserHomeLocalityId() {
  try {
    const {
      data: { user },
      error: authError,
    } = await getSupabaseAuthUser();
    if (authError || !user) {
      return { localityId: null, error: authError?.message ?? 'unauthorized' };
    }
    const supabase = await createSupabaseServerClient();
    const { data: profile, error } = await supabase
      .from('users')
      .select('home_locality_id')
      .eq('id', user.id)
      .maybeSingle();
    if (error) {
      console.error('[fetchUserHomeLocalityId]', error);
      return { localityId: null, error: error.message };
    }
    return { localityId: profile?.home_locality_id ?? null, error: null };
  } catch (e) {
    console.error('[fetchUserHomeLocalityId]', e);
    return { localityId: null, error: e?.message ?? 'unknown' };
  }
}

/**
 * Restaurants inside a WGS84 bounding box via `restaurants_in_bbox`.
 *
 * @param {number} west
 * @param {number} south
 * @param {number} east
 * @param {number} north
 * @param {string | null} [homeLocalityId] Viewer home locality id (`cities.id`); sponsor inject only
 * @param {number} [limit]
 * @param {object} [options]
 * @param {string[] | null} [options.tagSlugs] Canonical tag slugs; omit or empty = no tag filter
 * @param {boolean} [options.matchAll] false = any slug (OR); true = require every slug (AND)
 * @param {string | null} [options.search] Substring match on name, address, metadata (server-side)
 * @param {number | null} [options.minRating] When set, require restaurant rating (&gt;= column or metadata) &gt;= this value
 * @param {'name' | 'rating_desc' | 'relevance' | 'distance'} [options.sort]
 * @param {number | null} [options.refLat] Reference latitude for distance sort
 * @param {number | null} [options.refLng] Reference longitude for distance sort
 * @param {boolean} [options.openNow] Keep only restaurants open at request time. Evaluated in
 *   SQL because `hours_parsed` is stripped from every row before it reaches the client; see
 *   `restaurant_is_open_at`. Restaurants whose hours could not be parsed are *kept*, since
 *   hiding a place because ingest failed is worse than showing one that might be shut.
 * @returns {Promise<{ restaurants: Array<Record<string, unknown>>, error?: string }>}
 */
export async function fetchRestaurantsInBbox(
  west,
  south,
  east,
  north,
  homeLocalityId = null,
  limit = 200,
  options = {}
) {
  const {
    tagSlugs = null,
    matchAll = false,
    search = null,
    minRating = null,
    sort = 'name',
    refLat = null,
    refLng = null,
    openNow = false,
  } = options;
  const pTagSlugs = Array.isArray(tagSlugs) && tagSlugs.length > 0 ? tagSlugs : null;
  const pSearch = typeof search === 'string' && search.trim() ? search.trim() : null;
  const pMinRating =
    typeof minRating === 'number' && Number.isFinite(minRating) && minRating > 0 ? minRating : null;
  const allowedSort = new Set(['name', 'rating_desc', 'relevance', 'distance']);
  const pSort = allowedSort.has(sort) ? sort : 'name';
  const pRefLat =
    pSort === 'distance' && typeof refLat === 'number' && Number.isFinite(refLat) ? refLat : null;
  const pRefLng =
    pSort === 'distance' && typeof refLng === 'number' && Number.isFinite(refLng) ? refLng : null;

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc('restaurants_in_bbox', {
      west,
      south,
      east,
      north,
      p_home_locality_id: homeLocalityId,
      p_limit: limit,
      p_tag_slugs: pTagSlugs,
      p_match_all: Boolean(matchAll),
      p_search: pSearch,
      p_min_rating: pMinRating,
      p_sort: pSort,
      p_ref_lat: pRefLat,
      p_ref_lng: pRefLng,
      p_open_now: openNow ? true : null,
    });

    if (error) {
      console.error('[fetchRestaurantsInBbox]', error);
      return { restaurants: [], error: error.message };
    }

    // SQL returns card-slim metadata + opening_status; normalize to openingStatus.
    return { restaurants: slimRestaurantRowsMetadata(attachOpeningStatusToRows(data)) };
  } catch (e) {
    console.error('[fetchRestaurantsInBbox]', e);
    return { restaurants: [], error: e?.message };
  }
}

/**
 * Lean map-pin rows in a WGS84 bbox via `restaurants_in_bbox_pins`.
 *
 * Returns only the fields the map needs to draw pins + clusters (`id, name, latitude, longitude,
 * rating, is_sponsored`) — no `metadata`/`address`/`phone` blob — so the client can load *every*
 * pin in view and feed Mapbox clustering true counts instead of a capped 80-row slice. Full detail
 * for a tapped pin is hydrated separately via {@link fetchMapSpotDetailById}.
 *
 * Same signature/filters as {@link fetchRestaurantsInBbox}; defaults `limit` high (caller passes
 * `MAP_VIEW_PINS_LIMIT`) since the payload is tiny.
 *
 * @param {number} west
 * @param {number} south
 * @param {number} east
 * @param {number} north
 * @param {string | null} [homeLocalityId]
 * @param {number} [limit]
 * @param {object} [options]
 * @returns {Promise<{ restaurants: Array<Record<string, unknown>>, error?: string }>}
 */
export async function fetchRestaurantPinsInBbox(
  west,
  south,
  east,
  north,
  homeLocalityId = null,
  limit = 2000,
  options = {}
) {
  const {
    tagSlugs = null,
    matchAll = false,
    search = null,
    minRating = null,
    sort = 'name',
    refLat = null,
    refLng = null,
    openNow = false,
  } = options;
  const pTagSlugs = Array.isArray(tagSlugs) && tagSlugs.length > 0 ? tagSlugs : null;
  const pSearch = typeof search === 'string' && search.trim() ? search.trim() : null;
  const pMinRating =
    typeof minRating === 'number' && Number.isFinite(minRating) && minRating > 0 ? minRating : null;
  const allowedSort = new Set(['name', 'rating_desc', 'relevance', 'distance']);
  const pSort = allowedSort.has(sort) ? sort : 'name';
  const pRefLat =
    pSort === 'distance' && typeof refLat === 'number' && Number.isFinite(refLat) ? refLat : null;
  const pRefLng =
    pSort === 'distance' && typeof refLng === 'number' && Number.isFinite(refLng) ? refLng : null;

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc('restaurants_in_bbox_pins', {
      west,
      south,
      east,
      north,
      p_home_locality_id: homeLocalityId,
      p_limit: limit,
      p_tag_slugs: pTagSlugs,
      p_match_all: Boolean(matchAll),
      p_search: pSearch,
      p_min_rating: pMinRating,
      p_sort: pSort,
      p_ref_lat: pRefLat,
      p_ref_lng: pRefLng,
      // Pins carry no hours and never render an open/closed badge, but they must obey the
      // filter or the map would show a pin with no matching card behind it.
      p_open_now: openNow ? true : null,
    });

    if (error) {
      console.error('[fetchRestaurantPinsInBbox]', error);
      return { restaurants: [], error: error.message };
    }

    return { restaurants: slimRestaurantRowsMetadata(data) };
  } catch (e) {
    console.error('[fetchRestaurantPinsInBbox]', e);
    return { restaurants: [], error: e?.message };
  }
}

/**
 * Lightweight typeahead for the map search input — restaurant suggestions by name / address
 * inside a bbox (defaults to Portugal mainland + islands). Returns a tiny payload so it can be
 * called on every keystroke without dragging in the heavier `restaurants_in_bbox` filters.
 *
 * @param {string} query
 * @param {object} [options]
 * @param {number} [options.limit] capped at 50 server-side, defaults to 12
 * @param {{ west: number, south: number, east: number, north: number } | null} [options.bbox]
 *   Defaults to Portugal mainland + islands.
 * @returns {Promise<{ restaurants: Array<Record<string, unknown>>, error?: string }>}
 */
export async function searchRestaurantsByName(query, options = {}) {
  const q = typeof query === 'string' ? query.trim() : '';
  if (!q) return { restaurants: [] };
  const { limit = 12, bbox = null } = options;
  const pLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 50) : 12;
  // Portugal mainland + islands — keeps the result set tight and noticeably faster than a
  // worldwide scan. Override via `bbox` if a future caller needs a different scope.
  const pWest = Number.isFinite(bbox?.west) ? bbox.west : -31.3;
  const pSouth = Number.isFinite(bbox?.south) ? bbox.south : 32.6;
  const pEast = Number.isFinite(bbox?.east) ? bbox.east : -6.2;
  const pNorth = Number.isFinite(bbox?.north) ? bbox.north : 42.2;

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc('search_restaurants_by_name', {
      p_query: q,
      p_limit: pLimit,
      p_west: pWest,
      p_south: pSouth,
      p_east: pEast,
      p_north: pNorth,
    });

    if (error) {
      console.error('[searchRestaurantsByName]', error);
      return { restaurants: [], error: error.message };
    }

    return { restaurants: slimRestaurantRowsMetadata(data) };
  } catch (e) {
    console.error('[searchRestaurantsByName]', e);
    return { restaurants: [], error: e?.message };
  }
}

/**
 * Roulette pool: restaurant IDs on lists owned by the viewer or by users they follow
 * (the viewer's NomNom Circle). When the circle is empty, the RPC falls back to any
 * existing restaurant and flags the response with `isFallback: true` so the roulette
 * always has a real pool.
 *
 * @returns {Promise<{ restaurantIds: string[], isFallback: boolean, error?: string }>}
 */
/**
 * Restaurant IDs for the public Lisbon roulette (anon-safe).
 *
 * Uses the lean `restaurants_in_bbox_pins` RPC so we can pull *every* restaurant in the Lisbon bbox
 * (id-only payload, cap {@link ROULETTE_POOL_FETCH_LIMIT}) rather than the heavy `restaurants_in_bbox`
 * rows we'd otherwise have to cap low. A spin then picks uniformly across the full pool instead of a
 * name-ordered prefix (the RPC's default `name` sort is irrelevant once we keep all the ids).
 *
 * We pass `homeLocalityId = null` so the RPC's sponsor-injection path stays off, and additionally
 * clamp every candidate to the bbox using the lat/lng the RPC already returns. That second guard
 * matters because the RPC's `sponsor_inject` CTE selects from the *un-bbox-filtered* `eligible` set —
 * a future caller passing a locality could otherwise smuggle out-of-area sponsors (with a guaranteed
 * slot) into the pool and bias the spin. The coordinate clamp keeps the pool provably in-bbox.
 *
 * @returns {Promise<{ restaurantIds: string[], error?: string }>}
 */
export async function fetchPublicLisboaRouletteRestaurantIds() {
  const { west, south, east, north } = LISBOA_ROULETTE_BBOX;
  const { restaurants, error } = await fetchRestaurantPinsInBbox(
    west,
    south,
    east,
    north,
    null,
    ROULETTE_POOL_FETCH_LIMIT
  );
  if (error) {
    return { restaurantIds: [], error };
  }
  const ids = [];
  (restaurants ?? []).forEach((r) => {
    const rid = typeof r?.id === 'string' ? r.id : null;
    if (!rid || !RESTAURANT_ID_UUID_RE.test(rid)) return;
    const lat = typeof r?.latitude === 'number' ? r.latitude : Number(r?.latitude);
    const lng = typeof r?.longitude === 'number' ? r.longitude : Number(r?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if (lat < south || lat > north || lng < west || lng > east) return;
    ids.push(rid);
  });
  return { restaurantIds: ids };
}

export async function fetchCircleRestaurantIds() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc('circle_restaurants_for_viewer');
    if (error) {
      console.error('[fetchCircleRestaurantIds]', error);
      return { restaurantIds: [], isFallback: false, error: error.message };
    }
    const rows = Array.isArray(data) ? data : [];
    const ids = [];
    let isFallback = false;
    rows.forEach((r) => {
      const rid = typeof r?.id === 'string' ? r.id : null;
      if (rid && RESTAURANT_ID_UUID_RE.test(rid)) {
        ids.push(rid);
        if (r.is_fallback === true) isFallback = true;
      }
    });
    return { restaurantIds: ids, isFallback };
  } catch (e) {
    console.error('[fetchCircleRestaurantIds]', e);
    return { restaurantIds: [], isFallback: false, error: e?.message };
  }
}

/**
 * Hydrate the full detail row for one restaurant by id (`metadata, address, phone, coords, rating`
 * + nested `restaurant_images`). The map fetches lean pins via {@link fetchRestaurantPinsInBbox}
 * (no metadata/images), so when the user taps a pin that isn't in the bounded detailed sheet set
 * we load the heavy fields on demand and merge them onto the lean row to drive the detail card.
 *
 * @param {string} restaurantId
 * @returns {Promise<{ row: Record<string, unknown> | null, error?: string }>}
 */
export async function fetchMapSpotDetailById(restaurantId) {
  const id = typeof restaurantId === 'string' ? restaurantId.trim() : '';
  if (!id || !RESTAURANT_ID_UUID_RE.test(id)) {
    return { row: null, error: 'invalid_id' };
  }
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('restaurants')
      .select(
        `
        id,
        name,
        address,
        phone,
        latitude,
        longitude,
        rating,
        metadata,
        restaurant_images (
          id,
          url,
          sort_order,
          moderation_status
        )
      `
      )
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[fetchMapSpotDetailById]', error);
      return { row: null, error: error.message };
    }
    return { row: data ?? null, error: undefined };
  } catch (e) {
    console.error('[fetchMapSpotDetailById]', e);
    return { row: null, error: e?.message ?? 'unknown' };
  }
}

/**
 * Restaurants for a home market with optional tag filters (`restaurants_for_municipality`).
 * `p_home_locality_id` is the viewer's home locality id; RPC resolves municipality for organic rows and sponsor match.
 *
 * @param {string} localityId Home locality `cities.id`
 * @param {object} [opts]
 * @param {number} [opts.limit]
 * @param {string[] | null} [opts.tagSlugs]
 * @param {boolean} [opts.matchAll]
 * @param {string | null} [opts.search]
 * @param {number | null} [opts.minRating]
 * @param {string | null} [opts.vibeKey] Discover vibe chip key
 * @param {string | null} [opts.categoryKey] Discover category chip key
 * @param {number | null} [opts.refLat] Reference latitude for proximity sort
 * @param {number | null} [opts.refLng] Reference longitude for proximity sort
 * @returns {Promise<{ restaurants: Array<Record<string, unknown>>, error?: string }>}
 */
export async function fetchRestaurantsForHomeLocality(localityId, opts = {}) {
  const {
    limit = 36,
    tagSlugs = null,
    matchAll = false,
    search = null,
    minRating = null,
    vibeKey = null,
    categoryKey = null,
    refLat = null,
    refLng = null,
    openNow = false,
  } = opts;
  const pTagSlugs = Array.isArray(tagSlugs) && tagSlugs.length > 0 ? tagSlugs : null;
  const pSearch = typeof search === 'string' && search.trim() ? search.trim() : null;
  const pMinRating = typeof minRating === 'number' && Number.isFinite(minRating) ? minRating : null;
  const pVibeKey = typeof vibeKey === 'string' && vibeKey.trim() ? vibeKey.trim() : null;
  const pCategoryKey =
    typeof categoryKey === 'string' && categoryKey.trim() ? categoryKey.trim() : null;
  const pRefLat = typeof refLat === 'number' && Number.isFinite(refLat) ? refLat : null;
  const pRefLng = typeof refLng === 'number' && Number.isFinite(refLng) ? refLng : null;

  if (!localityId) {
    return { restaurants: [], error: 'missing_home_locality' };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc('restaurants_for_municipality', {
      p_home_locality_id: localityId,
      p_limit: limit,
      p_tag_slugs: pTagSlugs,
      p_match_all: Boolean(matchAll),
      p_search: pSearch,
      p_min_rating: pMinRating,
      p_vibe_key: pVibeKey,
      p_category_key: pCategoryKey,
      p_ref_lat: pRefLat,
      p_ref_lng: pRefLng,
      p_open_now: openNow ? true : null,
    });

    if (error) {
      const msg = error?.message ?? String(error);
      const code = error?.code;
      const details = error?.details;
      console.error('[fetchRestaurantsForHomeLocality]', msg, code ? { code, details } : '');
      return { restaurants: [], error: msg };
    }

    const rows = slimRestaurantRowsMetadata(attachOpeningStatusToRows(data));
    const ids = rows.map((r) => r?.id).filter((x) => typeof x === 'string' && x.length > 0);
    if (ids.length === 0) {
      return { restaurants: rows };
    }

    const { data: imageRows, error: imagesError } = await supabase
      .from('restaurant_images')
      .select('restaurant_id, id, url, sort_order, moderation_status')
      .in('restaurant_id', ids);

    if (imagesError) {
      console.error('[fetchRestaurantsForHomeLocality:images]', imagesError);
      return { restaurants: rows };
    }

    const byRestaurant = new Map();
    (imageRows ?? []).forEach((img) => {
      const rid = img?.restaurant_id;
      if (!rid) return;
      if (!byRestaurant.has(rid)) byRestaurant.set(rid, []);
      byRestaurant.get(rid).push(img);
    });

    const enriched = rows.map((row) => ({
      ...row,
      restaurant_images: byRestaurant.get(row?.id) ?? [],
    }));

    return { restaurants: enriched };
  } catch (e) {
    console.error('[fetchRestaurantsForHomeLocality]', e);
    return { restaurants: [], error: e?.message };
  }
}

/**
 * Load all tags for one `tags.category` value (paginated).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} category
 */
async function fetchTagsCatalogForCategory(supabase, category) {
  return fetchAllSupabasePages(async (from, pageSize) => {
    const { data, error } = await supabase
      .from('tags')
      .select('id, slug, label, category, sort_order')
      .eq('category', category)
      .order('sort_order', { ascending: true })
      .order('slug', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      throw error;
    }

    return data ?? [];
  }, SUPABASE_DEFAULT_PAGE_SIZE);
}

/**
 * Tags whose `category` is not in {@link RESTAURANT_TAG_CATEGORY_ORDER}.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
async function fetchTagsCatalogExtras(supabase) {
  return fetchAllSupabasePages(async (from, pageSize) => {
    const { data, error } = await supabase
      .from('tags')
      .select('id, slug, label, category, sort_order')
      .not('category', 'in', `(${RESTAURANT_TAG_CATEGORY_ORDER.join(',')})`)
      .order('category', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('slug', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      throw error;
    }

    return data ?? [];
  }, SUPABASE_DEFAULT_PAGE_SIZE);
}

/**
 * Public tag catalog for filter UI (`tags` table).
 * Fetches each category independently so a large cuisine/accessibility catalog
 * cannot push `dish` rows past PostgREST's page window.
 *
 * @returns {Promise<{ tags: Array<{ id: string, slug: string, label: string, category: string, sort_order: number }>, error?: string }>}
 */
export async function fetchRestaurantTagsCatalog() {
  try {
    const supabase = await createSupabaseServerClient();
    const perCategory = await Promise.all(
      RESTAURANT_TAG_CATEGORY_ORDER.map((category) =>
        category === 'dish'
          ? fetchDishTagsCatalog(supabase)
          : fetchTagsCatalogForCategory(supabase, category)
      )
    );
    const extras = await fetchTagsCatalogExtras(supabase);
    const tags = [...perCategory.flat(), ...extras];
    return { tags };
  } catch (e) {
    // Do not swallow Next.js dynamic/prerender bailouts (e.g. cookies() during SSG).
    unstable_rethrow(e);
    console.error('[fetchRestaurantTagsCatalog]', e);
    return { tags: [], error: e?.message };
  }
}
