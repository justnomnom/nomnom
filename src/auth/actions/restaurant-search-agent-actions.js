'use server';

import { randomUUID } from 'crypto';

import { fetchRestaurantTagsCatalog } from 'src/auth/actions/location-actions';
import { RESTAURANT_SEARCH_AI_PROVIDERS } from 'src/libs/restaurant-search/restaurant-search-llm';
import {
  getSupabaseAuthUser,
  createSupabaseServerClient,
} from 'src/libs/supabase/supabase-server-client';
import {
  logInfo,
  logWarn,
  setUser,
  logError,
  setConversationId,
  setIsolationAttributes,
} from 'src/libs/sentry/sentry-service';
import {
  executeSearchPlan,
  mapUserQueryToSearchPlan,
  fetchLastResortRestaurants,
} from 'src/libs/restaurant-search/restaurant-search-agent';

const ALLOWED_PROVIDERS = new Set(RESTAURANT_SEARCH_AI_PROVIDERS);

/**
 * Below this many matches in the primary (scoped) bbox, re-run the same plan against the wider
 * `fallbackScope` so a tight viewport over a sparse area still surfaces enough places.
 */
const WIDEN_MIN_RESULTS = 4;

/**
 * @param {number} west
 * @param {number} south
 * @param {number} east
 * @param {number} north
 * @returns {string | null}
 */
function validateBbox(west, south, east, north) {
  const nums = [west, south, east, north];
  if (nums.some((x) => typeof x !== 'number' || !Number.isFinite(x))) {
    return 'invalid_bbox';
  }
  if (south < -90 || south > 90 || north < -90 || north > 90) return 'invalid_bbox';
  if (west < -180 || west > 180 || east < -180 || east > 180) return 'invalid_bbox';
  if (south >= north || west === east) return 'invalid_bbox';
  return null;
}

/** Exact bbox equality — used to skip a redundant widen when scope already spans the region. */
function sameBbox(a, b) {
  return (
    !!a &&
    !!b &&
    a.west === b.west &&
    a.south === b.south &&
    a.east === b.east &&
    a.north === b.north
  );
}

/**
 * Natural-language restaurant search (Discover or Map).
 * On LLM/RPC failure or empty matches, returns unfiltered restaurants near the user when possible.
 *
 * @param {object} input
 * @param {string} input.query
 * @param {{ type: 'locality', localityId: string } | { type: 'bbox', west: number, south: number, east: number, north: number, homeLocalityId?: string | null }} input.scope
 * @param {{ type: 'bbox', west: number, south: number, east: number, north: number, homeLocalityId?: string | null } | null} [input.fallbackScope] — wider bbox the same plan is re-run against when the primary scope yields too few matches (e.g. a city viewport → all of Portugal)
 * @param {string | null} [input.provider] — allowlisted: openai | anthropic | google | qwen
 * @param {{ sort?: 'relevance' | 'distance', refLat?: number | null, refLng?: number | null }} [input.bboxSort]
 * @param {number | null} [input.userLat] — optional WGS84 latitude for distance fallback
 * @param {number | null} [input.userLng] — optional WGS84 longitude for distance fallback
 * @returns {Promise<{ restaurants: Array<Record<string, unknown>>, plan: object | null, error: string | null, usedFallback: boolean }>}
 */
export async function searchRestaurantsFromNaturalLanguage({
  query,
  scope,
  fallbackScope = null,
  provider = null,
  bboxSort = undefined,
  userLat = null,
  userLng = null,
}) {
  const q = typeof query === 'string' ? query.trim() : '';
  if (!q) {
    return { restaurants: [], plan: null, error: 'empty_query', usedFallback: false };
  }

  /** @type {string | null} */
  let normalizedProvider = null;
  if (provider != null && provider !== '') {
    const p = String(provider).toLowerCase();
    if (!ALLOWED_PROVIDERS.has(p)) {
      return { restaurants: [], plan: null, error: 'invalid_provider', usedFallback: false };
    }
    normalizedProvider = p;
  }

  // Start catalog before auth so tag fetch overlaps the session check (async-parallel).
  const catalogPromise = fetchRestaurantTagsCatalog();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await getSupabaseAuthUser();
  if (authError || !user) {
    return { restaurants: [], plan: null, error: 'unauthorized', usedFallback: false };
  }

  // Sentry agent monitoring: identify user + group this search's LLM spans
  setUser({ id: user.id, email: user.email ?? undefined });
  setConversationId(`restaurant-search:${user.id}:${randomUUID()}`);
  // Per-request log attributes (isolation scope — never use global on the server)
  setIsolationAttributes({
    'nomnom.feature': 'restaurant_search',
    'nomnom.scope_type': scope.type,
  });

  if (scope.type === 'locality' && !scope.localityId) {
    return { restaurants: [], plan: null, error: 'missing_locality', usedFallback: false };
  }

  if (scope.type === 'bbox') {
    const err = validateBbox(scope.west, scope.south, scope.east, scope.north);
    if (err) {
      return { restaurants: [], plan: null, error: err, usedFallback: false };
    }
  }

  // A malformed widen scope shouldn't fail the search — just ignore it and keep the primary scope.
  if (fallbackScope?.type === 'bbox') {
    const ferr = validateBbox(
      fallbackScope.west,
      fallbackScope.south,
      fallbackScope.east,
      fallbackScope.north
    );
    if (ferr || sameBbox(scope, fallbackScope)) fallbackScope = null;
  } else {
    fallbackScope = null;
  }

  const startedAt = Date.now();
  const { tags: catalog, error: catErr } = await catalogPromise;
  if (catErr || !catalog?.length) {
    try {
      const restaurants = await fetchLastResortRestaurants({ supabase, scope, userLat, userLng });
      logWarn('Restaurant search used catalog fallback', {
        'nomnom.result_count': restaurants.length,
        'nomnom.duration_ms': Date.now() - startedAt,
        'nomnom.reason': catErr || 'no_tag_catalog',
      });
      return { restaurants, plan: null, error: null, usedFallback: true };
    } catch (e) {
      console.error('[searchRestaurantsFromNaturalLanguage] last-resort after catalog error', e);
      logError('Restaurant search catalog fallback failed', {
        'nomnom.reason': catErr || 'no_tag_catalog',
        'nomnom.duration_ms': Date.now() - startedAt,
      });
      return {
        restaurants: [],
        plan: null,
        error: catErr || 'no_tag_catalog',
        usedFallback: false,
      };
    }
  }

  const allowedSlugs = new Set(catalog.map((t) => t.slug).filter(Boolean));

  try {
    const plan = await mapUserQueryToSearchPlan({
      userMessage: q,
      tagsCatalog: catalog,
      providerOverride: normalizedProvider ?? undefined,
    });

    let restaurants = await executeSearchPlan({
      plan,
      supabase,
      scope,
      allowedSlugs,
      bboxSort,
    });
    let widenedScope = false;

    // Too few matches in the tight primary scope → re-run the SAME plan against the wider
    // fallback (no second LLM call) and keep whichever produced more places.
    if (restaurants.length < WIDEN_MIN_RESULTS && fallbackScope) {
      const widened = await executeSearchPlan({
        plan,
        supabase,
        scope: fallbackScope,
        allowedSlugs,
        bboxSort,
      });
      if (widened.length > restaurants.length) {
        restaurants = widened;
        widenedScope = true;
      }
    }

    let usedFallback = false;
    if (!restaurants.length) {
      // Cast the widest net we have for the final unfiltered safety net.
      const lastResortScope = fallbackScope ?? scope;
      restaurants = await fetchLastResortRestaurants({
        supabase,
        scope: lastResortScope,
        userLat,
        userLng,
      });
      usedFallback = true;
    }

    // One wide event with full outcome context (prefer this over fragmented logs)
    logInfo('Restaurant search completed', {
      'nomnom.result_count': restaurants.length,
      'nomnom.used_fallback': usedFallback,
      'nomnom.widened_scope': widenedScope,
      'nomnom.provider': normalizedProvider || 'default',
      'nomnom.query_length': q.length,
      'nomnom.duration_ms': Date.now() - startedAt,
    });

    return { restaurants, plan, error: null, usedFallback };
  } catch (e) {
    console.error('[searchRestaurantsFromNaturalLanguage]', e);
    try {
      const restaurants = await fetchLastResortRestaurants({ supabase, scope, userLat, userLng });
      logWarn('Restaurant search recovered via last-resort', {
        'nomnom.result_count': restaurants.length,
        'nomnom.duration_ms': Date.now() - startedAt,
        'nomnom.reason': e instanceof Error ? e.message : 'unknown',
      });
      return { restaurants, plan: null, error: null, usedFallback: true };
    } catch (e2) {
      console.error('[searchRestaurantsFromNaturalLanguage] last-resort failed', e2);
      logError('Restaurant search failed', {
        'nomnom.duration_ms': Date.now() - startedAt,
        'nomnom.reason': e2 instanceof Error ? e2.message : 'llm_or_search_failed',
      });
      return {
        restaurants: [],
        plan: null,
        error: 'llm_or_search_failed',
        usedFallback: false,
      };
    }
  }
}
