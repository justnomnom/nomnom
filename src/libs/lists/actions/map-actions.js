'use server';

import { filterE2eTestListsForDisplay } from 'src/utils/filter-e2e-test-lists';

import { normUuid } from 'src/libs/lists/actions/_shared';
import { supabaseAdminClient } from 'src/libs/supabase/supabase-admin';
import { normalizeFollowCircle } from 'src/libs/restaurant/follow-circle';
import { normalizeOpeningStatus } from 'src/libs/restaurant/opening-hours';
import { buildFollowingListOwnersMap } from 'src/libs/restaurant/following-list-owners';
import { slimRestaurantCardMetadata } from 'src/libs/restaurant/slim-restaurant-card-metadata';
import {
  getSupabaseAuthUser,
  createSupabaseServerClient,
} from 'src/libs/supabase/supabase-server-client';
import {
  fetchAllSupabasePages,
  SUPABASE_DEFAULT_PAGE_SIZE,
} from 'src/libs/supabase/supabase-fetch-all-pages';

export async function fetchSavedRestaurantsForMap(options = {}) {
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

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) {
    return { restaurants: [], error: null };
  }

  // Page through the RPC: a viewer with >1000 saved restaurants would otherwise lose
  // every pin past PostgREST's 1000-row window (the RPC has no LIMIT and orders by
  // name, so truncation silently drops the alphabetical tail). The RPC's ORDER BY is
  // stable, so `.range()` paging is deterministic. Same fix class as fetchLocationLocalities.
  let data;
  try {
    data = await fetchAllSupabasePages(async (from, pageSize) => {
      const { data: page, error } = await supabase
        .rpc('saved_restaurants_for_map', {
          p_tag_slugs: pTagSlugs,
          p_match_all: Boolean(matchAll),
          p_search: pSearch,
          p_min_rating: pMinRating,
          p_sort: pSort,
          p_ref_lat: pRefLat,
          p_ref_lng: pRefLng,
          p_open_now: openNow ? true : null,
        })
        .range(from, from + pageSize - 1);
      if (error) {
        throw error;
      }
      return page ?? [];
    }, SUPABASE_DEFAULT_PAGE_SIZE);
  } catch (e) {
    return { restaurants: [], error: e?.message ?? 'unknown' };
  }

  const restaurants = (data ?? [])
    .map((row) => {
      const lat = row.latitude != null ? Number(row.latitude) : NaN;
      const lng = row.longitude != null ? Number(row.longitude) : NaN;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      const openingStatus = normalizeOpeningStatus(row.opening_status ?? row.openingStatus);
      return {
        id: String(row.id),
        name: String(row.name ?? ''),
        address: typeof row.address === 'string' ? row.address : null,
        latitude: lat,
        longitude: lng,
        municipality_id: row.municipality_id != null ? String(row.municipality_id) : null,
        metadata: slimRestaurantCardMetadata(row.metadata) ?? {},
        is_sponsored: row.is_sponsored === true,
        // Time the restaurant was saved to the list, when the RPC surfaces it — powers the
        // "Last added" sort in the map sheet. Absent columns leave it null (sort falls back).
        added_at: row.added_at ?? row.saved_at ?? row.created_at ?? null,
        ...(openingStatus ? { openingStatus } : {}),
      };
    })
    .filter(Boolean);

  return { restaurants, error: null };
}

/**
 * @param {object} [options]
 * @param {string[] | null} [options.tagSlugs]
 * @param {boolean} [options.matchAll]
 * @param {string | null} [options.search]
 * @param {number | null} [options.minRating]
 * @param {'name' | 'rating_desc' | 'relevance' | 'distance'} [options.sort]
 * @param {number | null} [options.refLat]
 * @param {number | null} [options.refLng]
 * @returns {Promise<{ restaurants: Array<{ id: string, name: string, latitude: number, longitude: number, municipality_id: string | null, metadata: object }>, error?: string | null }>}
 */
export async function fetchFollowingRestaurantsForMap(options = {}) {
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

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) {
    return { restaurants: [], error: null };
  }

  // Page through the RPC: a viewer whose followed lists exceed 1000 combined pins would
  // otherwise lose every marker past PostgREST's 1000-row window (the RPC has no LIMIT
  // and orders by name, so truncation silently drops the alphabetical tail). The RPC's
  // ORDER BY is stable, so `.range()` paging is deterministic. Same fix class as
  // fetchLocationLocalities.
  let data;
  try {
    data = await fetchAllSupabasePages(async (from, pageSize) => {
      const { data: page, error } = await supabase
        .rpc('following_restaurants_for_map', {
          p_tag_slugs: pTagSlugs,
          p_match_all: Boolean(matchAll),
          p_search: pSearch,
          p_min_rating: pMinRating,
          p_sort: pSort,
          p_ref_lat: pRefLat,
          p_ref_lng: pRefLng,
          p_open_now: openNow ? true : null,
        })
        .range(from, from + pageSize - 1);
      if (error) {
        throw error;
      }
      return page ?? [];
    }, SUPABASE_DEFAULT_PAGE_SIZE);
  } catch (e) {
    return { restaurants: [], error: e?.message ?? 'unknown' };
  }

  const restaurants = (data ?? [])
    .map((row) => {
      const lat = row.latitude != null ? Number(row.latitude) : NaN;
      const lng = row.longitude != null ? Number(row.longitude) : NaN;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      const openingStatus = normalizeOpeningStatus(row.opening_status ?? row.openingStatus);
      return {
        id: String(row.id),
        name: String(row.name ?? ''),
        address: typeof row.address === 'string' ? row.address : null,
        latitude: lat,
        longitude: lng,
        municipality_id: row.municipality_id != null ? String(row.municipality_id) : null,
        metadata: slimRestaurantCardMetadata(row.metadata) ?? {},
        is_sponsored: row.is_sponsored === true,
        // Time the restaurant was saved to the list, when the RPC surfaces it — powers the
        // "Last added" sort in the map sheet. Absent columns leave it null (sort falls back).
        added_at: row.added_at ?? row.saved_at ?? row.created_at ?? null,
        ...(openingStatus ? { openingStatus } : {}),
      };
    })
    .filter(Boolean);

  return { restaurants, error: null };
}

/**
 * Lists owned by the viewer, for the map "Saved" chip dropdown (subset filter).
 * @returns {Promise<{ lists: Array<{ id: string, name: string, owner_username: string|null, owner_display_name: string|null, item_count: number }>, error: string|null }>}
 */
export async function fetchMyOwnedListsForMapDropdown() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) return { lists: [], error: null };

  const { data, error } = await supabase.rpc('map_my_owned_lists');
  if (error) return { lists: [], error: error.message };

  const lists = (data ?? [])
    .filter((row) => row?.id != null && String(row.id).trim() !== '')
    .map((row) => {
      const ic = row.item_count;
      let item_count = 0;
      if (typeof ic === 'bigint') {
        item_count = Number(ic);
      } else if (typeof ic === 'number' && Number.isFinite(ic)) {
        item_count = ic;
      } else if (typeof ic === 'string' && ic !== '') {
        const parsed = Number(ic);
        item_count = Number.isFinite(parsed) ? parsed : 0;
      }
      return {
        id: String(row.id),
        name: row.name,
        description: row.description,
        cover_image_url: row.cover_image_url,
        visibility: row.visibility,
        published_at: row.published_at,
        updated_at: row.updated_at,
        owner_username: row.owner_username ?? null,
        owner_display_name: row.owner_display_name ?? null,
        item_count,
      };
    });
  return { lists: filterE2eTestListsForDisplay(lists), error: null };
}

/**
 * Lists where the viewer is an active collaborator (but not owner), for the map "My own"
 * chip dropdown's "Shared with me" group.
 * @returns {Promise<{ lists: Array<{ id: string, name: string, owner_username: string|null, owner_display_name: string|null, item_count: number }>, error: string|null }>}
 */
export async function fetchMyCollaboratorListsForMapDropdown() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) return { lists: [], error: null };

  const { data, error } = await supabase.rpc('map_my_collaborator_lists');
  if (error) return { lists: [], error: error.message };

  const lists = (data ?? [])
    .filter((row) => row?.id != null && String(row.id).trim() !== '')
    .map((row) => {
      const ic = row.item_count;
      let item_count = 0;
      if (typeof ic === 'bigint') {
        item_count = Number(ic);
      } else if (typeof ic === 'number' && Number.isFinite(ic)) {
        item_count = ic;
      } else if (typeof ic === 'string' && ic !== '') {
        const parsed = Number(ic);
        item_count = Number.isFinite(parsed) ? parsed : 0;
      }
      return {
        id: String(row.id),
        name: row.name,
        description: row.description,
        cover_image_url: row.cover_image_url,
        visibility: row.visibility,
        published_at: row.published_at,
        updated_at: row.updated_at,
        owner_username: row.owner_username ?? null,
        owner_display_name: row.owner_display_name ?? null,
        item_count,
      };
    });
  return { lists: filterE2eTestListsForDisplay(lists), error: null };
}

/**
 * Fetch restaurants from specific list IDs for the map while preserving the same
 * tag/search/rating/sort behavior as `fetchSavedRestaurantsForMap`. Accepts both
 * owned list IDs and IDs of lists where the viewer is an active collaborator.
 *
 * @param {string[]} listIds
 * @param {object} [options]
 * @param {string[] | null} [options.tagSlugs]
 * @param {boolean} [options.matchAll]
 * @param {string | null} [options.search]
 * @param {number | null} [options.minRating]
 * @param {'name' | 'rating_desc' | 'relevance' | 'distance'} [options.sort]
 * @param {number | null} [options.refLat]
 * @param {number | null} [options.refLng]
 * @returns {Promise<{ restaurants: Array<{ id: string, name: string, latitude: number, longitude: number, municipality_id: string | null, metadata: object, is_sponsored: boolean }>, error?: string | null }>}
 */
export async function fetchSavedRestaurantsForMapByListIds(listIds, options = {}) {
  if (!Array.isArray(listIds) || listIds.length === 0) {
    return { restaurants: [], error: null };
  }
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) return { restaurants: [], error: null };

  const supabase = await createSupabaseServerClient();
  const [{ data: ownedListsData }, { data: collaboratorListsData }] = await Promise.all([
    supabase.rpc('map_my_owned_lists'),
    supabase.rpc('map_my_collaborator_lists'),
  ]);
  const accessibleListIdSet = new Set([
    ...(ownedListsData ?? []).map((l) => String(l.id)),
    ...(collaboratorListsData ?? []).map((l) => String(l.id)),
  ]);
  const validListIds = listIds.filter((id) => accessibleListIdSet.has(String(id)));

  if (validListIds.length === 0) {
    return { restaurants: [], error: null };
  }

  const { data: listItemRows, error } = await supabaseAdminClient
    .from('list_items')
    .select('restaurant_id')
    .in('list_id', validListIds);

  if (error) return { restaurants: [], error: error.message };

  const allowedRestaurantIds = new Set(
    (listItemRows ?? [])
      .map((row) => (row?.restaurant_id != null ? String(row.restaurant_id) : ''))
      .filter(Boolean)
  );
  if (allowedRestaurantIds.size === 0) return { restaurants: [], error: null };

  const { restaurants: filteredRestaurants, error: filteredError } =
    await fetchSavedRestaurantsForMap(options);
  if (filteredError) return { restaurants: [], error: filteredError };

  const restaurants = (filteredRestaurants ?? []).filter((r) =>
    allowedRestaurantIds.has(String(r.id))
  );
  return { restaurants, error: null };
}

/**
 * Fetch restaurants from specific followed list IDs for the map while preserving
 * the same tag/search/rating/sort behavior as `fetchFollowingRestaurantsForMap`.
 *
 * @param {string[]} listIds
 * @param {object} [options]
 * @param {string[] | null} [options.tagSlugs]
 * @param {boolean} [options.matchAll]
 * @param {string | null} [options.search]
 * @param {number | null} [options.minRating]
 * @param {'name' | 'rating_desc' | 'relevance' | 'distance'} [options.sort]
 * @param {number | null} [options.refLat]
 * @param {number | null} [options.refLng]
 * @returns {Promise<{ restaurants: Array<{ id: string, name: string, latitude: number, longitude: number, municipality_id: string | null, metadata: object, is_sponsored: boolean }>, error?: string | null }>}
 */
export async function fetchFollowingRestaurantsForMapByListIds(listIds, options = {}) {
  if (!Array.isArray(listIds) || listIds.length === 0) {
    return { restaurants: [], error: null };
  }
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) return { restaurants: [], error: null };

  // Validate that the requested list IDs belong to lists the user actually follows.
  // list_items RLS only allows reading items from lists the user owns, so we use the
  // admin client after confirming ownership via the map_following_lists RPC.
  const supabase = await createSupabaseServerClient();
  const { data: followedListsData } = await supabase.rpc('map_following_lists');
  const followedListIdSet = new Set((followedListsData ?? []).map((l) => String(l.id)));
  const validListIds = listIds.filter((id) => followedListIdSet.has(String(id)));

  if (validListIds.length === 0) {
    return { restaurants: [], error: null };
  }

  const { data: listItemRows, error } = await supabaseAdminClient
    .from('list_items')
    .select('restaurant_id')
    .in('list_id', validListIds);

  if (error) return { restaurants: [], error: error.message };

  const allowedRestaurantIds = new Set(
    (listItemRows ?? [])
      .map((row) => (row?.restaurant_id != null ? String(row.restaurant_id) : ''))
      .filter(Boolean)
  );
  if (allowedRestaurantIds.size === 0) return { restaurants: [], error: null };

  const { restaurants: filteredRestaurants, error: filteredError } =
    await fetchFollowingRestaurantsForMap(options);
  if (filteredError) return { restaurants: [], error: filteredError };

  const restaurants = (filteredRestaurants ?? []).filter((r) =>
    allowedRestaurantIds.has(String(r.id))
  );
  return { restaurants, error: null };
}

/**
 * Lists owned by users the viewer follows (user_follows), used to populate the
 * map "Following" chip dropdown. Matches the source of following_restaurants_for_map.
 * @returns {Promise<{ lists: Array<{ id: string, name: string, owner_username: string|null, owner_display_name: string|null, item_count: number }>, error: string|null }>}
 * `item_count` is the live list size for subscribers; for snapshot-only access it matches the
 * purchase capture size (or full list size when capture is legacy-null).
 */
export async function fetchFollowingListsForMapDropdown() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) return { lists: [], error: null };

  const { data, error } = await supabase.rpc('map_following_lists');
  if (error) return { lists: [], error: error.message };

  const lists = (data ?? [])
    .filter((row) => row?.id != null && String(row.id).trim() !== '')
    .map((row) => {
      const ic = row.item_count;
      let item_count = 0;
      if (typeof ic === 'bigint') {
        item_count = Number(ic);
      } else if (typeof ic === 'number' && Number.isFinite(ic)) {
        item_count = ic;
      } else if (typeof ic === 'string' && ic !== '') {
        const parsed = Number(ic);
        item_count = Number.isFinite(parsed) ? parsed : 0;
      }
      return {
        id: String(row.id),
        name: row.name,
        description: row.description,
        cover_image_url: row.cover_image_url,
        visibility: row.visibility,
        published_at: row.published_at,
        updated_at: row.updated_at,
        owner_username: row.owner_username ?? null,
        owner_display_name: row.owner_display_name ?? null,
        item_count,
      };
    });
  return { lists: filterE2eTestListsForDisplay(lists), error: null };
}

/**
 * For a set of visible restaurant IDs, returns which followed users (public lists + subscribed)
 * have each restaurant on their list. Used to show social "who has this" rings on the map sheet.
 *
 * @param {string[]} restaurantIds
 * @returns {Promise<{ map: Record<string, Array<{ userId: string, displayName: string | null, username: string | null, avatarUrl: string | null }>>, error: string | null }>}
 */
export async function fetchFollowingListOwnersForRestaurants(restaurantIds) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) return { map: {}, error: null };

  const ids = [...new Set((restaurantIds ?? []).map(String).filter(Boolean))];
  if (ids.length === 0) return { map: {}, error: null };

  // Fetch lists from followed users that the viewer can access (handles visibility + subscriptions)
  const { data: followingLists, error: flErr } = await supabase.rpc('map_following_lists');
  if (flErr) return { map: {}, error: flErr.message };

  const followingListIds = (followingLists ?? []).map((r) => String(r.id)).filter(Boolean);
  if (followingListIds.length === 0) return { map: {}, error: null };

  // Fetch list ownership and list_items in parallel
  const [{ data: listUserRows }, { data: items, error: iErr }] = await Promise.all([
    supabase.from('lists').select('id, user_id').in('id', followingListIds),
    supabase
      .from('list_items')
      .select('restaurant_id, list_id')
      .in('list_id', followingListIds)
      .in('restaurant_id', ids),
  ]);
  if (iErr) return { map: {}, error: iErr.message };
  if (!items?.length) return { map: {}, error: null };

  const ownerIds = [...new Set((listUserRows ?? []).map((l) => l?.user_id).filter(Boolean))];
  if (ownerIds.length === 0) return { map: {}, error: null };

  // RLS allows users to SELECT only their own row; use SECURITY DEFINER RPC limited to followed users.
  const { data: userRows, error: profErr } = await supabase.rpc('map_following_owner_profiles', {
    p_user_ids: ownerIds,
  });
  if (profErr) {
    console.warn(
      '[fetchFollowingListOwnersForRestaurants] map_following_owner_profiles:',
      profErr.message
    );
    return { map: {}, error: profErr.message };
  }

  return {
    map: buildFollowingListOwnersMap(items, listUserRows, userRows),
    error: null,
  };
}

/**
 * Complete "who you follow has this" map for the viewer — every restaurant on any following list
 * the viewer can access, keyed restaurant id → followed owners. The bounded
 * {@link fetchFollowingListOwnersForRestaurants} only covers a passed-in id set (the map's detail
 * slice), so the avatar badges went missing on pins outside it. This returns the whole set so the
 * map can badge every pin, viewport-independent. The `list_items` read is paged past PostgREST's
 * 1000-row window (a following graph spanning many lists easily exceeds it).
 *
 * @returns {Promise<{ map: Record<string, Array<{ userId: string, displayName: string | null, username: string | null, avatarUrl: string | null }>>, complete: boolean, error: string | null }>}
 */
export async function fetchViewerFollowingOwnersMap() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) return { map: {}, complete: false, error: null };

  const { data: followingLists, error: flErr } = await supabase.rpc('map_following_lists');
  if (flErr) return { map: {}, complete: false, error: flErr.message };

  const followingListIds = (followingLists ?? []).map((r) => String(r.id)).filter(Boolean);
  if (followingListIds.length === 0) {
    // No accessible following lists — a complete (empty) answer.
    return { map: {}, complete: true, error: null };
  }

  try {
    const [{ data: listUserRows }, items] = await Promise.all([
      supabase.from('lists').select('id, user_id').in('id', followingListIds),
      fetchAllSupabasePages(async (from, pageSize) => {
        const { data, error } = await supabase
          .from('list_items')
          .select('restaurant_id, list_id')
          .in('list_id', followingListIds)
          .range(from, from + pageSize - 1);
        if (error) throw error;
        return data ?? [];
      }, SUPABASE_DEFAULT_PAGE_SIZE),
    ]);

    if (items.length === 0) return { map: {}, complete: true, error: null };

    const ownerIds = [...new Set((listUserRows ?? []).map((l) => l?.user_id).filter(Boolean))];
    if (ownerIds.length === 0) return { map: {}, complete: true, error: null };

    const { data: userRows, error: profErr } = await supabase.rpc('map_following_owner_profiles', {
      p_user_ids: ownerIds,
    });
    if (profErr) {
      console.warn(
        '[fetchViewerFollowingOwnersMap] map_following_owner_profiles:',
        profErr.message
      );
      return { map: {}, complete: false, error: profErr.message };
    }

    return {
      map: buildFollowingListOwnersMap(items, listUserRows, userRows),
      complete: true,
      error: null,
    };
  } catch (e) {
    return { map: {}, complete: false, error: e?.message ?? 'unknown' };
  }
}

/**
 * Follow-circle (you + people you follow who have this restaurant on a list) for one restaurant.
 * Returns `null` when not signed in or no circle data exists.
 */
export async function fetchFollowCircleForRestaurant(restaurantId) {
  const id = normUuid(restaurantId);
  if (!id) return { circle: null, error: null };
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) return { circle: null, error: null };
  const { data, error } = await supabase.rpc('restaurant_follow_circle_for_viewer', {
    p_restaurant_id: id,
  });
  if (error) {
    return { circle: null, error: error.message };
  }
  return { circle: normalizeFollowCircle(data), error: null };
}
