'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

import { paths } from 'src/routes/paths';

import { wireSlugFromText } from 'src/utils/wire-slug';

import { saveOnboardingLocation } from 'src/auth/actions/onboarding-actions';
import { listIdsByRestaurantIdsForUser } from 'src/libs/lists/actions';
import { syncUserPrimaryLocalityFollow } from 'src/auth/actions/location-follow-sync';
import {
  getSupabaseAuthUser,
  createSupabaseServerClient,
} from 'src/libs/supabase/supabase-server-client';
import {
  resolveLocalityFromCoordinates,
  fetchRestaurantsForHomeLocality,
} from 'src/auth/actions/location-actions';

// ----------------------------------------------------------------------

/**
 * Best-guess Discover locality for a user with no saved market, so the feed can
 * render server-side instead of blocking on a client geolocation round-trip.
 * Tries Vercel edge IP geo first (no round-trip; absent in local dev), then the
 * first active onboarding market. Read-only — nothing is persisted here.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<{ localityId: string, lat: number | null, lng: number | null } | null>}
 */
async function resolveFallbackDiscoverLocality(supabase) {
  // 1) Vercel edge IP geolocation headers (present in prod, missing in local dev).
  try {
    const h = await headers();
    const lat = Number(h.get('x-vercel-ip-latitude'));
    const lng = Number(h.get('x-vercel-ip-longitude'));
    if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
      const resolved = await resolveLocalityFromCoordinates(lng, lat);
      if (resolved.location?.id) {
        return { localityId: resolved.location.id, lat, lng };
      }
    }
  } catch (e) {
    console.error('[resolveFallbackDiscoverLocality] ip-geo', e);
  }

  // 2) First active onboarding market (same anchor as syncDiscoverHomeToFallbackMarket).
  const { data: rows, error } = await supabase.rpc('list_location_localities').range(0, 0);
  if (error) {
    console.error('[resolveFallbackDiscoverLocality] list_location_localities', error);
    return null;
  }
  const first = Array.isArray(rows) ? rows[0] : null;
  if (!first?.id) {
    return null;
  }
  return { localityId: String(first.id), lat: null, lng: null };
}

/**
 * Discover page data. `homeLocalityId` is the user's home locality (`users.home_locality_id` → `cities.id`).
 *
 * @returns {Promise<{
 *   error: string | null,
 *   marketLabel: string | null,
 *   homeLocalityId: string | null,
 *   homeMunicipalityId: string | null,
 *   isFallbackMarket: boolean,
 *   suggestedCreators: Array<{
 *     user_id: string,
 *     username: string,
 *     display_name: string | null,
 *     avatar_url: string | null,
 *     subtitle: string | null,
 *     sort_order: number,
 *     municipality_slug: string
 *   }>,
 *   restaurants: Array<Record<string, unknown>>,
 *   listsLeaderboard: { interaction_leaders: object[], follower_leaders: object[], error: string | null }
 * }>}
 */
/**
 * Normalize `discover_lists_leaderboard` RPC result into the Discover UI shape.
 * @param {{ data: unknown, error: { message?: string } | null }} lbResult
 */
function normalizeListsLeaderboard(lbResult) {
  const { data: lbRaw, error: lbError } = lbResult;
  if (lbError) {
    console.error('[loadDiscoverPageData] discover_lists_leaderboard', lbError);
    return {
      interaction_leaders: [],
      follower_leaders: [],
      error: lbError.message ?? 'leaderboard_error',
    };
  }
  if (lbRaw && typeof lbRaw === 'object') {
    const errKey = lbRaw.error;
    return {
      interaction_leaders: Array.isArray(lbRaw.interaction_leaders)
        ? lbRaw.interaction_leaders
        : [],
      follower_leaders: Array.isArray(lbRaw.follower_leaders) ? lbRaw.follower_leaders : [],
      error: errKey != null ? String(errKey) : null,
    };
  }
  return { interaction_leaders: [], follower_leaders: [], error: null };
}

export async function loadDiscoverPageData() {
  const [supabase, authResult] = await Promise.all([
    createSupabaseServerClient(),
    getSupabaseAuthUser(),
  ]);
  const {
    data: { user },
  } = authResult;

  if (!user) {
    return {
      error: 'unauthorized',
      marketLabel: null,
      homeLocalityId: null,
      homeMunicipalityId: null,
      suggestedCreators: [],
      restaurants: [],
      savedListIdsByRestaurant: {},
      listsLeaderboard: { interaction_leaders: [], follower_leaders: [], error: null },
    };
  }

  // Leaderboard does not depend on locality — start immediately so it overlaps
  // profile / geo / city resolution (async-parallel).
  const lbPromise = supabase.rpc('discover_lists_leaderboard');

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('home_locality_id')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('[loadDiscoverPageData] profile', profileError);
  }

  const homeLocalityId = profile?.home_locality_id ?? null;

  // No saved market yet → resolve a provisional one (IP geo, then first active
  // market) so the feed renders server-side instead of showing a skeleton while
  // the client resolves GPS. Read-only: the precise market is persisted later by
  // the client (syncDiscoverHomeFromDevice). `homeLocalityId` stays null so the
  // client still runs its background location-refine flow.
  let resolvedLocalityId = homeLocalityId;
  let isFallbackMarket = false;
  let fallbackRef = {};
  if (!homeLocalityId) {
    const guess = await resolveFallbackDiscoverLocality(supabase);
    if (guess?.localityId) {
      resolvedLocalityId = guess.localityId;
      isFallbackMarket = true;
      if (guess.lat != null && guess.lng != null) {
        fallbackRef = { refLat: guess.lat, refLng: guess.lng };
      }
    }
  }

  let marketLabel = null;
  let homeMunicipalityId = null;
  let slugForCreators = null;

  if (resolvedLocalityId) {
    const { data: cityRow, error: cityErr } = await supabase
      .from('cities')
      .select(
        `
        name,
        parent_municipality_id,
        parent_municipality:parent_municipality_id (
          name
        )
      `
      )
      .eq('id', resolvedLocalityId)
      .maybeSingle();
    if (cityErr) {
      console.error('[loadDiscoverPageData] cities', cityErr);
    } else if (cityRow) {
      homeMunicipalityId = cityRow.parent_municipality_id ?? null;
      if (cityRow.name) {
        const name = String(cityRow.name).trim();
        marketLabel = name || null;
      }
      const parentMun = cityRow.parent_municipality;
      const munName =
        parentMun && typeof parentMun === 'object' && parentMun.name
          ? String(parentMun.name).trim()
          : '';
      if (munName) {
        slugForCreators = wireSlugFromText(munName);
      } else if (cityRow.name) {
        slugForCreators = wireSlugFromText(String(cityRow.name).trim());
      }
    }
  }

  const [creatorsResult, restaurantsOutcome, lbResult] = await Promise.all([
    supabase.rpc('get_suggested_creators_for_municipality', {
      p_municipality_slug: slugForCreators,
      p_exclude_user_id: user.id,
      p_limit: 24,
    }),
    resolvedLocalityId
      ? fetchRestaurantsForHomeLocality(resolvedLocalityId, { limit: 36, ...fallbackRef })
      : Promise.resolve({ restaurants: [] }),
    lbPromise,
  ]);

  const { data: creatorsRaw, error: creatorsError } = creatorsResult;
  const restaurants = restaurantsOutcome.restaurants ?? [];

  if (creatorsError) {
    console.error('[loadDiscoverPageData] get_suggested_creators_for_municipality', creatorsError);
  }

  const suggestedCreators = creatorsRaw ?? [];
  const listsLeaderboard = normalizeListsLeaderboard(lbResult);

  const restaurantIds = restaurants.map((r) => r.id).filter(Boolean);
  const { map: savedListIdsByRestaurant, error: saveErr } =
    await listIdsByRestaurantIdsForUser(restaurantIds);
  if (saveErr) {
    console.error('[loadDiscoverPageData] saved map', saveErr);
  }

  return {
    error: null,
    marketLabel,
    homeLocalityId,
    homeMunicipalityId,
    // The locality the SSR feed actually used: the saved `homeLocalityId`, or the provisional
    // (fallback) locality when there's no saved market. Lets the client paginate ("Show more")
    // the fallback feed before GPS resolves a saved market. `feedRefLat`/`feedRefLng` mirror the
    // proximity ref used for the SSR fallback feed so paginated pages keep the same ordering.
    feedLocalityId: resolvedLocalityId ?? null,
    feedRefLat: typeof fallbackRef.refLat === 'number' ? fallbackRef.refLat : null,
    feedRefLng: typeof fallbackRef.refLng === 'number' ? fallbackRef.refLng : null,
    // True when `restaurants`/`marketLabel` reflect a provisional (IP/first-active)
    // market rather than the user's saved one — the client shows them immediately
    // and refines to precise GPS in the background.
    isFallbackMarket,
    suggestedCreators,
    restaurants,
    savedListIdsByRestaurant: savedListIdsByRestaurant ?? {},
    listsLeaderboard,
  };
}

/**
 * Persists GPS-derived home locality (`locality_for_point` → `users.home_locality_id`) when Discover has no saved home yet.
 */
export async function syncDiscoverHomeFromDevice(lng, lat) {
  // Auth first so unauthorized callers skip the geo RPC (async-defer-await).
  const [supabase, authResult] = await Promise.all([
    createSupabaseServerClient(),
    getSupabaseAuthUser(),
  ]);
  const {
    data: { user },
  } = authResult;
  if (!user) {
    return { ok: false, error: 'Unauthorized' };
  }

  const resolved = await resolveLocalityFromCoordinates(lng, lat);
  if (resolved.error) {
    return { ok: false, error: resolved.error };
  }
  if (!resolved.location?.id) {
    return { ok: false, error: 'no_market' };
  }

  const { id } = resolved.location;

  const followResult = await syncUserPrimaryLocalityFollow(supabase, user.id, id);
  if (followResult.error) {
    return { ok: false, error: followResult.error };
  }

  const { error } = await supabase
    .from('users')
    .update({
      home_locality_id: id,
      location_permission_granted: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    console.error('[syncDiscoverHomeFromDevice]', error);
    return { ok: false, error: error.message };
  }

  revalidatePath(paths.dashboard.discover);
  const localityName = String(resolved.location.locality_name ?? '').trim() || null;
  return { ok: true, localityId: id, localityName };
}

/** When GPS fails or is denied, anchor Discover to the first active onboarding market. */
export async function syncDiscoverHomeToFallbackMarket() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) {
    return { ok: false, error: 'Unauthorized' };
  }

  // Only the first active locality is needed; cap server-side so we don't pull the
  // full (boundary-heavy) catalog past PostgREST's 1000-row window just to read rows[0].
  const { data: rows, error: rpcErr } = await supabase.rpc('list_location_localities').range(0, 0);
  if (rpcErr || !rows?.length) {
    console.error('[syncDiscoverHomeToFallbackMarket]', rpcErr);
    return { ok: false, error: rpcErr?.message ?? 'no_markets' };
  }

  const first = rows[0];
  const followResult = await syncUserPrimaryLocalityFollow(supabase, user.id, first.id);
  if (followResult.error) {
    return { ok: false, error: followResult.error };
  }

  const { error } = await supabase
    .from('users')
    .update({
      home_locality_id: first.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    console.error('[syncDiscoverHomeToFallbackMarket] update', error);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

/**
 * Updates the signed-in user's home locality for Discover (same validation as onboarding location).
 *
 * @param {string} localityId Active locality `cities.id`
 * @returns {Promise<{ ok: true } | { ok: false, error: string }>}
 */
export async function updateDiscoverHomeMarket(localityId) {
  const result = await saveOnboardingLocation({ localityId });
  if (result?.error) {
    return { ok: false, error: result.error };
  }
  revalidatePath(paths.dashboard.discover);
  return { ok: true };
}
