/**
 * Reconcile an incoming Google-place ingest against the curated restaurants.
 *
 * Curated restaurants are rows carrying a `slug` (their hub URL key) and
 * authored copy under `metadata.editorial`. They are seeded by hand and have no
 * `external_place_id` until a scrape of the same venue arrives — at which point
 * the ingest's normal dedupe (`.eq('external_place_id', ...)`) finds nothing and
 * would insert a SECOND Cervejaria Ramiro, splitting the authored copy away from
 * the live data.
 *
 * This module is the second dedupe pass that prevents that: when the place id
 * lookup misses, match against curated rows by name + proximity and merge into
 * the existing row instead of inserting.
 *
 * Curated rows carry no place id, so the only available join is name +
 * proximity. It follows the same rule as `pickRestaurantMatch`: a name match is
 * required, distance only breaks ties, and an ambiguous result yields nothing
 * rather than a wrong merge — merging two different restaurants into one row
 * would destroy authored content, which is worse than a duplicate.
 */

import { nameMatchScore } from 'src/libs/lists/pick-restaurant-match';

/** Outer bound for considering an editorial entry at all. */
export const EDITORIAL_MATCH_RADIUS_M = 250;

/** Within this, a same-name entry is treated as certainly the same venue. */
export const EDITORIAL_EXACT_RADIUS_M = 120;

/**
 * Two equally-named candidates closer together than this cannot be told apart
 * by distance, so the match is reported ambiguous instead of guessed.
 */
export const EDITORIAL_AMBIGUITY_MARGIN_M = 50;

const EARTH_RADIUS_M = 6371008.8;

const toRad = (deg) => (deg * Math.PI) / 180;

/**
 * Great-circle distance in metres. Returns Infinity for unusable coordinates so
 * callers can treat "no location" and "too far" identically.
 *
 * @param {{ lat?: unknown, lng?: unknown } | null | undefined} a
 * @param {{ lat?: unknown, lng?: unknown } | null | undefined} b
 * @returns {number}
 */
export function haversineMeters(a, b) {
  const lat1 = Number(a?.lat);
  const lng1 = Number(a?.lng);
  const lat2 = Number(b?.lat);
  const lng2 = Number(b?.lng);
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return Infinity;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(s)));
}

/**
 * @param {unknown} entry
 * @returns {{ slug: string, name: string, lat: number, lng: number, id: string | null } | null}
 */
function readEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const e = /** @type {Record<string, any>} */ (entry);
  const slug = typeof e.slug === 'string' ? e.slug.trim() : '';
  const name = typeof e.name === 'string' ? e.name.trim() : '';
  if (!slug || !name) return null;
  const lat = Number(e.location?.lat);
  const lng = Number(e.location?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { slug, name, lat, lng, id: typeof e.id === 'string' ? e.id : null };
}

/**
 * Find the editorial entry describing this place.
 *
 * @param {{ name?: unknown, latitude?: unknown, longitude?: unknown }} place
 * @param {unknown[]} entries editorial catalogue rows
 * @param {{ radiusMeters?: number }} [options]
 * @returns {{
 *   status: 'matched' | 'ambiguous' | 'none',
 *   slug: string | null,
 *   confidence: 'exact' | 'probable' | null,
 *   nameScore: number,
 *   distanceMeters: number | null,
 *   candidates: string[],
 * }}
 */
export function matchEditorialEntry(place, entries, options = {}) {
  const none = {
    status: /** @type {'none'} */ ('none'),
    slug: null,
    restaurantId: /** @type {string | null} */ (null),
    confidence: null,
    nameScore: 0,
    distanceMeters: null,
    candidates: /** @type {string[]} */ ([]),
  };

  const radius = Number.isFinite(options.radiusMeters)
    ? Number(options.radiusMeters)
    : EDITORIAL_MATCH_RADIUS_M;

  const name = typeof place?.name === 'string' ? place.name.trim() : '';
  const lat = Number(place?.latitude);
  const lng = Number(place?.longitude);
  if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) return none;
  if (!Array.isArray(entries) || entries.length === 0) return none;

  const scored = entries
    .map(readEntry)
    .filter(Boolean)
    .map((entry) => ({
      entry:
        /** @type {{ slug: string, name: string, lat: number, lng: number, id: string | null }} */ (
          entry
        ),
      nameScore: nameMatchScore(name, /** @type {{ name: string }} */ (entry).name),
      distanceMeters: haversineMeters(
        { lat, lng },
        {
          lat: /** @type {{ lat: number }} */ (entry).lat,
          lng: /** @type {{ lng: number }} */ (entry).lng,
        }
      ),
    }))
    .filter((row) => row.nameScore > 0 && row.distanceMeters <= radius)
    .sort((a, b) =>
      b.nameScore !== a.nameScore
        ? b.nameScore - a.nameScore
        : a.distanceMeters - b.distanceMeters
    );

  if (scored.length === 0) return none;

  const [best, runnerUp] = scored;

  // Same name, indistinguishable distance: refuse rather than pick.
  if (
    runnerUp &&
    runnerUp.nameScore === best.nameScore &&
    runnerUp.distanceMeters - best.distanceMeters < EDITORIAL_AMBIGUITY_MARGIN_M
  ) {
    return {
      status: 'ambiguous',
      slug: null,
      restaurantId: /** @type {string | null} */ (null),
      confidence: null,
      nameScore: best.nameScore,
      distanceMeters: Math.round(best.distanceMeters),
      candidates: scored
        .filter((row) => row.nameScore === best.nameScore)
        .map((row) => row.entry.slug),
    };
  }

  const confidence =
    best.nameScore === 3 && best.distanceMeters <= EDITORIAL_EXACT_RADIUS_M ? 'exact' : 'probable';

  return {
    status: 'matched',
    slug: best.entry.slug,
    // The row to merge into. Null for a plain {slug,name,location} entry with no
    // id, which is what the unit tests and any non-database caller pass.
    restaurantId: best.entry.id ?? null,
    confidence,
    nameScore: best.nameScore,
    distanceMeters: Math.round(best.distanceMeters),
    candidates: [],
  };
}

/**
 * Load the curated restaurants without letting a lookup failure break an ingest.
 *
 * A transient database error must degrade to "no reconciliation" (worst case, a
 * duplicate row a human can merge later) rather than 500 the whole ingest.
 *
 * @param {() => Promise<unknown[]> | unknown[]} readCatalog
 * @param {{ error?: (msg: string, data?: unknown) => void }} [logger]
 * @returns {Promise<unknown[]>}
 */
export async function loadEditorialCatalogSafely(readCatalog, logger) {
  try {
    const rows = await readCatalog();
    return Array.isArray(rows) ? rows : [];
  } catch (e) {
    logger?.error?.('curated restaurants unavailable; skipping reconciliation', e);
    return [];
  }
}

/**
 * Fetch curated rows straight from Postgres, shaped for {@link matchEditorialEntry}.
 *
 * Uses the ingest's own admin client rather than the content-platform reader:
 * the ingest already holds one, and this must see every curated row regardless
 * of RLS.
 *
 * @param {{ from: Function }} supabase
 * @returns {Promise<Array<{ id: string, slug: string, name: string, location: { lat: number, lng: number } }>>}
 */
export async function fetchCuratedRestaurants(supabase) {
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, slug, name, latitude, longitude')
    .not('slug', 'is', null);
  if (error) throw new Error(error.message);
  return (data ?? [])
    .filter((r) => r && typeof r.slug === 'string' && typeof r.name === 'string')
    .map((r) => ({
      id: String(r.id),
      slug: r.slug,
      name: r.name,
      location: { lat: Number(r.latitude), lng: Number(r.longitude) },
    }));
}
