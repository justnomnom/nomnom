'use client';

import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import { userScopedGetJson, userScopedSetJson } from 'src/utils/user-scoped-storage';

import { useRestaurantTagsCatalog } from 'src/api/restaurant-tags-catalog';
import { fetchMapSpotDetailById } from 'src/auth/actions/location-actions';
import { fetchRestaurantReviews } from 'src/auth/actions/restaurant-review-actions';
import {
  filterListMentionsToFollowsOnly,
  filterListMentionsToSelfOrReviewBacked,
} from 'src/libs/list/filter-list-mentions-to-follows-only';
import {
  fetchViewerSavedListMap,
  fetchViewerFollowingIds,
  fetchListSummariesForViewer,
  fetchRestaurantListMentions,
  listIdsByRestaurantIdsForUser,
  fetchViewerFollowingOwnersMap,
  fetchFollowCircleForRestaurant,
  fetchPublicListItemsForRestaurant,
  fetchFollowingListOwnersForRestaurants,
} from 'src/auth/actions/list-actions';

import { spotIdEq, buildSheetRestaurantFromMapPlace } from './map-sheet-restaurant-builders';

export { spotIdEq, buildSheetRestaurantFromMapPlace };

/**
 * Shared map pin sheet: tag catalog, reviews + list mentions, saved-list ids for visible places.
 *
 * @param {object} opts
 * @param {Array<{ id: string, name?: string, latitude?: number, longitude?: number, metadata?: object, address?: string, home_city?: object }>} opts.places — detailed pins for the sheet list (bounded bbox/saved/list items).
 * @param {string | null} opts.selectedId
 * @param {string | null} opts.userId
 * @param {Record<string, unknown> | null} [opts.selectedFallbackRow] — lean pin row for `selectedId` when it isn't in the bounded `places` (a pin beyond the detailed set). Gives the detail card name/coords instantly while the heavy fields hydrate by id.
 * @param {[string, string] | null} [opts.userScopedSavedListCacheKey] — when set with `userId`, persist `savedListIdsByRestaurant` (dashboard map).
 */
export function useRestaurantMapSheet({
  places,
  selectedId,
  userId,
  selectedFallbackRow = null,
  userScopedSavedListCacheKey = null,
}) {
  const { tags: tagCatalog, loaded: tagCatalogLoaded } = useRestaurantTagsCatalog();
  const [sheetReviews, setSheetReviews] = useState(
    /** @type {Array<Record<string, unknown>>} */ ([])
  );
  const [sheetListMentions, setSheetListMentions] = useState(
    /** @type {Array<Record<string, unknown>>} */ ([])
  );
  const [sheetFeedLoading, setSheetFeedLoading] = useState(false);
  const [sheetFollowCircle, setSheetFollowCircle] = useState(
    /** @type {{ members: Array<{ userId: string, avatarUrl: string | null }>, total: number } | null} */ (
      null
    )
  );
  const [sheetFollowCircleLoading, setSheetFollowCircleLoading] = useState(false);
  /** @type {Record<string, string[]>} */
  const [savedListIdsByRestaurant, setSavedListIdsByRestaurant] = useState({});
  /**
   * Restaurant ids for which the saved-list membership has been resolved
   * (from cache or server). Without this, an unhydrated `id` yields `[]`
   * — indistinguishable from "loaded, not saved" — and the bookmark toolbar
   * icon flickers from neutral → orange when the fetch lands.
   */
  const [hydratedSavedListIds, setHydratedSavedListIds] = useState(
    /** @type {Set<string>} */ (new Set())
  );
  /**
   * True once the viewer's *complete* saved-list map has loaded (every restaurant on any list they
   * own or collaborate on — see {@link fetchViewerSavedListMap}). When complete, any id absent from
   * `savedListIdsByRestaurant` is known-not-saved, so the map can color every saved pin and a tapped
   * pin outside the bounded `places` slice resolves without a per-id round-trip.
   */
  const [savedMapComplete, setSavedMapComplete] = useState(false);
  /** @type {Record<string, { id: string, name: string, cover_image_url: string | null, owner_id: string | null, owner_display_name: string | null, owner_username: string | null, owner_avatar_url: string | null }>} */
  const [listMetaById, setListMetaById] = useState({});
  /** @type {Record<string, Array<{ userId: string, displayName: string | null, username: string | null, avatarUrl: string | null }>>} */
  const [followingOwnersByRestaurant, setFollowingOwnersByRestaurant] = useState({});
  const [followingOwnersLoading, setFollowingOwnersLoading] = useState(false);
  const followingOwnersFetchSeqRef = useRef(0);
  /**
   * True once the *complete* "who you follow has this" map has loaded (every restaurant on any
   * accessible following list — see {@link fetchViewerFollowingOwnersMap}). When complete, the map
   * badges every pin, and the per-place fallback below stops firing on each pan.
   */
  const [followingOwnersMapComplete, setFollowingOwnersMapComplete] = useState(false);

  /**
   * On-demand detail cache (id → full row with `metadata`/`restaurant_images`/address/phone).
   * The map draws lean pins (no metadata), so tapping a pin outside the bounded detailed
   * `places` set hydrates the heavy fields here so the detail card renders fully.
   */
  const [hydratedDetailById, setHydratedDetailById] = useState(
    /** @type {Record<string, Record<string, unknown>>} */ ({})
  );

  const mapListSegA = userScopedSavedListCacheKey?.[0];
  const mapListSegB = userScopedSavedListCacheKey?.[1];

  useEffect(() => {
    if (!userId || !mapListSegA || !mapListSegB) {
      if (!userId) {
        setSavedListIdsByRestaurant({});
        setHydratedSavedListIds(new Set());
        setSavedMapComplete(false);
      }
      return;
    }
    const cached = userScopedGetJson(userId, mapListSegA, mapListSegB);
    if (cached && typeof cached === 'object' && !Array.isArray(cached)) {
      const cachedMap = /** @type {Record<string, string[]>} */ (cached);
      setSavedListIdsByRestaurant(cachedMap);
      setHydratedSavedListIds(new Set(Object.keys(cachedMap)));
    } else {
      setSavedListIdsByRestaurant({});
      setHydratedSavedListIds(new Set());
    }
  }, [userId, mapListSegA, mapListSegB]);

  /**
   * Resolve the viewer's *complete* saved-list map on mount. The per-place pass below
   * ({@link refreshSavedForPlaces}) only covers the bounded `places` slice, so saved spots beyond
   * it — most of the up-to-5000 map pins, plus any pin tapped from a dense area — would otherwise
   * render un-saved on the map and in the detail card. This one viewport-independent query is the
   * source of truth; un-saved ids are simply absent. We merge over any cached map so a freshly
   * saved spot from a previous interaction isn't dropped.
   */
  useEffect(() => {
    if (!userId) {
      setSavedMapComplete(false);
      return undefined;
    }
    let cancelled = false;
    fetchViewerSavedListMap().then(({ map: fullMap, complete, error }) => {
      if (cancelled) return;
      if (error || !complete) {
        if (error) console.warn('[useRestaurantMapSheet] fetchViewerSavedListMap:', error);
        return;
      }
      const resolved = fullMap ?? {};
      setSavedListIdsByRestaurant((prev) => {
        // The complete map is authoritative; keep prev only to avoid a flash for ids it also has.
        const next = { ...prev, ...resolved };
        if (userId && mapListSegA && mapListSegB) {
          userScopedSetJson(userId, mapListSegA, mapListSegB, next);
        }
        return next;
      });
      setHydratedSavedListIds((prev) => {
        const next = new Set(prev);
        Object.keys(resolved).forEach((id) => next.add(String(id)));
        return next;
      });
      setSavedMapComplete(true);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, mapListSegA, mapListSegB]);

  const refreshSavedForPlaces = useCallback(
    async (placeRows) => {
      if (!userId) return;
      const ids = [...new Set((placeRows ?? []).map((r) => r.id).filter(Boolean))];
      if (ids.length === 0) {
        return;
      }
      const { map, error: listIdsErr } = await listIdsByRestaurantIdsForUser(ids);
      if (listIdsErr) {
        console.warn('[useRestaurantMapSheet] listIdsByRestaurantIdsForUser:', listIdsErr);
        return;
      }
      const serverMap = map ?? {};
      setSavedListIdsByRestaurant((prev) => {
        const next = { ...prev };
        ids.forEach((id) => {
          next[id] = serverMap[id] ?? [];
        });
        if (userId && mapListSegA && mapListSegB) {
          userScopedSetJson(userId, mapListSegA, mapListSegB, next);
        }
        return next;
      });
      setHydratedSavedListIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(String(id)));
        return next;
      });
    },
    [userId, mapListSegA, mapListSegB]
  );

  useEffect(() => {
    if (!userId) return;
    refreshSavedForPlaces(places);
  }, [places, userId, refreshSavedForPlaces]);

  const uniqueListIdsKey = useMemo(() => {
    const s = new Set();
    Object.values(savedListIdsByRestaurant).forEach((arr) => {
      (arr ?? []).forEach((id) => {
        if (id) s.add(String(id));
      });
    });
    return [...s].sort().join(',');
  }, [savedListIdsByRestaurant]);

  useEffect(() => {
    if (!userId) {
      setListMetaById({});
      return undefined;
    }
    const ids = uniqueListIdsKey ? uniqueListIdsKey.split(',').filter(Boolean) : [];
    if (ids.length === 0) {
      setListMetaById({});
      return undefined;
    }
    let cancelled = false;
    fetchListSummariesForViewer(ids).then(({ lists, error }) => {
      if (cancelled || error) return;
      const next = {};
      (lists ?? []).forEach((l) => {
        next[l.id] = l;
      });
      setListMetaById(next);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, uniqueListIdsKey]);

  const placesIdsKey = useMemo(
    () =>
      (places ?? [])
        .map((r) => String(r.id))
        .filter(Boolean)
        .sort()
        .join(','),
    [places]
  );

  /**
   * Resolve the *complete* following-owners map on mount (every restaurant on any accessible
   * following list). Mirrors the saved-map fix: the per-place fallback below only badges the
   * bounded `places` slice, so badges went missing on pins outside it. Once this lands it is the
   * source of truth and the per-pan fallback stops firing.
   */
  useEffect(() => {
    if (!userId) {
      setFollowingOwnersMapComplete(false);
      return undefined;
    }
    let cancelled = false;
    fetchViewerFollowingOwnersMap().then(({ map, complete, error }) => {
      if (cancelled) return;
      if (error || !complete) {
        if (error) console.warn('[useRestaurantMapSheet] fetchViewerFollowingOwnersMap:', error);
        return;
      }
      // Invalidate any in-flight bounded per-place fetch so it can't clobber the complete map.
      followingOwnersFetchSeqRef.current += 1;
      setFollowingOwnersByRestaurant(map ?? {});
      setFollowingOwnersLoading(false);
      setFollowingOwnersMapComplete(true);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setFollowingOwnersByRestaurant({});
      setFollowingOwnersLoading(false);
      return undefined;
    }
    // Complete map already badges every pin — skip the bounded per-pan fallback.
    if (followingOwnersMapComplete) return undefined;
    const ids = placesIdsKey ? placesIdsKey.split(',').filter(Boolean) : [];
    if (ids.length === 0) {
      setFollowingOwnersByRestaurant({});
      setFollowingOwnersLoading(false);
      return undefined;
    }
    followingOwnersFetchSeqRef.current += 1;
    const reqId = followingOwnersFetchSeqRef.current;
    setFollowingOwnersLoading(true);
    fetchFollowingListOwnersForRestaurants(ids)
      .then(({ map, error }) => {
        if (reqId !== followingOwnersFetchSeqRef.current) return;
        setFollowingOwnersLoading(false);
        if (error) return;
        setFollowingOwnersByRestaurant(map ?? {});
      })
      .catch(() => {
        // Never leave the follower row stuck on its loading skeleton: clear loading
        // even if the server action rejects (network/auth/RLS error).
        if (reqId !== followingOwnersFetchSeqRef.current) return;
        setFollowingOwnersLoading(false);
      });
    return undefined;
  }, [userId, placesIdsKey, followingOwnersMapComplete]);

  /**
   * Sticky selection: once the user picks a pin, keep showing it even if a subsequent fetch
   * (e.g. viewport pan) returns a `places` array that no longer includes it. Without this,
   * panning the map would silently collapse the detail view because the lookup would fail.
   * The cache only resets when `selectedId` changes to null or to a different id.
   */
  const lastSelectedRowRef = useRef(/** @type {object | null} */ (null));
  const selectedRow = useMemo(() => {
    if (!selectedId) {
      lastSelectedRowRef.current = null;
      return null;
    }
    const hasFullMeta = (row) =>
      !!row && !!row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata);
    const found = places.find((r) => spotIdEq(r.id, selectedId));
    // A detailed row from the bounded sheet set already carries everything the card needs.
    if (hasFullMeta(found)) {
      lastSelectedRowRef.current = found;
      return found;
    }
    // Otherwise assemble a base (lean pin fallback or sticky cache) and merge hydrated detail.
    const fallback =
      selectedFallbackRow && spotIdEq(selectedFallbackRow.id, selectedId)
        ? selectedFallbackRow
        : null;
    const cached =
      lastSelectedRowRef.current && spotIdEq(lastSelectedRowRef.current.id, selectedId)
        ? lastSelectedRowRef.current
        : null;
    const base = found ?? fallback ?? cached;
    const hydrated = hydratedDetailById[String(selectedId)];
    const row = hydrated ? { ...(base ?? {}), ...hydrated, id: String(selectedId) } : base;
    if (row) {
      lastSelectedRowRef.current = row;
    }
    return row ?? null;
  }, [places, selectedId, selectedFallbackRow, hydratedDetailById]);

  const selectedRestaurantId = selectedRow?.id != null ? String(selectedRow.id) : null;

  /**
   * Hydrate heavy detail for a tapped pin that isn't in the bounded `places` set (or arrived lean).
   * Keyed on `selectedId` (not the merged row id) so it can't loop when the hydrated row lands.
   */
  useEffect(() => {
    const rid = selectedId != null ? String(selectedId) : null;
    if (!rid) return undefined;
    const found = places.find((r) => spotIdEq(r.id, rid));
    const hasFullMeta =
      !!found &&
      !!found.metadata &&
      typeof found.metadata === 'object' &&
      !Array.isArray(found.metadata);
    if (hasFullMeta) return undefined; // bounded sheet row already complete
    if (hydratedDetailById[rid]) return undefined; // already hydrated this session
    let cancelled = false;
    fetchMapSpotDetailById(rid).then(({ row, error }) => {
      if (cancelled || error || !row) return;
      setHydratedDetailById((prev) => (prev[rid] ? prev : { ...prev, [rid]: row }));
    });
    return () => {
      cancelled = true;
    };
  }, [selectedId, places, hydratedDetailById]);

  const loadSheetFeedForId = useCallback(
    async (restaurantId, isCancelled, opts) => {
      const showLoading = opts?.showLoading !== false;
      if (!restaurantId) {
        setSheetReviews([]);
        setSheetListMentions([]);
        setSheetFeedLoading(false);
        return;
      }
      if (showLoading) {
        setSheetFeedLoading(true);
      }
      try {
        const [
          { reviews, error: revErr },
          { items: listItems, error: listErr },
          publicListItems,
          followingIds,
        ] = await Promise.all([
          fetchRestaurantReviews(restaurantId),
          fetchRestaurantListMentions(restaurantId),
          fetchPublicListItemsForRestaurant(restaurantId),
          fetchViewerFollowingIds(),
        ]);
        if (isCancelled?.()) return;
        if (listErr) {
          console.error('[fetchRestaurantListMentions]', listErr);
          setSheetListMentions([]);
        } else {
          const primaryIds = new Set((listItems ?? []).map((m) => m.id).filter(Boolean));
          const reviewsByKey = new Map(
            (reviews ?? []).map((r) => [`${r.user_id}:${r.restaurant_id}`, r])
          );
          const supplement = (publicListItems ?? [])
            .filter(
              (item) =>
                item.id &&
                !primaryIds.has(item.id) &&
                item.added_by &&
                followingIds.has(item.added_by)
            )
            .map((item) => {
              const { list_item_must_try_dishes: rawDishes, ...rest } = item;
              return {
                ...rest,
                must_try_dishes: (rawDishes ?? []).map((d) => ({
                  ...d,
                  display_label: d.label ?? '',
                })),
                contributor_review:
                  reviewsByKey.get(`${item.added_by}:${item.restaurant_id}`) ?? null,
              };
            });
          const mergedMentions = [...(listItems ?? []), ...supplement];
          const circleMentions = filterListMentionsToFollowsOnly(
            mergedMentions,
            userId,
            followingIds
          );
          const feedMentions = filterListMentionsToSelfOrReviewBacked(circleMentions, userId);
          setSheetListMentions(feedMentions);

          if (revErr) {
            console.error('[fetchRestaurantReviews]', revErr);
            setSheetReviews([]);
          } else {
            const allowedReviewerIds = new Set([
              ...(userId ? [String(userId)] : []),
              ...followingIds,
            ]);
            setSheetReviews(
              (reviews ?? []).filter((r) => r.user_id && allowedReviewerIds.has(String(r.user_id)))
            );
          }
        }
      } finally {
        if (showLoading && !isCancelled?.()) {
          setSheetFeedLoading(false);
        }
      }
    },
    [userId]
  );

  useEffect(() => {
    let cancelled = false;
    loadSheetFeedForId(selectedRestaurantId, () => cancelled);
    return () => {
      cancelled = true;
    };
  }, [selectedRestaurantId, loadSheetFeedForId]);

  useEffect(() => {
    if (!selectedRestaurantId || !userId) {
      setSheetFollowCircle(null);
      setSheetFollowCircleLoading(false);
      return undefined;
    }
    let cancelled = false;
    setSheetFollowCircle(null);
    setSheetFollowCircleLoading(true);
    fetchFollowCircleForRestaurant(selectedRestaurantId).then(({ circle, error }) => {
      if (cancelled) return;
      setSheetFollowCircleLoading(false);
      if (error) {
        console.warn('[useRestaurantMapSheet] fetchFollowCircleForRestaurant:', error);
        setSheetFollowCircle(null);
        return;
      }
      setSheetFollowCircle(circle);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedRestaurantId, userId]);

  const refetchSheetReviews = useCallback(() => {
    if (selectedRestaurantId) {
      return loadSheetFeedForId(selectedRestaurantId, () => false, { showLoading: false });
    }
    setSheetReviews([]);
    setSheetListMentions([]);
    return Promise.resolve();
  }, [selectedRestaurantId, loadSheetFeedForId]);

  const sheetRestaurant = useMemo(
    () => buildSheetRestaurantFromMapPlace(selectedRow, tagCatalog, { tagCatalogLoaded }),
    [selectedRow, tagCatalog, tagCatalogLoaded]
  );

  const selectedSavedListIds =
    selectedRow?.id != null ? (savedListIdsByRestaurant[String(selectedRow.id)] ?? []) : [];
  /**
   * True while we don't yet know whether the selected pin is on any of the
   * viewer's lists. Drives a skeleton on the bookmark toolbar icon so it
   * doesn't flash from neutral → orange when the membership lookup lands.
   */
  const selectedSavedListIdsLoading =
    !!userId &&
    selectedRow?.id != null &&
    !savedMapComplete &&
    !hydratedSavedListIds.has(String(selectedRow.id));

  return {
    /** Tag catalog (filters + subtitles + sheet tags). */
    tagCatalog,
    /** False until the tag catalog fetch resolves — surfaces skeleton chips in the sheet detail view. */
    tagCatalogLoaded,
    /** Selected pin row from `places` (for `DashboardMapCanvas` `mapSelectedRow`). */
    selectedRow,
    sheetRestaurant,
    sheetReviews,
    sheetListMentions,
    sheetFeedLoading,
    sheetFollowCircle,
    sheetFollowCircleLoading,
    selectedSavedListIds,
    selectedSavedListIdsLoading,
    /** List membership per restaurant id for visible pins (map sheet spot list actions). */
    savedListIdsByRestaurant,
    /** List id → `{ name, cover_image_url }` for pins the user has on lists (sheet list row rings). */
    listMetaById,
    /** Restaurant id → followed users who have it on their list. */
    followingOwnersByRestaurant,
    /** True while fetching {@link followingOwnersByRestaurant} for visible places. */
    followingOwnersLoading,
    refetchSheetReviews,
    /** Refetch which lists each visible place is on (after save, etc.). */
    refreshSavedForPlaces,
  };
}
