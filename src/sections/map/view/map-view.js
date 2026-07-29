'use client';

import dynamic from 'next/dynamic';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Popover from '@mui/material/Popover';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter, useSearchParams } from 'src/routes/hooks';

import { groupRestaurantTagsByCategory } from 'src/utils/restaurant-tag-groups';
import {
  USER_SCOPED_KEYS,
  clientScopedGetJson,
  clientScopedSetJson,
  clientScopedRemoveJson,
} from 'src/utils/user-scoped-storage';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { useAuthContext } from 'src/auth/hooks';
import { NAV, MAPBOX_API } from 'src/config-global';
import { RADIUS, tabularNumsSx } from 'src/theme/spacing';
import { useAnalytics } from 'src/libs/analytics/analytics-provider';
import { hoverable, finePointerHover } from 'src/theme/overrides/hoverable';
import { searchRestaurantsFromNaturalLanguage } from 'src/auth/actions/restaurant-search-agent-actions';
import {
  useMapOwnedLists,
  useMapFollowingLists,
  useMapCollaboratorLists,
} from 'src/api/map-dropdown-lists';
import {
  fetchRestaurantsInBbox,
  fetchLocationLocalities,
  fetchUserHomeLocalityId,
  searchRestaurantsByName,
  fetchRestaurantPinsInBbox,
} from 'src/auth/actions/location-actions';
import {
  fetchSavedRestaurantsForMap,
  fetchFollowingRestaurantsForMap,
  fetchSavedRestaurantsForMapByListIds,
  fetchFollowingRestaurantsForMapByListIds,
} from 'src/auth/actions/list-actions';

import Iconify from 'src/components/iconify';
import SearchAiToggleAdornment from 'src/components/search-ai-toggle';
import { ScrollableChipRow } from 'src/components/horizontal-scroll-row';
import DashboardSearchFilterRow from 'src/components/dashboard-search-filter-row';
import { scrollableChipPillButtonSx } from 'src/components/scrollable-chip-select';

import { SettingsDrillShell } from 'src/sections/profile/view';
import MapTagFilterSheet from 'src/sections/map/map-tag-filter-sheet';
import MapSpotSheetInner from 'src/sections/map/map-spot-sheet-inner';
import MapSearchSuggestions from 'src/sections/map/map-search-suggestions';
import { NlSearchLoadingCard } from 'src/sections/map/nl-search-loading-card';
import { useMapMobileSpotSheet } from 'src/sections/map/use-map-mobile-spot-sheet';
import { shouldDeferInitialBboxFetch } from 'src/sections/map/map-initial-fetch-gate';
import { MapMobileSpotSheetShell } from 'src/sections/map/map-mobile-spot-sheet-shell';
import { useMapSheetViewerIdentity } from 'src/sections/map/use-map-sheet-viewer-identity';
import { spotIdEq, useRestaurantMapSheet } from 'src/sections/map/use-restaurant-map-sheet';
import {
  writeDefaultMapPins,
  readPersistedDefaultMapPins,
} from 'src/sections/map/map-default-prefetch';
import {
  prepareMapSheetPlaces,
  sortMapSheetPlacesByRecency,
} from 'src/sections/map/map-spot-sheet-helpers';
import {
  MAP_VIEW_BBOX,
  MAP_VIEW_DETAIL_MAX,
  MAP_VIEW_PINS_LIMIT,
  MAP_VIEW_FETCH_LIMIT,
  ROULETTE_PREVIEW_BBOX,
} from 'src/sections/roulette/constants';
import {
  parseMapChipPrefs,
  parseMapFilterPrefs,
  parseMapSelectedSpot,
  clampMapListPanelWidth,
  compactMapSelectedSpotRow,
} from 'src/sections/map/map-storage-prefs';

const DEFAULT_MAP_REF_CENTER = {
  lat: (ROULETTE_PREVIEW_BBOX.south + ROULETTE_PREVIEW_BBOX.north) / 2,
  lng: (ROULETTE_PREVIEW_BBOX.west + ROULETTE_PREVIEW_BBOX.east) / 2,
};

const SEARCH_LOADING_KEYS = [
  'pages.dashboard.discover.search_loading_1',
  'pages.dashboard.discover.search_loading_2',
  'pages.dashboard.discover.search_loading_3',
  'pages.dashboard.discover.search_loading_4',
  'pages.dashboard.discover.search_loading_5',
];

// ----------------------------------------------------------------------

const DashboardMapCanvas = dynamic(() => import('./dashboard-map-canvas'), { ssr: false });

/**
 * Locality rows come from `list_location_localities` (the same catalog the discover market picker
 * uses): `{ id, locality_name, state_name, country_name, latitude, longitude, ... }`.
 * @param {Record<string, unknown>} row
 */
function localityRowLabel(row) {
  if (!row || typeof row !== 'object') return '';
  return String(row.locality_name ?? '').trim();
}

/** Secondary line for a locality suggestion — state / country, de-duped against the label. */
function localityRowRegion(row) {
  if (!row || typeof row !== 'object') return '';
  const label = localityRowLabel(row).toLowerCase();
  const parts = [row.state_name, row.country_name]
    .map((p) => String(p ?? '').trim())
    .filter((p) => p && p.toLowerCase() !== label);
  return [...new Set(parts)].join(', ');
}

/** WGS84 centroid for a locality row, or null when the catalog row lacks coordinates. */
function localityRowCentroid(row) {
  if (!row || typeof row !== 'object') return null;
  const lat = Number(row.latitude);
  const lng = Number(row.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

/**
 * The primary tag slugs an AI search plan filtered on — `mustTagSlugs`, or `shouldTagSlugs` when
 * there are no must tags (mirrors the agent's own `primary` selection). Validated against the
 * provided catalog slug set so we never surface a filter chip the UI can't render.
 * @param {Record<string, unknown> | null | undefined} plan
 * @param {Set<string>} allowedSlugSet
 * @returns {string[]}
 */
function planPrimaryTagSlugs(plan, allowedSlugSet) {
  if (!plan || typeof plan !== 'object') return [];
  const clean = (arr) =>
    Array.isArray(arr)
      ? [...new Set(arr.map((s) => String(s).trim()).filter((s) => s && allowedSlugSet.has(s)))]
      : [];
  const must = clean(plan.mustTagSlugs);
  return must.length ? must : clean(plan.shouldTagSlugs);
}

/** Clamp a plan's `minRating` to the map filter's domain (0–5, half-star steps). */
function clampPlanMinRating(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(5, Math.round(value * 2) / 2));
}

/** Order-insensitive equality for two slug arrays. */
function sameSlugSet(a, b) {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

/**
 * Half-span (deg) of the bbox an AI search uses when scoped to a picked locality centroid.
 * ~0.18° ≈ 20 km, so the box spans ~40 km — a city plus its near surroundings.
 */
const AI_LOCATION_BBOX_PAD_DEG = 0.18;

/** Axis-aligned bbox padded by `padDeg` around a WGS84 point. */
function bboxAroundPoint(lat, lng, padDeg) {
  return { west: lng - padDeg, south: lat - padDeg, east: lng + padDeg, north: lat + padDeg };
}

/**
 * Intersect a bbox with the searchable region so a viewport panned off Portugal can't scope an
 * AI search to empty ocean. Returns null when the two don't overlap (caller falls back to region).
 */
function clampBboxToRegion(bbox, region) {
  if (!bbox || !region) return null;
  const west = Math.max(bbox.west, region.west);
  const south = Math.max(bbox.south, region.south);
  const east = Math.min(bbox.east, region.east);
  const north = Math.min(bbox.north, region.north);
  if (west >= east || south >= north) return null;
  return { west, south, east, north };
}

/** True when `bbox` already covers the whole searchable region (so widening would be a no-op). */
function bboxCoversRegion(bbox, region) {
  if (!bbox || !region) return false;
  return (
    bbox.west <= region.west &&
    bbox.south <= region.south &&
    bbox.east >= region.east &&
    bbox.north >= region.north
  );
}

export default function MapView() {
  const theme = useTheme();
  const { t } = useTranslate();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, supabase, loading: authLoading } = useAuthContext();
  const { trackEvent } = useAnalytics();
  const userId = user?.id ?? null;
  const { avatarUrl: viewerAvatarUrl, displayName: viewerDisplayName } = useMapSheetViewerIdentity(
    user,
    supabase
  );

  /** Let the mobile spot sheet (below the modal z-index) receive taps while a list picker is open. */
  const mapChipListPickerPopoverSlotProps = useMemo(
    () => ({
      root: { sx: { pointerEvents: 'none' } },
      paper: {
        sx: {
          pointerEvents: 'auto',
          mt: 0.75,
          borderRadius: 2,
          minWidth: 260,
          maxWidth: 340,
          maxHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        },
      },
    }),
    []
  );

  const {
    isMobileSheet,
    sheetSnapBounds,
    sheetHeightPx,
    setSheetHeightPx,
    sheetExpandedMobile,
    mobileSheetHeightTransition,
    onSheetHandlePointerDown,
    onSheetHandlePointerMove,
    endSheetDrag,
    glassPanelSx: glassPanel,
  } = useMapMobileSpotSheet({ bottomInsetPx: NAV.H_MOBILE_BOTTOM });

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    // 120ms keeps pin updates + autocomplete fetch responsive without firing on every
    // keystroke. Matches Google Maps' perceived snappiness.
    const id = setTimeout(() => setDebouncedQuery(query.trim()), 120);
    return () => clearTimeout(id);
  }, [query]);

  /**
   * Portugal-wide name typeahead — runs in parallel with the viewport fetch so the dropdown
   * can show matches outside the current map view. Independent state so the suggestions
   * list never blocks pin updates.
   */
  const [nameSuggestions, setNameSuggestions] = useState(
    /** @type {Array<Record<string, unknown>>} */ ([])
  );
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [nameSuggestionsLoading, setNameSuggestionsLoading] = useState(false);
  const searchAnchorRef = useRef(null);

  /**
   * Which kind of search the bar performs. `'places'` is the Google Maps–style name/area
   * typeahead that filters the pins live; `'ai'` hands the query to the natural-language agent
   * (`handleMapNlSearch`). The two were previously blended into one bar (typing filtered, Enter
   * fired AI) which gave the user no way to tell or pick what they were doing.
   * @type {['places' | 'ai', Function]}
   */
  const [searchMode, setSearchMode] = useState(/** @type {'places' | 'ai'} */ ('places'));
  const isAiSearchMode = searchMode === 'ai';

  /**
   * Locality catalog for the "Locations" section of the typeahead. Loaded once (lazily, on the
   * first non-empty query in places mode) and filtered client-side — the same heavy-but-cached
   * catalog the discover market picker uses, so no extra RPC surface is needed.
   */
  const [localityCatalog, setLocalityCatalog] = useState(
    /** @type {Array<Record<string, unknown>>} */ ([])
  );
  const localityCatalogFetchedRef = useRef(false);
  /** Flips true on the first places-mode query and stays true, so the catalog loads exactly once. */
  const [shouldLoadLocalities, setShouldLoadLocalities] = useState(false);

  /**
   * A locality the user picked from the "Locations" section. Drives a camera fly to its centroid
   * (no spot sheet — it isn't a restaurant). `locationFlyTick` keeps the fly key unique on re-pick.
   * While set, the query box shows the locality name but it is NOT used as the restaurant
   * name filter (see `effectiveRestaurantSearch`) — otherwise the map would filter pins to
   * restaurants literally named e.g. "Lisboa".
   */
  const [pickedLocation, setPickedLocation] = useState(
    /** @type {{ id: string, label: string, lat: number, lng: number } | null} */ (null)
  );
  const [locationFlyTick, setLocationFlyTick] = useState(0);

  useEffect(() => {
    const q = debouncedQuery;
    if (!q || isAiSearchMode) {
      // AI mode hides the typeahead — skip the fetch entirely instead of querying on each keystroke.
      setNameSuggestions([]);
      setNameSuggestionsLoading(false);
      return undefined;
    }
    let cancelled = false;
    setNameSuggestionsLoading(true);
    searchRestaurantsByName(q, { limit: 25 })
      .then(({ restaurants, error }) => {
        if (cancelled) return;
        if (error) {
          console.warn('[MapView] searchRestaurantsByName:', error);
          setNameSuggestions([]);
        } else {
          setNameSuggestions(restaurants ?? []);
        }
      })
      .finally(() => {
        if (!cancelled) setNameSuggestionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, isAiSearchMode]);

  // Arm the one-time catalog load on the first places-mode query. This is a cheap flag flip; the
  // actual fetch lives in its own effect so a fast typist's keystrokes can't cancel the (slow,
  // fully-paged) catalog request mid-flight.
  useEffect(() => {
    if (!isAiSearchMode && debouncedQuery) setShouldLoadLocalities(true);
  }, [isAiSearchMode, debouncedQuery]);

  // Lazy-load the locality catalog once, then filter client-side below. Depends only on the stable
  // `shouldLoadLocalities` flag, so it runs a single time and its cleanup fires only on unmount.
  useEffect(() => {
    if (!shouldLoadLocalities || localityCatalogFetchedRef.current) return undefined;
    localityCatalogFetchedRef.current = true;
    let cancelled = false;
    fetchLocationLocalities().then(({ locations, error }) => {
      if (cancelled) return;
      if (error) {
        console.warn('[MapView] fetchLocationLocalities:', error);
        localityCatalogFetchedRef.current = false; // allow a later retry
        setShouldLoadLocalities(false);
        return;
      }
      setLocalityCatalog(Array.isArray(locations) ? locations : []);
    });
    return () => {
      cancelled = true;
    };
  }, [shouldLoadLocalities]);

  /** Locality matches for the "Locations" typeahead section (name/region prefix-ish match). */
  const locationSuggestions = useMemo(() => {
    const q = debouncedQuery.toLowerCase().trim();
    if (isAiSearchMode || !q || !localityCatalog.length) return [];
    const rankRow = (row) => {
      if (!localityRowCentroid(row)) return null; // need coords to fly there
      const label = localityRowLabel(row).toLowerCase();
      if (!label) return null;
      if (label === q) return { row, rank: 0, label };
      if (label.startsWith(q)) return { row, rank: 1, label };
      if (label.includes(q)) return { row, rank: 2, label };
      if (localityRowRegion(row).toLowerCase().includes(q)) return { row, rank: 3, label };
      return null;
    };
    const scored = localityCatalog.map(rankRow).filter(Boolean);
    scored.sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label));
    return scored.slice(0, 5).map((s) => {
      const c = localityRowCentroid(s.row);
      return {
        id: String(s.row.id),
        label: localityRowLabel(s.row),
        region: localityRowRegion(s.row),
        lat: c.lat,
        lng: c.lng,
      };
    });
  }, [debouncedQuery, localityCatalog, isAiSearchMode]);

  const [savedActive, setSavedActive] = useState(false);
  const [followingActive, setFollowingActive] = useState(false);
  const [minRatingFilter, setMinRatingFilter] = useState(0);
  // Evaluated in SQL, not here: map rows have `hours_parsed` stripped before they reach the
  // client, so unlike every other filter on this view there is nothing local to filter on.
  const [openNowFilter, setOpenNowFilter] = useState(false);
  const [mapSortMode, setMapSortMode] = useState(
    /** @type {'relevance' | 'distance'} */ ('distance')
  );
  const [mapRefPoint, setMapRefPoint] = useState(() => ({ ...DEFAULT_MAP_REF_CENTER }));
  /**
   * The user's real GPS location, captured when they tap the map's "current location" button.
   * Once set, it anchors distance sorting to where the user actually is — overriding the map
   * center (`mapRefPoint`), which otherwise drifts to follow every pan/zoom.
   */
  const [userGeoLocation, setUserGeoLocation] = useState(
    /** @type {{ lat: number, lng: number } | null} */ (null)
  );
  /**
   * Last GPS fix obtained by an AI search, cached so repeat searches don't re-prompt. Kept
   * separate from `userGeoLocation` (the explicit "locate" capture) so an AI search never
   * silently re-anchors distance sorting.
   */
  const aiGeoFixRef = useRef(/** @type {{ lat: number, lng: number } | null} */ (null));
  /**
   * Two-bbox model implementing Google Maps' "Search this area" pattern.
   *
   * `fetchedBbox` is the bbox the current results correspond to — it's what the fetch uses, and
   * it only changes when the user explicitly taps the "Search this area" button (or on initial
   * mount). `pendingBbox` is the live viewport from the map; it updates after every pan/zoom
   * but does NOT trigger a refetch. When the two diverge enough, the floating button appears
   * so the user can opt in to fresh results — matching Google Maps' behaviour exactly.
   */
  const [fetchedBbox, setFetchedBbox] = useState(ROULETTE_PREVIEW_BBOX);
  const [pendingBbox, setPendingBbox] = useState(ROULETTE_PREVIEW_BBOX);
  /** First emit from `onLoad` syncs both bboxes so the initial fetch uses real map bounds
   * (matters when persistedViewState restores the user to a previously-zoomed area). */
  const hasReceivedInitialBoundsRef = useRef(false);
  /** Imperative handle into the map canvas for reading its live viewport bounds on demand. */
  const mapBoundsApiRef = useRef(
    /** @type {{ getBounds: () => ({west:number,south:number,east:number,north:number}|null) } | null} */ (
      null
    )
  );
  /**
   * State mirror of the ref above. The ref guards the one-time `fetchedBbox` sync (read
   * synchronously inside the bounds callback); this state gates the *initial fetch* so it
   * holds until the map's real bounds land — otherwise we fetch the stale preview bbox first
   * and refetch the moment `onLoad` syncs the real bounds (the "searches twice on open" bug).
   */
  const [hasReceivedInitialBounds, setHasReceivedInitialBounds] = useState(false);
  const [bboxPlaces, setBboxPlaces] = useState([]);
  /**
   * Lean pins for the map canvas (id/name/lat/lng/rating/sponsored) from `restaurants_in_bbox_pins`.
   * Unlike `bboxPlaces` (bounded for the detail sheet), this returns *every* pin in view so Mapbox
   * clustering reports true counts and zooming in reveals more — not a misleading 80-row slice.
   */
  // Seed from the cross-mount prefetch cache (sessionStorage / module memory) so the map draws
  // pins on the very first paint instead of waiting on the world-bbox round-trip. The precise
  // fetch below still runs and replaces these (stale-while-revalidate) — seamless since the
  // coordinates are identical.
  const [pinPlaces, setPinPlaces] = useState(() => readPersistedDefaultMapPins() ?? []);
  /**
   * True if the lean pins RPC errored (e.g. `restaurants_in_bbox_pins` not yet deployed). The
   * canvas then falls back to the bounded `sourcePlaces` so the map still shows pins instead of
   * going empty — makes this change safe to ship ahead of the migration.
   */
  const [pinsErrored, setPinsErrored] = useState(false);
  /**
   * How many detailed rows to fetch for the scrollable spot list. Grows by `MAP_VIEW_FETCH_LIMIT`
   * when the user taps "load more" (up to `MAP_VIEW_DETAIL_MAX`); resets to one page when the
   * area/filters change. The map pins are independent of this.
   */
  const [detailLimit, setDetailLimit] = useState(MAP_VIEW_FETCH_LIMIT);
  /** Home locality UUID from `users.home_locality_id`. Passed to bbox RPC for sponsor match. */
  const [homeLocalityId, setHomeLocalityId] = useState(/** @type {string | null} */ (null));
  const [homeLocalityReady, setHomeLocalityReady] = useState(false);

  useEffect(() => {
    if (authLoading) {
      setHomeLocalityReady(false);
      return undefined;
    }
    if (!userId) {
      setHomeLocalityId(null);
      setHomeLocalityReady(true);
      return undefined;
    }
    let cancelled = false;
    setHomeLocalityReady(false);
    fetchUserHomeLocalityId().then(({ localityId }) => {
      if (!cancelled) {
        setHomeLocalityId(localityId ?? null);
        setHomeLocalityReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [userId, authLoading]);
  const [bboxLoading, setBboxLoading] = useState(true);
  const [mapNlOverride, setMapNlOverride] = useState(
    /** @type {Array<Record<string, unknown>> | null} */ (null)
  );
  /**
   * Lets an AI search apply its derived tag/rating filters to the filter UI without the
   * "filters changed → drop the AI override" effect immediately wiping the results it just set.
   */
  const skipNextNlOverrideClearRef = useRef(false);
  const [mapNlLoading, setMapNlLoading] = useState(false);
  const [mapNlLoadingStep, setMapNlLoadingStep] = useState(0);
  const [mapNlSearchError, setMapNlSearchError] = useState(/** @type {string | null} */ (null));
  const [selectedTagSlugs, setSelectedTagSlugs] = useState([]);
  const [tagFilterSheetOpen, setTagFilterSheetOpen] = useState(
    () => (searchParams?.get?.('filters') ?? null) === 'open'
  );
  const [savedListPlaces, setSavedListPlaces] = useState([]);
  const [savedListLoading, setSavedListLoading] = useState(false);
  const [savedPlacesTick, setSavedPlacesTick] = useState(0);
  const [followingListPlaces, setFollowingListPlaces] = useState([]);
  const [followingListLoading, setFollowingListLoading] = useState(false);
  const { lists: followingLists, loading: followingListsLoading } = useMapFollowingLists(userId);
  const { lists: savedOwnedLists, loading: savedOwnedListsLoading } = useMapOwnedLists(userId);
  const { lists: savedSharedLists, loading: savedSharedListsLoading } =
    useMapCollaboratorLists(userId);
  // 'all' = all followed lists; Set = specific IDs (empty = none selected)
  const [selectedFollowingListIds, setSelectedFollowingListIds] = useState(
    /** @type {'all' | Set<string>} */ ('all')
  );
  // 'all' = saved_restaurants_for_map (all readable lists); Set = owned list IDs only
  const [selectedSavedMapListIds, setSelectedSavedMapListIds] = useState(
    /** @type {'all' | Set<string>} */ ('all')
  );
  const [followingMenuOpen, setFollowingMenuOpen] = useState(false);
  const followingChipRef = useRef(null);
  const [savedMenuOpen, setSavedMenuOpen] = useState(false);
  const savedChipRef = useRef(null);
  const [detailId, setDetailId] = useState(null);
  const [pinHighlightId, setPinHighlightId] = useState(null);

  const [mapFilterSegA, mapFilterSegB] = USER_SCOPED_KEYS.mapFilterPrefs;
  const [mapChipSegA, mapChipSegB] = USER_SCOPED_KEYS.mapChipPrefs;
  const [mapListPanelSegA, mapListPanelSegB] = USER_SCOPED_KEYS.mapListPanelWidth;
  const [mapSelectedSegA, mapSelectedSegB] = USER_SCOPED_KEYS.mapSelectedSpot;
  const skipNextMapFilterPersistRef = useRef(false);
  const skipNextMapChipPersistRef = useRef(false);
  const skipNextMapSelectedSpotPersistRef = useRef(false);
  const pendingRestoredSelectionSheetRef = useRef(false);
  const listPanelWidthRef = useRef(400);
  const [listPanelWidthPx, setListPanelWidthPx] = useState(380);
  const [asideResizing, setAsideResizing] = useState(false);
  const asideResizeStartRef = useRef({ x: 0, w: 380 });

  useEffect(() => {
    listPanelWidthRef.current = listPanelWidthPx;
  }, [listPanelWidthPx]);

  useEffect(() => {
    const raw = clientScopedGetJson(userId, mapListPanelSegA, mapListPanelSegB);
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      setListPanelWidthPx(clampMapListPanelWidth(raw));
      return;
    }
    if (typeof window === 'undefined') return;
    const w = window.innerWidth;
    let bw = 380;
    if (w >= theme.breakpoints.values.xl) {
      bw = 420;
    } else if (w >= theme.breakpoints.values.lg) {
      bw = 400;
    }
    setListPanelWidthPx(clampMapListPanelWidth(bw));
  }, [
    userId,
    mapListPanelSegA,
    mapListPanelSegB,
    theme.breakpoints.values.lg,
    theme.breakpoints.values.xl,
  ]);

  useEffect(() => {
    const onWinResize = () => {
      setListPanelWidthPx((w) => clampMapListPanelWidth(w));
    };
    window.addEventListener('resize', onWinResize);
    return () => window.removeEventListener('resize', onWinResize);
  }, []);

  useEffect(() => {
    if (!asideResizing) return undefined;
    const onMove = (e) => {
      const dx = e.clientX - asideResizeStartRef.current.x;
      /* Divider is the list's *left* edge: drag right → list narrows; drag left → widens. */
      const next = asideResizeStartRef.current.w - dx;
      const clamped = clampMapListPanelWidth(next);
      listPanelWidthRef.current = clamped;
      setListPanelWidthPx(clamped);
    };
    const onUp = () => {
      setAsideResizing(false);
      clientScopedSetJson(userId, mapListPanelSegA, mapListPanelSegB, listPanelWidthRef.current);
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [asideResizing, userId, mapListPanelSegA, mapListPanelSegB]);

  const onListPanelResizePointerDown = useCallback(
    (e) => {
      if (!e.isPrimary || e.button !== 0) return;
      e.preventDefault();
      asideResizeStartRef.current = { x: e.clientX, w: listPanelWidthPx };
      setAsideResizing(true);
    },
    [listPanelWidthPx]
  );

  useEffect(() => {
    const raw = clientScopedGetJson(userId, mapFilterSegA, mapFilterSegB);
    const prefs = parseMapFilterPrefs(raw);
    const urlTagsParam = searchParams?.get?.('tags') ?? null;
    const urlTagSlugs = urlTagsParam
      ? urlTagsParam
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    if (urlTagSlugs.length > 0) {
      // URL-driven entry (e.g. from a Discover vibe chip): override and persist.
      setSelectedTagSlugs(urlTagSlugs);
    } else {
      skipNextMapFilterPersistRef.current = true;
      setSelectedTagSlugs(prefs.selectedTagSlugs);
    }
    setMinRatingFilter(prefs.minRating);
    setMapSortMode(prefs.sortMode);
  }, [userId, mapFilterSegA, mapFilterSegB, searchParams]);

  useEffect(() => {
    if (skipNextMapFilterPersistRef.current) {
      skipNextMapFilterPersistRef.current = false;
      return;
    }
    clientScopedSetJson(userId, mapFilterSegA, mapFilterSegB, {
      selectedTagSlugs,
      minRating: minRatingFilter,
      sortMode: mapSortMode,
    });
  }, [userId, mapFilterSegA, mapFilterSegB, selectedTagSlugs, minRatingFilter, mapSortMode]);

  useEffect(() => {
    skipNextMapChipPersistRef.current = true;
    const raw = clientScopedGetJson(userId, mapChipSegA, mapChipSegB);
    const prefs = parseMapChipPrefs(raw);
    setSavedActive(prefs.savedActive);
    setFollowingActive(prefs.followingActive);
    setSelectedSavedMapListIds(
      prefs.selectedSavedListIds === 'all' ? 'all' : new Set(prefs.selectedSavedListIds)
    );
    setSelectedFollowingListIds(
      prefs.selectedFollowingListIds === 'all' ? 'all' : new Set(prefs.selectedFollowingListIds)
    );
  }, [userId, mapChipSegA, mapChipSegB]);

  useEffect(() => {
    if (skipNextMapChipPersistRef.current) {
      skipNextMapChipPersistRef.current = false;
      return;
    }
    clientScopedSetJson(userId, mapChipSegA, mapChipSegB, {
      savedActive,
      followingActive,
      selectedSavedListIds:
        selectedSavedMapListIds === 'all' ? 'all' : [...selectedSavedMapListIds],
      selectedFollowingListIds:
        selectedFollowingListIds === 'all' ? 'all' : [...selectedFollowingListIds],
    });
  }, [
    userId,
    mapChipSegA,
    mapChipSegB,
    savedActive,
    followingActive,
    selectedSavedMapListIds,
    selectedFollowingListIds,
  ]);

  const searchLoadingPhrases = useMemo(() => SEARCH_LOADING_KEYS.map((key) => t(key)), [t]);

  useEffect(() => {
    if (!mapNlLoading) {
      setMapNlLoadingStep(0);
      return undefined;
    }
    setMapNlLoadingStep(0);
    const id = setInterval(() => {
      setMapNlLoadingStep((s) => Math.min(s + 1, SEARCH_LOADING_KEYS.length - 1));
    }, 2400);
    return () => clearInterval(id);
  }, [mapNlLoading]);

  // A manual filter change returns the map to normal (filtered) browsing by dropping the AI
  // result override. The skip flag exempts the AI's own filter application (see `handleMapNlSearch`).
  useEffect(() => {
    if (skipNextNlOverrideClearRef.current) {
      skipNextNlOverrideClearRef.current = false;
      return;
    }
    setMapNlOverride(null);
  }, [selectedTagSlugs, minRatingFilter, mapSortMode]);

  // Distance sorting anchors to the user's real GPS location once they've used "current
  // location"; otherwise it falls back to the center of the *fetched* area — the bbox the
  // displayed results correspond to. It must NOT use the live map center (`mapRefPoint`),
  // which drifts on every pan/zoom: feeding that into the sort ref leaked the live viewport
  // into `filterRequestKey` → `bboxRequestKey`, refetching on every pan and defeating the
  // "Search this area" design (the "map keeps searching for no reason" bug). `fetchedBbox`
  // only changes on initial load and when the user taps "Search this area", so the sort ref —
  // and the fetch — sit still until the user explicitly opts in.
  const fetchedBboxCenterLat = (fetchedBbox.south + fetchedBbox.north) / 2;
  const fetchedBboxCenterLng = (fetchedBbox.west + fetchedBbox.east) / 2;
  const distanceRefLat =
    mapSortMode === 'distance' ? (userGeoLocation?.lat ?? fetchedBboxCenterLat) : null;
  const distanceRefLng =
    mapSortMode === 'distance' ? (userGeoLocation?.lng ?? fetchedBboxCenterLng) : null;

  // "Last added" (recent) is a client-side reorder of the already-loaded list, so the server
  // fetch uses the default relevance sort — the RPC has no recency mode. Toggling relevance↔recent
  // therefore reuses the same request key and never refetches.
  const mapServerSortMode = mapSortMode === 'recent' ? 'relevance' : mapSortMode;

  /**
   * The query text used as the restaurant name/address filter. Empty unless the user is actively
   * doing a places search:
   * - In AI mode the query is a natural-language prompt, not a name filter — live-filtering the
   *   pins to a half-typed sentence would empty the map until the user submits to the agent.
   * - When a locality is picked (`pickedLocation`), the query box holds the locality name purely
   *   for display; feeding it to the filter would show only restaurants literally named after the
   *   place. Typing anything clears `pickedLocation` (see the search `onChange`).
   */
  const effectiveRestaurantSearch = isAiSearchMode || pickedLocation ? '' : debouncedQuery;

  /**
   * Shared filter slice — tags, search, rating, sort, distance ref. Used by saved/following
   * fetches which are list-scoped (NOT location-scoped) so they must not refetch on pan/zoom.
   */
  const filterRequestKey = useMemo(() => {
    const tags = [...selectedTagSlugs].sort();
    return JSON.stringify({
      t: tags,
      q: effectiveRestaurantSearch,
      r: minRatingFilter,
      s: mapServerSortMode,
      o: openNowFilter,
      ...(mapSortMode === 'distance' ? { la: distanceRefLat, lo: distanceRefLng } : {}),
    });
  }, [
    selectedTagSlugs,
    effectiveRestaurantSearch,
    minRatingFilter,
    mapServerSortMode,
    mapSortMode,
    openNowFilter,
    distanceRefLat,
    distanceRefLng,
  ]);

  /**
   * On initial load we show *every* restaurant rather than only those inside the opening
   * viewport — users expect to see the full map of spots first, then narrow. Viewport-scoping
   * (`fetchedBbox`) only kicks in once the user explicitly taps "Search this area". This stays
   * false until that first tap.
   */
  const [hasSearchedArea, setHasSearchedArea] = useState(false);

  /**
   * When the user activates any filter (tags, minimum rating, or a name search), broaden the
   * bbox fetch from the current viewport to the entire searchable region (`MAP_VIEW_BBOX`).
   * Matches the user's mental model: a filter is a question about everything matching it, not
   * just what's on screen right now — and keeps the pins consistent with the typeahead, which
   * already searches the whole region. The same broad fetch is used on initial load (before the
   * user has searched an area) so the map shows all spots up front. Once the user taps "Search
   * this area" with no filters active, the fetch ties to the viewport so we don't blow the
   * limit on a wide-open world query.
   */
  const hasActiveFilters =
    selectedTagSlugs.length > 0 ||
    minRatingFilter > 0 ||
    openNowFilter ||
    !!effectiveRestaurantSearch;
  const effectiveFetchBbox = hasActiveFilters || !hasSearchedArea ? MAP_VIEW_BBOX : fetchedBbox;

  /**
   * Bbox fetch key keys off `effectiveFetchBbox` — the bbox that the current results correspond
   * to. Panning the map updates `pendingBbox` but NOT `fetchedBbox`, so the fetch sits still
   * until the user taps "Search this area". Rounded to 4 decimals (~11m) so manually
   * re-fetching the same area twice doesn't fire two requests.
   */
  /**
   * Identity of the current area + filters (no page size). Drives the lean pins fetch and the
   * sheet's render reset, and is the basis for `bboxRequestKey`. Keeping `detailLimit` out means
   * loading more detail rows doesn't refetch the (already-complete) pin set.
   */
  const bboxAreaKey = useMemo(() => {
    const round4 = (n) => Math.round(n * 10000) / 10000;
    return JSON.stringify({
      f: filterRequestKey,
      hm: homeLocalityId ?? null,
      w: round4(effectiveFetchBbox.west),
      so: round4(effectiveFetchBbox.south),
      e: round4(effectiveFetchBbox.east),
      n: round4(effectiveFetchBbox.north),
    });
  }, [filterRequestKey, homeLocalityId, effectiveFetchBbox]);

  /** Detailed-list fetch key: area + filters + current page size (`detailLimit`). */
  const bboxRequestKey = useMemo(
    () => JSON.stringify({ a: bboxAreaKey, lim: detailLimit }),
    [bboxAreaKey, detailLimit]
  );

  // New area/filters → collapse the detailed list back to its first page.
  useEffect(() => {
    setDetailLimit(MAP_VIEW_FETCH_LIMIT);
  }, [bboxAreaKey]);

  const savedRequestKey = useMemo(
    () =>
      JSON.stringify({
        base: filterRequestKey,
        tick: savedPlacesTick,
        listIds: selectedSavedMapListIds === 'all' ? null : [...selectedSavedMapListIds].sort(),
      }),
    [filterRequestKey, savedPlacesTick, selectedSavedMapListIds]
  );

  const followingRequestKey = useMemo(() => {
    const listIds =
      selectedFollowingListIds === 'all' ? null : [...selectedFollowingListIds].sort();
    return JSON.stringify({ base: filterRequestKey, listIds });
  }, [filterRequestKey, selectedFollowingListIds]);

  /**
   * In-memory LRU cache of recent bbox fetch results, keyed by `bboxRequestKey`.
   * Matches Google Maps' instant-back behaviour: panning to a previously-fetched area + tapping
   * "Search this area" reuses the cached results without a network round-trip. Capped at 8
   * entries so memory stays bounded; survives for the lifetime of the MapView mount.
   */
  const bboxResultCacheRef = useRef(
    /** @type {Map<string, Array<Record<string, unknown>>>} */ (new Map())
  );
  const BBOX_RESULT_CACHE_MAX = 8;

  /** LRU cache of lean pin results, keyed by `bboxAreaKey` (independent of detail page size). */
  const pinResultCacheRef = useRef(
    /** @type {Map<string, Array<Record<string, unknown>>>} */ (new Map())
  );

  useEffect(() => {
    if (
      shouldDeferInitialBboxFetch({
        homeLocalityReady,
        hasReceivedInitialBounds,
        hasMapToken: !!MAPBOX_API.accessToken,
      })
    ) {
      return undefined;
    }
    if (mapNlOverride !== null) {
      return undefined;
    }
    const cached = bboxResultCacheRef.current.get(bboxRequestKey);
    if (cached) {
      // LRU touch: move to end so the freshest hit is the last-evicted.
      bboxResultCacheRef.current.delete(bboxRequestKey);
      bboxResultCacheRef.current.set(bboxRequestKey, cached);
      setBboxPlaces(cached);
      setBboxLoading(false);
      return undefined;
    }
    let cancelled = false;
    setBboxLoading(true);
    fetchRestaurantsInBbox(
      effectiveFetchBbox.west,
      effectiveFetchBbox.south,
      effectiveFetchBbox.east,
      effectiveFetchBbox.north,
      homeLocalityId,
      detailLimit,
      {
        tagSlugs: selectedTagSlugs.length ? selectedTagSlugs : null,
        matchAll: selectedTagSlugs.length > 0,
        search: effectiveRestaurantSearch || null,
        minRating: minRatingFilter > 0 ? minRatingFilter : null,
        sort: mapServerSortMode,
        openNow: openNowFilter,
        refLat: distanceRefLat,
        refLng: distanceRefLng,
      }
    )
      .then(({ restaurants, error }) => {
        if (cancelled) return;
        if (error) {
          console.warn('[MapView] restaurants_in_bbox:', error);
        }
        const result = restaurants ?? [];
        // Cache the successful result (or empty array — still valid for that area).
        const cache = bboxResultCacheRef.current;
        cache.set(bboxRequestKey, result);
        while (cache.size > BBOX_RESULT_CACHE_MAX) {
          const oldestKey = cache.keys().next().value;
          if (oldestKey === undefined) break;
          cache.delete(oldestKey);
        }
        setBboxPlaces(result);
      })
      .finally(() => {
        if (!cancelled) {
          setBboxLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [bboxRequestKey, mapNlOverride, homeLocalityReady, hasReceivedInitialBounds]); // eslint-disable-line react-hooks/exhaustive-deps -- inputs serialized in `bboxRequestKey`

  /**
   * Lean pins fetch for the map canvas. Parallels the bbox fetch above (same key, guards, LRU)
   * but returns *every* pin in view (cap {@link MAP_VIEW_PINS_LIMIT}) with a tiny payload, so the
   * cluster layer shows true counts. The heavy bounded fetch above still drives the detail sheet.
   */
  useEffect(() => {
    if (
      shouldDeferInitialBboxFetch({
        homeLocalityReady,
        hasReceivedInitialBounds,
        hasMapToken: !!MAPBOX_API.accessToken,
      })
    ) {
      return undefined;
    }
    if (mapNlOverride !== null) {
      return undefined;
    }
    const cached = pinResultCacheRef.current.get(bboxAreaKey);
    if (cached) {
      pinResultCacheRef.current.delete(bboxAreaKey);
      pinResultCacheRef.current.set(bboxAreaKey, cached);
      setPinPlaces(cached);
      return undefined;
    }
    let cancelled = false;
    fetchRestaurantPinsInBbox(
      effectiveFetchBbox.west,
      effectiveFetchBbox.south,
      effectiveFetchBbox.east,
      effectiveFetchBbox.north,
      homeLocalityId,
      MAP_VIEW_PINS_LIMIT,
      {
        tagSlugs: selectedTagSlugs.length ? selectedTagSlugs : null,
        matchAll: selectedTagSlugs.length > 0,
        search: effectiveRestaurantSearch || null,
        minRating: minRatingFilter > 0 ? minRatingFilter : null,
        sort: mapServerSortMode,
        openNow: openNowFilter,
        refLat: distanceRefLat,
        refLng: distanceRefLng,
      }
    ).then(({ restaurants, error }) => {
      if (cancelled) return;
      if (error) {
        console.warn('[MapView] restaurants_in_bbox_pins:', error);
        setPinsErrored(true);
        return; // keep last good pins; canvas falls back to sourcePlaces
      }
      setPinsErrored(false);
      const result = restaurants ?? [];
      const cache = pinResultCacheRef.current;
      cache.set(bboxAreaKey, result);
      while (cache.size > BBOX_RESULT_CACHE_MAX) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey === undefined) break;
        cache.delete(oldestKey);
      }
      // Feed the default world-bbox result (no filters, no search, pre-"Search this area") back to
      // the cross-mount prefetch cache so the next app entry serves the freshest, viewer-accurate
      // pin set without a round-trip.
      if (!hasActiveFilters && !debouncedQuery && !hasSearchedArea) {
        writeDefaultMapPins(result);
      }
      setPinPlaces(result);
    });
    return () => {
      cancelled = true;
    };
  }, [bboxAreaKey, mapNlOverride, homeLocalityReady, hasReceivedInitialBounds]); // eslint-disable-line react-hooks/exhaustive-deps -- inputs serialized in `bboxAreaKey`

  const handleSavedChipClick = useCallback(() => {
    if (!savedActive) {
      setSavedActive(true);
      setSelectedSavedMapListIds('all');
      setSavedMenuOpen(true);
      trackEvent('map_chip_selected', { chip: 'saved' });
    } else if (savedMenuOpen) {
      setSavedMenuOpen(false);
    } else {
      setSavedMenuOpen(true);
    }
  }, [savedActive, savedMenuOpen, trackEvent]);

  const handleSavedMenuClose = useCallback(() => {
    setSavedMenuOpen(false);
  }, []);

  const handleSavedSelectAll = useCallback(() => {
    setSelectedSavedMapListIds((prev) => (prev === 'all' ? new Set() : 'all'));
  }, []);

  const handleSavedListToggle = useCallback(
    (rawListId) => {
      const listId = String(rawListId ?? '');
      if (!listId) return;
      setSelectedSavedMapListIds((prev) => {
        const allAccessibleIds = [
          ...savedOwnedLists.map((list) => String(list.id)),
          ...savedSharedLists.map((list) => String(list.id)),
        ];
        const allCount = allAccessibleIds.length;
        if (prev === 'all') {
          const next = new Set(allAccessibleIds);
          next.delete(listId);
          return next;
        }
        const next = new Set([...prev].map(String));
        if (next.has(listId)) {
          next.delete(listId);
        } else {
          next.add(listId);
          if (allCount > 0 && next.size === allCount) return 'all';
        }
        return next;
      });
    },
    [savedOwnedLists, savedSharedLists]
  );

  const handleFollowingChipClick = useCallback(() => {
    if (!followingActive) {
      setFollowingActive(true);
      setSelectedFollowingListIds('all');
      setFollowingMenuOpen(true);
      trackEvent('map_chip_selected', { chip: 'following' });
    } else if (followingMenuOpen) {
      setFollowingMenuOpen(false);
    } else {
      setFollowingMenuOpen(true);
    }
  }, [followingActive, followingMenuOpen, trackEvent]);

  const handleFollowingMenuClose = useCallback(() => {
    setFollowingMenuOpen(false);
  }, []);

  const handleFollowingSelectAll = useCallback(() => {
    setSelectedFollowingListIds((prev) => (prev === 'all' ? new Set() : 'all'));
  }, []);

  const handleFollowingListToggle = useCallback(
    (rawListId) => {
      const listId = String(rawListId ?? '');
      if (!listId) return;
      setSelectedFollowingListIds((prev) => {
        const allFollowingIds = followingLists.map((list) => String(list.id));
        if (prev === 'all') {
          const next = new Set(allFollowingIds);
          next.delete(listId);
          return next;
        }
        const next = new Set([...prev].map(String));
        if (next.has(listId)) {
          next.delete(listId);
        } else {
          next.add(listId);
          if (followingLists.length > 0 && next.size === allFollowingIds.length) return 'all';
        }
        return next;
      });
    },
    [followingLists]
  );

  /**
   * Map Following dropdown: split by visibility, then group lists by creator within each bucket.
   */
  const followingListsGrouped = useMemo(() => {
    const byPerson = (lists) => {
      /** @type {Map<string, { sortKey: string, title: string | null, lists: typeof followingLists }>} */
      const m = new Map();
      lists.forEach((list) => {
        const username = list.owner_username ? String(list.owner_username).trim() : '';
        const display = list.owner_display_name ? String(list.owner_display_name).trim() : '';
        const key = username || display || String(list.id);
        const title = display || username || null;
        const sortKey = (display || username || key).toLowerCase();
        let entry = m.get(key);
        if (!entry) {
          entry = { sortKey, title, lists: [] };
          m.set(key, entry);
        }
        entry.lists.push(list);
      });
      return [...m.values()]
        .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
        .map((g) => ({
          ...g,
          lists: [...g.lists].sort((a, b) => {
            const ta = a.updated_at ? new Date(String(a.updated_at)).getTime() : 0;
            const tb = b.updated_at ? new Date(String(b.updated_at)).getTime() : 0;
            return tb - ta;
          }),
        }));
    };
    const publicLists = followingLists.filter((list) => list?.visibility !== 'public_subscribers');
    const subscriptionLists = followingLists.filter(
      (list) => list?.visibility === 'public_subscribers'
    );
    return {
      publicByPerson: byPerson(publicLists),
      subscriptionByPerson: byPerson(subscriptionLists),
    };
  }, [followingLists]);

  /**
   * Dropdown lists are loaded via SWR (`useMapOwnedLists` / collaborator / following)
   * so remounts and sibling consumers share one request. Drop persisted selection IDs
   * the viewer no longer has access to once owned + shared lists have loaded.
   */
  useEffect(() => {
    if (savedOwnedListsLoading || savedSharedListsLoading) return;
    const validIds = new Set([
      ...savedOwnedLists.map((l) => String(l.id)),
      ...savedSharedLists.map((l) => String(l.id)),
    ]);
    setSelectedSavedMapListIds((prev) => {
      if (prev === 'all') return prev;
      const next = new Set([...prev].filter((id) => validIds.has(String(id))));
      if (next.size === prev.size) return prev;
      return next;
    });
  }, [savedOwnedLists, savedSharedLists, savedOwnedListsLoading, savedSharedListsLoading]);

  /** Owned + collaborator lists for SaveToListSheet — same merge as the Saved chip popover. */
  const preloadedSaveSheetLists = useMemo(() => {
    const seen = new Set();
    return [...savedOwnedLists, ...savedSharedLists].reduce((acc, list) => {
      if (list?.id == null) return acc;
      const id = String(list.id);
      if (seen.has(id)) return acc;
      seen.add(id);
      acc.push(list);
      return acc;
    }, []);
  }, [savedOwnedLists, savedSharedLists]);

  const preloadedSaveSheetListsReady = !savedOwnedListsLoading && !savedSharedListsLoading;

  // Prune following-list chip selection when the followed-lists catalog updates.
  useEffect(() => {
    if (followingListsLoading) return;
    const validIds = new Set(followingLists.map((l) => String(l.id)));
    setSelectedFollowingListIds((prev) => {
      if (prev === 'all') return prev;
      const next = new Set([...prev].filter((id) => validIds.has(String(id))));
      if (next.size === prev.size) return prev;
      return next;
    });
  }, [followingLists, followingListsLoading]);

  const handleMapViewportCenter = useCallback((coords) => {
    if (
      typeof coords?.latitude === 'number' &&
      Number.isFinite(coords.latitude) &&
      typeof coords?.longitude === 'number' &&
      Number.isFinite(coords.longitude)
    ) {
      setMapRefPoint({ lat: coords.latitude, lng: coords.longitude });
    }
  }, []);

  /** User tapped the map's "current location" button and a GPS fix landed. */
  const handleUserLocate = useCallback((coords) => {
    if (
      typeof coords?.latitude === 'number' &&
      Number.isFinite(coords.latitude) &&
      typeof coords?.longitude === 'number' &&
      Number.isFinite(coords.longitude)
    ) {
      setUserGeoLocation({ lat: coords.latitude, lng: coords.longitude });
    }
  }, []);

  const handleMapViewportBounds = useCallback((bounds) => {
    if (
      !bounds ||
      !Number.isFinite(bounds.west) ||
      !Number.isFinite(bounds.south) ||
      !Number.isFinite(bounds.east) ||
      !Number.isFinite(bounds.north)
    ) {
      return;
    }
    const next = {
      west: bounds.west,
      south: bounds.south,
      east: bounds.east,
      north: bounds.north,
    };
    const bboxEq = (a, b) =>
      a.west === b.west && a.south === b.south && a.east === b.east && a.north === b.north;
    setPendingBbox((prev) => (bboxEq(prev, next) ? prev : next));
    if (!hasReceivedInitialBoundsRef.current) {
      // First emit (from `onLoad`): sync the fetched bbox so the initial fetch matches reality.
      hasReceivedInitialBoundsRef.current = true;
      setFetchedBbox((prev) => (bboxEq(prev, next) ? prev : next));
      setHasReceivedInitialBounds(true);
    }
  }, []);

  /**
   * Safety net: if the map never emits bounds (e.g. style load failure with a token present),
   * don't strand the initial fetch forever — proceed against the preview bbox after a short
   * grace period. The map normally loads well under this, so in practice `onLoad` clears it.
   */
  useEffect(() => {
    if (!MAPBOX_API.accessToken || hasReceivedInitialBounds) return undefined;
    const id = setTimeout(() => setHasReceivedInitialBounds(true), 2500);
    return () => clearTimeout(id);
  }, [hasReceivedInitialBounds]);

  /**
   * Show the floating "Search this area" button when the user's current viewport has drifted
   * meaningfully from the bbox the displayed results correspond to. We check both center shift
   * (>25 % of viewport span in either axis) and zoom change (span ratio <0.6 or >1.7). This
   * mirrors Google Maps: pan a tiny amount → no button; pan or zoom noticeably → button slides in.
   */
  const showSearchAreaButton = useMemo(() => {
    if (hasActiveFilters) return false;
    // Saved/Following results are list-scoped, not viewport-scoped — "Search this area" has no
    // meaning there (and tapping it only re-sorts the same pins, which can re-fit the camera).
    if (savedActive || followingActive) return false;
    if (!pendingBbox || !fetchedBbox) return false;
    const fLngSpan = fetchedBbox.east - fetchedBbox.west;
    const fLatSpan = fetchedBbox.north - fetchedBbox.south;
    if (fLngSpan <= 0 || fLatSpan <= 0) return false;
    const pLngSpan = pendingBbox.east - pendingBbox.west;
    const pLatSpan = pendingBbox.north - pendingBbox.south;
    const fCenterLng = (fetchedBbox.east + fetchedBbox.west) / 2;
    const fCenterLat = (fetchedBbox.north + fetchedBbox.south) / 2;
    const pCenterLng = (pendingBbox.east + pendingBbox.west) / 2;
    const pCenterLat = (pendingBbox.north + pendingBbox.south) / 2;
    const lngShift = Math.abs(pCenterLng - fCenterLng) / fLngSpan;
    const latShift = Math.abs(pCenterLat - fCenterLat) / fLatSpan;
    const lngRatio = pLngSpan / fLngSpan;
    const latRatio = pLatSpan / fLatSpan;
    const zoomedSignificantly =
      lngRatio < 0.6 || lngRatio > 1.7 || latRatio < 0.6 || latRatio > 1.7;
    return lngShift > 0.25 || latShift > 0.25 || zoomedSignificantly;
  }, [hasActiveFilters, savedActive, followingActive, pendingBbox, fetchedBbox]);

  const handleSearchThisArea = useCallback(() => {
    // Read the map's *live* viewport at click time so we search exactly what's on screen —
    // `pendingBbox` lags a fast pan by the canvas's ~450ms debounce. Fall back to it if the
    // imperative reader isn't ready yet. We only swap the fetch bbox here; the camera is never
    // moved, so the map stays put while fresh results load.
    const live = mapBoundsApiRef.current?.getBounds?.();
    const next =
      live &&
      Number.isFinite(live.west) &&
      Number.isFinite(live.south) &&
      Number.isFinite(live.east) &&
      Number.isFinite(live.north)
        ? live
        : pendingBbox;
    setFetchedBbox(next);
    // Sync pending → fetched so the button dismisses immediately and no residual divergence
    // re-shows it after the refetch settles.
    setPendingBbox(next);
    // From now on the fetch is viewport-scoped (it was world-wide on initial load).
    setHasSearchedArea(true);
    trackEvent('map_search_this_area_tapped');
  }, [pendingBbox, trackEvent]);

  /**
   * Click on an autocomplete suggestion → fly the map to that pin and open the spot sheet.
   * Mirrors Google Maps: picking a result animates the camera over and surfaces detail.
   */
  const handleSuggestionPick = useCallback(
    (row) => {
      if (!row?.id) return;
      const strId = String(row.id);
      setPickedLocation(null); // a restaurant pick wins over a pending location fly
      setPickedGlobalRow(row);
      setDetailId(strId);
      setPinHighlightId(strId);
      setSuggestionFlyTick((x) => x + 1);
      setSuggestionsOpen(false);
      // Compute `in_view` inline against the live viewport so this handler doesn't depend on the
      // split-suggestions memo (which is declared later — referencing it here is a TDZ error).
      const bb = pendingBbox ?? fetchedBbox;
      const lat = Number(row?.latitude);
      const lng = Number(row?.longitude);
      const inView =
        !!bb &&
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lng >= bb.west &&
        lng <= bb.east &&
        lat >= bb.south &&
        lat <= bb.north;
      trackEvent('map_search_suggestion_picked', {
        restaurant_id: strId,
        in_view: inView,
      });
      if (isMobileSheet) {
        const snapHeight = Math.round(
          Math.min(
            Math.max(sheetSnapBounds.full * 0.65, sheetSnapBounds.peek),
            sheetSnapBounds.full
          )
        );
        setSheetHeightPx(snapHeight);
      }
    },
    [
      pendingBbox,
      fetchedBbox,
      isMobileSheet,
      sheetSnapBounds.full,
      sheetSnapBounds.peek,
      setSheetHeightPx,
      trackEvent,
    ]
  );

  const handleSuggestionsClose = useCallback(() => {
    setSuggestionsOpen(false);
  }, []);

  /**
   * Click a "Locations" suggestion → fly the map to that locality's centroid. Unlike a restaurant
   * pick, this doesn't open the spot sheet — it just moves the camera. With no area searched yet
   * the map already holds region-wide pins, so the locality's spots are visible on arrival;
   * otherwise the "Search this area" button surfaces so the user can load them.
   */
  const handlePickLocation = useCallback(
    (loc) => {
      if (!loc?.id || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) return;
      setPickedGlobalRow(null);
      setDetailId(null);
      setPinHighlightId(null);
      setPickedLocation({ id: loc.id, label: loc.label, lat: loc.lat, lng: loc.lng });
      setLocationFlyTick((x) => x + 1);
      setQuery(loc.label || '');
      setSuggestionsOpen(false);
      trackEvent('map_search_location_picked', { locality_id: loc.id });
    },
    [trackEvent]
  );

  // Clear the pinned global row once the user empties the search box (keep row when it is the active selection).
  useEffect(() => {
    if (!query.trim()) {
      setPickedGlobalRow((prev) => {
        if (prev?.id != null && detailId != null && spotIdEq(prev.id, detailId)) {
          return prev;
        }
        return null;
      });
      setPickedLocation(null);
    }
  }, [query, detailId]);

  const activeChipLabel = useMemo(() => {
    if (savedActive && followingActive) return 'saved+following';
    if (savedActive) return 'saved';
    if (followingActive) return 'following';
    return 'none';
  }, [savedActive, followingActive]);

  const followingHasSelection =
    followingActive && (selectedFollowingListIds === 'all' || selectedFollowingListIds.size > 0);
  const savedHasSelection =
    savedActive && (selectedSavedMapListIds === 'all' || selectedSavedMapListIds.size > 0);

  const handleSearchModeChange = useCallback(
    (nextMode) => {
      if (nextMode !== 'places' && nextMode !== 'ai') return;
      setSearchMode((prev) => {
        if (prev === nextMode) return prev;
        setMapNlSearchError(null);
        if (nextMode === 'places') {
          // Leaving AI: drop the AI result override so the map returns to normal browsing,
          // and reopen the typeahead if there's a query to match.
          setMapNlOverride(null);
          setSuggestionsOpen(!!query.trim());
        } else {
          // Entering AI: the name typeahead has no meaning here.
          setSuggestionsOpen(false);
        }
        trackEvent('map_search_ai_changed', { mode: nextMode });
        return nextMode;
      });
    },
    [query, trackEvent]
  );

  useEffect(() => {
    trackEvent('map_filters_updated', {
      selected_tag_count: selectedTagSlugs.length,
      min_rating: minRatingFilter,
      sort_mode: mapSortMode,
      open_now: openNowFilter,
    });
  }, [selectedTagSlugs, minRatingFilter, mapSortMode, openNowFilter, trackEvent]);

  // Distance is the default sort, so it doesn't count toward the filter "active" indicator;
  // only a switch to relevance does.
  const filterSheetHasExtra =
    selectedTagSlugs.length > 0 ||
    minRatingFilter > 0 ||
    openNowFilter ||
    mapSortMode === 'relevance';

  /* eslint-disable react-hooks/exhaustive-deps -- request params are serialized in `savedRequestKey` */
  useEffect(() => {
    if (!savedActive || !userId) {
      setSavedListPlaces([]);
      setSavedListLoading(false);
      return undefined;
    }
    let cancelled = false;
    setSavedListLoading(true);
    setSavedListPlaces([]);
    let doFetch;
    if (selectedSavedMapListIds !== 'all' && selectedSavedMapListIds.size === 0) {
      doFetch = Promise.resolve({ restaurants: [], error: null });
    } else if (selectedSavedMapListIds !== 'all') {
      doFetch = fetchSavedRestaurantsForMapByListIds([...selectedSavedMapListIds], {
        tagSlugs: selectedTagSlugs.length ? selectedTagSlugs : null,
        matchAll: selectedTagSlugs.length > 0,
        search: effectiveRestaurantSearch || null,
        minRating: minRatingFilter > 0 ? minRatingFilter : null,
        sort: mapServerSortMode,
        openNow: openNowFilter,
        refLat: distanceRefLat,
        refLng: distanceRefLng,
      });
    } else {
      doFetch = fetchSavedRestaurantsForMap({
        tagSlugs: selectedTagSlugs.length ? selectedTagSlugs : null,
        matchAll: selectedTagSlugs.length > 0,
        search: effectiveRestaurantSearch || null,
        minRating: minRatingFilter > 0 ? minRatingFilter : null,
        sort: mapServerSortMode,
        openNow: openNowFilter,
        refLat: distanceRefLat,
        refLng: distanceRefLng,
      });
    }
    doFetch.then(({ restaurants, error }) => {
      if (cancelled) return;
      if (error) {
        console.warn('[MapView] fetchSavedRestaurantsForMap:', error);
      }
      setSavedListPlaces(restaurants ?? []);
      setSavedListLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [savedActive, userId, savedPlacesTick, savedRequestKey]);
  /* eslint-enable react-hooks/exhaustive-deps */

  /* eslint-disable react-hooks/exhaustive-deps -- request params are serialized in `followingRequestKey` */
  useEffect(() => {
    if (!followingActive || !userId) {
      setFollowingListPlaces([]);
      setFollowingListLoading(false);
      return undefined;
    }
    let cancelled = false;
    setFollowingListLoading(true);
    setFollowingListPlaces([]);
    let doFetch;
    if (selectedFollowingListIds !== 'all' && selectedFollowingListIds.size === 0) {
      doFetch = Promise.resolve({ restaurants: [], error: null });
    } else if (selectedFollowingListIds !== 'all') {
      doFetch = fetchFollowingRestaurantsForMapByListIds([...selectedFollowingListIds], {
        tagSlugs: selectedTagSlugs.length ? selectedTagSlugs : null,
        matchAll: selectedTagSlugs.length > 0,
        search: effectiveRestaurantSearch || null,
        minRating: minRatingFilter > 0 ? minRatingFilter : null,
        sort: mapServerSortMode,
        openNow: openNowFilter,
        refLat: distanceRefLat,
        refLng: distanceRefLng,
      });
    } else {
      doFetch = fetchFollowingRestaurantsForMap({
        tagSlugs: selectedTagSlugs.length ? selectedTagSlugs : null,
        matchAll: selectedTagSlugs.length > 0,
        search: effectiveRestaurantSearch || null,
        minRating: minRatingFilter > 0 ? minRatingFilter : null,
        sort: mapServerSortMode,
        openNow: openNowFilter,
        refLat: distanceRefLat,
        refLng: distanceRefLng,
      });
    }
    doFetch.then(({ restaurants, error }) => {
      if (cancelled) return;
      if (error) {
        console.warn('[MapView] fetchFollowingRestaurantsForMap:', error);
      }
      setFollowingListPlaces(restaurants ?? []);
      setFollowingListLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [followingActive, userId, followingRequestKey]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const displayBboxPlaces = useMemo(() => {
    const raw = mapNlOverride !== null ? mapNlOverride : bboxPlaces;
    return prepareMapSheetPlaces(raw);
  }, [mapNlOverride, bboxPlaces]);

  /**
   * When the user picks a global suggestion that lies outside the current viewport, we keep
   * the row in `pickedGlobalRow` so the spot sheet has data to display AND the map shows the
   * pin even before the post-fly bbox refetch lands. Cleared on close / next pick.
   */
  const [pickedGlobalRow, setPickedGlobalRow] = useState(
    /** @type {Record<string, unknown> | null} */ (null)
  );
  /**
   * Tick that bumps every time the user picks a suggestion, even if it's the same row twice.
   * Used to build a unique `fitBoundsTarget.key` so the map re-flies on a re-pick.
   */
  const [suggestionFlyTick, setSuggestionFlyTick] = useState(0);

  useEffect(() => {
    skipNextMapSelectedSpotPersistRef.current = true;
    const raw = clientScopedGetJson(userId, mapSelectedSegA, mapSelectedSegB);
    const parsed = parseMapSelectedSpot(raw);
    if (!parsed) return;
    const { id, row } = parsed;
    setDetailId(id);
    setPinHighlightId(id);
    if (row) {
      setPickedGlobalRow(row);
      setSuggestionFlyTick((x) => x + 1);
    }
    pendingRestoredSelectionSheetRef.current = true;
  }, [userId, mapSelectedSegA, mapSelectedSegB]);

  // --- Discover → Map AI handoff -------------------------------------------------------------
  // Discover stashes a natural-language query when the user runs an AI search there, then routes
  // here. Read it once on mount, switch the bar into AI mode, and remember it; the fire effect
  // below runs the search once the map is ready enough to scope it to the view (see its gate).
  const pendingAiQueryRef = useRef(/** @type {string | null} */ (null));
  const pendingAiQueryFiredRef = useRef(false);
  useEffect(() => {
    const [segA, segB] = USER_SCOPED_KEYS.mapPendingAiQuery;
    const raw = clientScopedGetJson(userId, segA, segB);
    clientScopedRemoveJson(userId, segA, segB);
    const q = raw && typeof raw.query === 'string' ? raw.query.trim() : '';
    if (!q) return;
    pendingAiQueryRef.current = q;
    setSearchMode('ai');
    setQuery(q);
  }, [userId]);

  /** Split typeahead matches into in-view vs Portugal-elsewhere based on the live viewport. */
  const { inViewSuggestions, elsewhereSuggestions } = useMemo(() => {
    if (!nameSuggestions.length) {
      return { inViewSuggestions: [], elsewhereSuggestions: [] };
    }
    const bb = pendingBbox ?? fetchedBbox;
    const inView = [];
    const elsewhere = [];
    nameSuggestions.forEach((r) => {
      const lat = Number(r?.latitude);
      const lng = Number(r?.longitude);
      const isInside =
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lng >= bb.west &&
        lng <= bb.east &&
        lat >= bb.south &&
        lat <= bb.north;
      if (isInside) inView.push(r);
      else elsewhere.push(r);
    });
    return { inViewSuggestions: inView, elsewhereSuggestions: elsewhere };
  }, [nameSuggestions, pendingBbox, fetchedBbox]);

  const sourcePlaces = useMemo(() => {
    let base;
    if (!savedHasSelection && !followingHasSelection) {
      base = displayBboxPlaces;
    } else if (savedHasSelection && !followingHasSelection) {
      base = savedListPlaces;
    } else if (!savedHasSelection && followingHasSelection) {
      base = followingListPlaces;
    } else {
      const seen = new Set();
      const merged = [];
      [...savedListPlaces, ...followingListPlaces].forEach((p) => {
        const key = String(p?.id ?? '');
        if (!key || seen.has(key)) return;
        seen.add(key);
        merged.push(p);
      });
      base = merged;
    }
    // "Last added" reorders the already-loaded list client-side (the server fetch stays on
    // relevance for this mode). Sponsored-first is preserved by the recency sort.
    if (mapSortMode === 'recent') {
      base = sortMapSheetPlacesByRecency(base);
    }
    if (pickedGlobalRow && pickedGlobalRow.id != null) {
      const pickedId = String(pickedGlobalRow.id);
      if (!base.some((p) => String(p?.id) === pickedId)) {
        return [pickedGlobalRow, ...base];
      }
    }
    return base;
  }, [
    savedHasSelection,
    followingHasSelection,
    displayBboxPlaces,
    savedListPlaces,
    followingListPlaces,
    pickedGlobalRow,
    mapSortMode,
  ]);

  useEffect(() => {
    if (skipNextMapSelectedSpotPersistRef.current) {
      skipNextMapSelectedSpotPersistRef.current = false;
      return;
    }
    if (!detailId) {
      clientScopedRemoveJson(userId, mapSelectedSegA, mapSelectedSegB);
      return;
    }
    const strId = String(detailId);
    const fromPlaces = sourcePlaces.find((r) => spotIdEq(r.id, strId));
    const row =
      compactMapSelectedSpotRow(fromPlaces) ??
      compactMapSelectedSpotRow(
        pickedGlobalRow?.id != null && spotIdEq(pickedGlobalRow.id, strId) ? pickedGlobalRow : null
      );
    clientScopedSetJson(
      userId,
      mapSelectedSegA,
      mapSelectedSegB,
      row ? { id: strId, row } : { id: strId }
    );
  }, [userId, mapSelectedSegA, mapSelectedSegB, detailId, sourcePlaces, pickedGlobalRow]);

  /**
   * Pins for the map canvas. In a Saved/Following list (or NL search) the user expects to see
   * exactly that set, so we use `sourcePlaces`. In plain bbox mode we instead use the lean
   * `pinPlaces` — every restaurant in view, not the bounded detail set — so Mapbox clustering
   * reports true counts and zooming in reveals more. The picked-suggestion row is prepended so
   * its pin shows before the post-fly refetch lands (mirrors `sourcePlaces`).
   */
  /** Plain bbox mode (no Saved/Following list, no NL result) — where viewport pagination applies. */
  const bboxListMode = !savedHasSelection && !followingHasSelection && mapNlOverride === null;
  /** Bbox mode AND the lean pins RPC is available — drives the canvas off the full pin set. */
  const bboxPinMode = bboxListMode && !pinsErrored;
  const mapPlaces = useMemo(() => {
    if (!bboxPinMode) return sourcePlaces;
    if (pickedGlobalRow && pickedGlobalRow.id != null) {
      const pid = String(pickedGlobalRow.id);
      if (!pinPlaces.some((p) => String(p?.id) === pid)) {
        return [pickedGlobalRow, ...pinPlaces];
      }
    }
    return pinPlaces;
  }, [bboxPinMode, sourcePlaces, pinPlaces, pickedGlobalRow]);

  /**
   * Lean pin row for the selected id when it isn't in the bounded `sourcePlaces` (a pin beyond
   * the detailed set). Passed to the sheet hook so the detail card shows name/coords immediately
   * while the heavy fields hydrate by id.
   */
  const selectedLeanRow = useMemo(() => {
    if (!detailId) return null;
    if (sourcePlaces.some((r) => spotIdEq(r.id, detailId))) return null;
    return pinPlaces.find((r) => spotIdEq(r.id, detailId)) ?? null;
  }, [detailId, sourcePlaces, pinPlaces]);

  /**
   * Whether the spot list can load more detailed rows. Only in plain bbox mode (a Saved/Following
   * list or NL result is already the full set). True when the last detailed page came back full
   * AND there are more pins than detailed rows (or pins are unavailable to confirm) and we're under
   * the cap. The lean pin count gives the exact total in view.
   */
  const detailHasMore = useMemo(() => {
    if (!bboxListMode) return false; // a Saved/Following list or NL result is already the full set
    if (detailLimit >= MAP_VIEW_DETAIL_MAX) return false;
    if (bboxPlaces.length < detailLimit) return false; // partial page → got everything
    if (!pinsErrored && pinPlaces.length <= bboxPlaces.length) return false; // pins confirm no more
    return true;
  }, [bboxListMode, detailLimit, bboxPlaces.length, pinPlaces.length, pinsErrored]);

  const handleLoadMoreSpots = useCallback(() => {
    setDetailLimit((d) => Math.min(MAP_VIEW_DETAIL_MAX, d + MAP_VIEW_FETCH_LIMIT));
  }, []);

  let placesLoading = bboxLoading || mapNlLoading;
  if (savedHasSelection && followingHasSelection)
    placesLoading = savedListLoading || followingListLoading;
  else if (savedHasSelection) placesLoading = savedListLoading;
  else if (followingHasSelection) placesLoading = followingListLoading;

  const sheetSpotsHeadingBadgeCount = useMemo(() => {
    if (!followingActive || savedActive) return null;
    if (followingListsLoading || followingLists.length === 0) return null;
    let targetListId = null;
    if (selectedFollowingListIds === 'all') {
      if (followingLists.length !== 1) return null;
      targetListId = String(followingLists[0].id);
    } else if (selectedFollowingListIds instanceof Set) {
      if (selectedFollowingListIds.size !== 1) return null;
      targetListId = String([...selectedFollowingListIds][0]);
    } else {
      return null;
    }
    const hit = followingLists.find((l) => String(l.id) === targetListId);
    if (!hit || !Number.isFinite(hit.item_count)) return null;
    return hit.item_count;
  }, [
    savedActive,
    followingActive,
    followingLists,
    followingListsLoading,
    selectedFollowingListIds,
  ]);

  const {
    tagCatalog,
    tagCatalogLoaded,
    selectedRow: selected,
    sheetRestaurant,
    sheetReviews,
    sheetListMentions,
    sheetFeedLoading,
    sheetFollowCircle,
    sheetFollowCircleLoading,
    selectedSavedListIds,
    selectedSavedListIdsLoading,
    savedListIdsByRestaurant,
    listMetaById,
    followingOwnersByRestaurant,
    followingOwnersLoading,
    refetchSheetReviews,
    refreshSavedForPlaces,
  } = useRestaurantMapSheet({
    places: sourcePlaces,
    selectedId: detailId,
    userId,
    selectedFallbackRow: selectedLeanRow,
    userScopedSavedListCacheKey: USER_SCOPED_KEYS.mapListIdsByRestaurant,
  });

  // Defined after `useRestaurantMapSheet` because its dependency array reads `tagCatalog`
  // (destructured above). Declaring it earlier put `tagCatalog` in the temporal dead zone, so
  // the dep array threw `Cannot access 'tagCatalog' before initialization` on every render.
  const handleMapNlSearch = useCallback(
    async (overrideQuery) => {
      // `overrideQuery` lets the Discover → Map handoff fire a search before the debounced
      // `query` state has settled. Event handlers call with no arg, so guard the type.
      const q = (typeof overrideQuery === 'string' ? overrideQuery : query).trim();
      if (!q || mapNlLoading) {
        return;
      }
      // Scope the AI search to what the user is looking at: a picked locality's surroundings, else
      // the live map viewport — clamped to the searchable region. Falls back to the whole region
      // when neither is available, and the server re-runs the same plan region-wide if the scoped
      // search comes back too thin (see `fallbackScope`).
      let primaryBbox = null;
      if (pickedLocation) {
        primaryBbox = clampBboxToRegion(
          bboxAroundPoint(pickedLocation.lat, pickedLocation.lng, AI_LOCATION_BBOX_PAD_DEG),
          MAP_VIEW_BBOX
        );
      } else {
        const live = mapBoundsApiRef.current?.getBounds?.();
        const viewport =
          live &&
          Number.isFinite(live.west) &&
          Number.isFinite(live.south) &&
          Number.isFinite(live.east) &&
          Number.isFinite(live.north)
            ? live
            : pendingBbox;
        primaryBbox = clampBboxToRegion(viewport, MAP_VIEW_BBOX);
      }
      if (!primaryBbox) primaryBbox = MAP_VIEW_BBOX;
      const scopeIsRegionWide = bboxCoversRegion(primaryBbox, MAP_VIEW_BBOX);

      trackEvent('map_ai_search_submitted', {
        query_length: q.length,
        sort_mode: mapSortMode,
        active_chip: activeChipLabel,
        scoped: !scopeIsRegionWide,
      });
      setMapNlSearchError(null);
      setMapNlLoading(true);
      try {
        // Prefer a known GPS fix (map "locate" button or a prior AI search) over re-prompting the
        // browser on every search; only ask when we have nothing better than the map center.
        const knownFix = userGeoLocation ?? aiGeoFixRef.current;
        let userLat = knownFix?.lat ?? mapRefPoint.lat;
        let userLng = knownFix?.lng ?? mapRefPoint.lng;
        if (!knownFix && typeof navigator !== 'undefined' && navigator.geolocation) {
          try {
            const pos = await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: false,
                timeout: 6000,
                maximumAge: 120_000,
              });
            });
            userLat = pos.coords.latitude;
            userLng = pos.coords.longitude;
            // Cache so subsequent searches this session don't re-prompt. Kept out of
            // `userGeoLocation` so it doesn't silently re-anchor distance sorting.
            aiGeoFixRef.current = { lat: userLat, lng: userLng };
          } catch {
            // use map center for distance / bboxSort
          }
        }
        const refLat = mapSortMode === 'distance' ? (distanceRefLat ?? userLat) : userLat;
        const refLng = mapSortMode === 'distance' ? (distanceRefLng ?? userLng) : userLng;
        const {
          restaurants: rows,
          plan,
          error,
          usedFallback,
        } = await searchRestaurantsFromNaturalLanguage({
          query: q,
          scope: {
            type: 'bbox',
            west: primaryBbox.west,
            south: primaryBbox.south,
            east: primaryBbox.east,
            north: primaryBbox.north,
            homeLocalityId,
          },
          fallbackScope: scopeIsRegionWide
            ? null
            : {
                type: 'bbox',
                west: MAP_VIEW_BBOX.west,
                south: MAP_VIEW_BBOX.south,
                east: MAP_VIEW_BBOX.east,
                north: MAP_VIEW_BBOX.north,
                homeLocalityId,
              },
          bboxSort: {
            sort: mapServerSortMode,
            refLat,
            refLng,
          },
          userLat,
          userLng,
        });
        if (error) {
          console.warn('[MapView] searchRestaurantsFromNaturalLanguage:', error);
          trackEvent('map_ai_search_failed', {
            sort_mode: mapSortMode,
            active_chip: activeChipLabel,
          });
          setMapNlSearchError(t('pages.dashboard.discover.nl_search_error'));
          return;
        }
        setMapNlSearchError(null);

        // `usedFallback` + a real `plan` means the plan parsed fine but matched nothing anywhere in
        // scope, so the server returned unfiltered "nearby" places as a safety net. Showing those
        // under a cuisine chip (e.g. "ramen" selected, but the pins are random restaurants) is
        // exactly the mismatch we refuse to ship: clear any active filter chips and surface an
        // honest empty result instead. When `plan` is null the fallback came from an LLM/backend
        // failure — there's no chip to mismatch, so we let the graceful "nearby" rows render below.
        if (usedFallback && plan) {
          const tagsChanged = selectedTagSlugs.length > 0;
          const ratingChanged = minRatingFilter !== 0;
          if (tagsChanged || ratingChanged) {
            skipNextNlOverrideClearRef.current = true;
            if (tagsChanged) setSelectedTagSlugs([]);
            if (ratingChanged) setMinRatingFilter(0);
          }
          setMapNlOverride([]);
          trackEvent('map_ai_search_completed', {
            results_count: 0,
            sort_mode: mapSortMode,
            active_chip: activeChipLabel,
            applied_tag_count: 0,
            applied_min_rating: 0,
          });
          return;
        }

        // Surface the filters the AI actually used in the map's filter UI (tag chips + min rating),
        // so the user can see — and tweak — what it searched on. We set the skip flag first so the
        // "filters changed → drop AI override" effect doesn't wipe the results we're about to show.
        const allowedSlugSet = new Set(tagCatalog.map((tag) => tag.slug).filter(Boolean));
        const aiTagSlugs = planPrimaryTagSlugs(plan, allowedSlugSet);
        const aiMinRating = clampPlanMinRating(plan?.minRating);
        const tagsChanged = !sameSlugSet(aiTagSlugs, selectedTagSlugs);
        const ratingChanged = aiMinRating !== minRatingFilter;
        if (tagsChanged || ratingChanged) {
          skipNextNlOverrideClearRef.current = true;
          if (tagsChanged) setSelectedTagSlugs(aiTagSlugs);
          if (ratingChanged) setMinRatingFilter(aiMinRating);
        }

        setMapNlOverride(rows ?? []);
        trackEvent('map_ai_search_completed', {
          results_count: Array.isArray(rows) ? rows.length : 0,
          sort_mode: mapSortMode,
          active_chip: activeChipLabel,
          applied_tag_count: aiTagSlugs.length,
          applied_min_rating: aiMinRating,
        });
      } finally {
        setMapNlLoading(false);
      }
    },
    [
      activeChipLabel,
      query,
      mapNlLoading,
      pickedLocation,
      pendingBbox,
      userGeoLocation,
      mapRefPoint.lat,
      mapRefPoint.lng,
      mapSortMode,
      mapServerSortMode,
      distanceRefLat,
      distanceRefLng,
      homeLocalityId,
      tagCatalog,
      selectedTagSlugs,
      minRatingFilter,
      t,
      trackEvent,
    ]
  );

  // Fire the Discover → Map handoff search once the map has resolved its home locality and
  // received its first viewport bounds, so `handleMapNlSearch` scopes to that view rather than
  // falling back region-wide. Guarded by a ref so it runs at most once per mount.
  useEffect(() => {
    if (pendingAiQueryFiredRef.current) return;
    const q = pendingAiQueryRef.current;
    if (!q) return;
    if (!homeLocalityReady || !hasReceivedInitialBounds) return;
    pendingAiQueryFiredRef.current = true;
    pendingAiQueryRef.current = null;
    handleMapNlSearch(q);
  }, [homeLocalityReady, hasReceivedInitialBounds, handleMapNlSearch]);

  useEffect(() => {
    if (!pendingRestoredSelectionSheetRef.current) return;
    if (!detailId || !isMobileSheet) return;
    pendingRestoredSelectionSheetRef.current = false;
    const snapHeight = Math.round(
      Math.min(Math.max(sheetSnapBounds.full * 0.65, sheetSnapBounds.peek), sheetSnapBounds.full)
    );
    setSheetHeightPx(snapHeight);
  }, [detailId, isMobileSheet, sheetSnapBounds.full, sheetSnapBounds.peek, setSheetHeightPx]);

  useEffect(() => {
    if (!tagCatalog.length) return;
    const allowed = new Set(tagCatalog.map((tag) => tag.slug));
    setSelectedTagSlugs((prev) => {
      const next = prev.filter((s) => allowed.has(s));
      return next.length === prev.length ? prev : next;
    });
  }, [tagCatalog]);

  const tagSections = useMemo(() => groupRestaurantTagsByCategory(tagCatalog), [tagCatalog]);

  const pinnedRow = useMemo(
    () =>
      pinHighlightId ? (sourcePlaces.find((r) => spotIdEq(r.id, pinHighlightId)) ?? null) : null,
    [sourcePlaces, pinHighlightId]
  );

  const sheetEmptyCopy = useMemo(() => {
    if ((savedActive || followingActive) && !userId) {
      return t(
        followingActive && !savedActive
          ? 'pages.dashboard.map.sheet_login_following'
          : 'pages.dashboard.map.sheet_login_saved'
      );
    }
    if (
      (savedActive || followingActive) &&
      userId &&
      !query.trim() &&
      (!savedActive || savedListPlaces.length === 0) &&
      (!followingActive || followingListPlaces.length === 0)
    ) {
      return t(
        followingActive && !savedActive
          ? 'pages.dashboard.map.sheet_empty_following'
          : 'pages.dashboard.map.sheet_empty_saved'
      );
    }
    return t('pages.dashboard.map.sheet_empty');
  }, [
    savedActive,
    followingActive,
    userId,
    query,
    savedListPlaces.length,
    followingListPlaces.length,
    t,
  ]);

  /**
   * Previously: when `sourcePlaces` changed and the selected pin was no longer in the new set
   * (typical after a viewport pan + bbox refetch), this effect auto-cleared `detailId` and
   * collapsed the mobile sheet back to peek. Combined with `useRestaurantMapSheet`'s
   * sticky `selectedRow` fallback below, the selection now persists across pans — the user has
   * to explicitly close it. Filter-change cleanup is handled lower in the tree when the user
   * actively changes filters; this auto-clear was over-firing on every map move.
   */

  const handleMarkerClick = useCallback(
    (id) => {
      const strId = id == null ? null : String(id);
      if (strId != null && detailId != null && spotIdEq(strId, detailId)) {
        setDetailId(null);
        setPinHighlightId(null);
        if (isMobileSheet) {
          setSheetHeightPx(sheetSnapBounds.peek);
        }
        trackEvent('map_marker_deselected', { restaurant_id: strId });
        return;
      }
      setPinHighlightId(strId);
      setDetailId(strId);
      trackEvent('map_marker_selected', { restaurant_id: strId });
      if (isMobileSheet && strId != null) {
        // Snap to ~65% height so the list row is visible and the user can scroll to it.
        const snapHeight = Math.round(
          Math.min(
            Math.max(sheetSnapBounds.full * 0.65, sheetSnapBounds.peek),
            sheetSnapBounds.full
          )
        );
        setSheetHeightPx(snapHeight);
      }
    },
    [detailId, isMobileSheet, sheetSnapBounds, setSheetHeightPx, trackEvent]
  );

  /** Called when a list row is clicked — toggles the detail view for that row. */
  const handleListSpotSelect = useCallback(
    (id) => {
      const strId = id == null ? null : String(id);
      if (strId != null && detailId != null && spotIdEq(strId, detailId)) {
        setDetailId(null);
        setPinHighlightId(null);
        if (isMobileSheet) {
          setSheetHeightPx(sheetSnapBounds.peek);
        }
        trackEvent('map_list_spot_deselected', { restaurant_id: strId });
        return;
      }
      setDetailId(strId);
      setPinHighlightId(strId);
      trackEvent('map_list_spot_selected', { restaurant_id: strId });
      if (isMobileSheet && strId != null) {
        const snapHeight = Math.round(
          Math.min(
            Math.max(sheetSnapBounds.full * 0.65, sheetSnapBounds.peek),
            sheetSnapBounds.full
          )
        );
        setSheetHeightPx(snapHeight);
      }
    },
    [detailId, isMobileSheet, sheetSnapBounds, setSheetHeightPx, trackEvent]
  );

  const handleSaveApplied = useCallback(() => {
    refreshSavedForPlaces(sourcePlaces);
    setSavedPlacesTick((x) => x + 1);
    router.refresh();
  }, [router, refreshSavedForPlaces, sourcePlaces]);

  const handleCloseSpotPanel = useCallback(() => {
    setDetailId(null);
    setPinHighlightId(null);
    if (isMobileSheet) {
      setSheetHeightPx(sheetSnapBounds.peek);
    }
  }, [isMobileSheet, sheetSnapBounds.peek, setSheetHeightPx]);

  /** Saved/Following chip: zoom map to pins so the globe isn't left at world view when the sheet lists spots. */
  const savedFitBoundsTarget = useMemo(() => {
    if (
      (!savedActive && !followingActive) ||
      selected ||
      placesLoading ||
      sourcePlaces.length === 0
    ) {
      return null;
    }
    return {
      key: sourcePlaces
        .map((p) => String(p.id))
        .sort()
        .join(','),
      places: sourcePlaces,
    };
  }, [savedActive, followingActive, selected, placesLoading, sourcePlaces]);

  /**
   * When the user picks an autocomplete suggestion, fly to that single pin (zoom 12.5 via the
   * single-point branch in `dashboard-map-canvas`). Wins over `savedFitBoundsTarget` so the
   * pick always animates, even when Saved/Following is also active. `suggestionFlyTick` keeps
   * the key unique so re-picking the same row re-fires the fly.
   */
  const effectiveFitBoundsTarget = useMemo(() => {
    if (pickedLocation) {
      return {
        key: `loc:${pickedLocation.id}:${locationFlyTick}`,
        places: [
          {
            id: `loc:${pickedLocation.id}`,
            latitude: pickedLocation.lat,
            longitude: pickedLocation.lng,
          },
        ],
      };
    }
    if (pickedGlobalRow && pickedGlobalRow.id != null) {
      return {
        key: `pick:${pickedGlobalRow.id}:${suggestionFlyTick}`,
        places: [pickedGlobalRow],
      };
    }
    return savedFitBoundsTarget;
  }, [pickedLocation, locationFlyTick, pickedGlobalRow, suggestionFlyTick, savedFitBoundsTarget]);

  const spotSheetBody = (
    <MapSpotSheetInner
      placesLoading={placesLoading}
      places={sourcePlaces}
      sortMode={mapSortMode}
      onSortModeChange={setMapSortMode}
      selected={selected}
      sheetRestaurant={sheetRestaurant}
      sheetReviews={sheetReviews}
      sheetListMentions={sheetListMentions}
      sheetFeedLoading={sheetFeedLoading}
      sheetFollowCircle={sheetFollowCircle}
      sheetFollowCircleLoading={sheetFollowCircleLoading}
      selectedSavedListIds={selectedSavedListIds}
      selectedSavedListIdsLoading={selectedSavedListIdsLoading}
      savedListIdsByRestaurant={savedListIdsByRestaurant}
      listMetaById={listMetaById}
      followingOwnersByRestaurant={followingOwnersByRestaurant}
      followingOwnersLoading={followingOwnersLoading}
      userId={userId}
      viewerAvatarUrl={viewerAvatarUrl}
      viewerDisplayName={viewerDisplayName}
      tagCatalog={tagCatalog}
      tagCatalogLoaded={tagCatalogLoaded}
      highlightedId={pinHighlightId}
      onSelectSpot={handleListSpotSelect}
      onCloseDetail={handleCloseSpotPanel}
      onSaveApplied={handleSaveApplied}
      refetchSheetReviews={refetchSheetReviews}
      sheetEmptyCopy={sheetEmptyCopy}
      isMobileSheet={isMobileSheet}
      spotsHeadingBadgeCount={sheetSpotsHeadingBadgeCount}
      preloadedMyLists={preloadedSaveSheetLists}
      preloadedMyListsReady={preloadedSaveSheetListsReady}
      listResetKey={bboxListMode ? bboxAreaKey : undefined}
      hasMoreSpots={detailHasMore}
      loadingMoreSpots={bboxLoading}
      onLoadMoreSpots={handleLoadMoreSpots}
    />
  );

  const searchEndAdornment = (
    <SearchAiToggleAdornment
      mode={searchMode}
      onModeChange={handleSearchModeChange}
      hasQuery={!!query.trim()}
      onClear={() => {
        setQuery('');
        setSuggestionsOpen(false);
      }}
      onSubmit={() => handleMapNlSearch()}
      submitting={mapNlLoading}
    />
  );

  return (
    <SettingsDrillShell
      title=""
      compactToolbar
      fillMain
      hideCompactStickyHeader
      pageContainerSx={{ px: 0 }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        sx={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          width: 1,
          alignItems: { md: 'stretch' },
          /**
           * Row layout: prevent aside content min-height:auto from growing the flex line past Main.
           * Without this, the side panel stays tall, overflow:hidden clips detail, and no inner scroll.
           * Scoped to md+ so mobile fixed bottom sheet isn't affected.
           */
          overflow: { xs: 'visible', md: 'hidden' },
          [theme.breakpoints.up('md')]: {
            flexBasis: 0,
          },
        }}
      >
        <Box
          sx={{
            flex: { xs: 1, md: 1 },
            minWidth: 0,
            minHeight: 0,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box
            sx={{
              position: 'relative',
              flex: 1,
              minHeight: 0,
              borderRadius: isMobileSheet
                ? { xs: 0, lg: 2 }
                : { xs: 0, md: '12px 0 0 12px', lg: '16px 0 0 16px' },
              overflow: 'hidden',
              bgcolor: alpha(theme.palette.grey[500], 0.12),
            }}
          >
            {MAPBOX_API.accessToken ? (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 0,
                  '& .mapboxgl-map': { width: '100% !important', height: '100% !important' },
                }}
              >
                <DashboardMapCanvas
                  accessToken={MAPBOX_API.accessToken}
                  places={mapPlaces}
                  selectedId={pinHighlightId}
                  onMarkerClick={handleMarkerClick}
                  clientScopeUserId={userId}
                  followingOwnersByRestaurant={followingOwnersByRestaurant}
                  savedListIdsByRestaurant={savedListIdsByRestaurant}
                  viewerAvatarUrl={viewerAvatarUrl}
                  viewerDisplayName={viewerDisplayName}
                  mapSelectedRow={pinnedRow}
                  fitBoundsTarget={effectiveFitBoundsTarget}
                  onViewportCenterChange={handleMapViewportCenter}
                  onViewportBoundsChange={handleMapViewportBounds}
                  boundsApiRef={mapBoundsApiRef}
                  onUserLocate={handleUserLocate}
                  rightAsideWidthPx={isMobileSheet ? undefined : listPanelWidthPx}
                />
              </Box>
            ) : null}

            {/**
             * Google Maps' "Search this area" pill — only appears once the user has panned/zoomed
             * meaningfully past the bbox the current results cover. Tap to refetch for the new
             * viewport; we don't auto-fetch on pan so the user stays in control and the sheet
             * doesn't churn underneath them.
             */}
            {MAPBOX_API.accessToken && showSearchAreaButton ? (
              <Box
                sx={{
                  position: 'absolute',
                  /* Sits below the search row + chip row at the top — clears AI loading panel too. */
                  top: { xs: 130, sm: 140, md: 124 },
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 5,
                  pointerEvents: 'none',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <Button
                  variant="contained"
                  color="inherit"
                  size="small"
                  disableElevation
                  onClick={handleSearchThisArea}
                  disabled={bboxLoading}
                  startIcon={
                    bboxLoading ? (
                      <CircularProgress size={14} thickness={5} sx={{ color: 'inherit' }} />
                    ) : (
                      <Iconify icon={ic.refreshBold} width={16} />
                    )
                  }
                  sx={{
                    pointerEvents: 'auto',
                    borderRadius: RADIUS.pill,
                    px: 1.75,
                    py: 0.65,
                    minHeight: 0,
                    fontWeight: 700,
                    fontSize: '0.8125rem',
                    letterSpacing: 0.01,
                    bgcolor: (tt) => alpha(tt.palette.background.paper, 0.98),
                    color: 'text.primary',
                    border: (tt) => `1px solid ${alpha(tt.palette.divider, 0.8)}`,
                    boxShadow: theme.shadows[6],
                    '&:hover': {
                      bgcolor: (tt) => alpha(tt.palette.background.paper, 1),
                      boxShadow: theme.shadows[8],
                    },
                    '&.Mui-disabled': {
                      bgcolor: (tt) => alpha(tt.palette.background.paper, 0.92),
                      color: 'text.secondary',
                    },
                  }}
                >
                  {bboxLoading
                    ? t('pages.dashboard.map.search_this_area_loading')
                    : t('pages.dashboard.map.search_this_area')}
                </Button>
              </Box>
            ) : null}

            {!MAPBOX_API.accessToken ? (
              <Stack
                justifyContent="center"
                alignItems="center"
                spacing={1}
                sx={{
                  position: 'absolute',
                  inset: 0,
                  p: 3,
                  textAlign: 'center',
                  pointerEvents: 'none',
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {t('pages.dashboard.map.map_placeholder')}
                </Typography>
              </Stack>
            ) : null}

            {/* Floating search (Google Maps–style over map) */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 4,
                /* Mobile: inset controls from edges. md+: map + aside are full-bleed in Main — no side gutter. */
                px: { xs: 1.5, sm: 2, md: 0 },
                pl: { md: 'max(0px, env(safe-area-inset-left, 0px))' },
                pr: { md: 'max(0px, env(safe-area-inset-right, 0px))' },
                /* `lg+`: dashboard Main already clears fixed AppBar + safe-area; avoid double inset. */
                pt: { xs: 'max(8px, env(safe-area-inset-top, 0px))', lg: 1 },
                pointerEvents: 'none',
                '& > *': { pointerEvents: 'auto' },
              }}
            >
              <Stack
                spacing={1}
                sx={{
                  width: 1,
                }}
              >
                <Box ref={searchAnchorRef} sx={{ position: 'relative', width: 1 }}>
                  <DashboardSearchFilterRow
                    variant="glass"
                    glassSx={glassPanel}
                    value={query}
                    onChange={(e) => {
                      setMapNlOverride(null);
                      setMapNlSearchError(null);
                      setPickedLocation(null);
                      setQuery(e.target.value);
                      if (!isAiSearchMode) setSuggestionsOpen(true);
                    }}
                    placeholder={
                      isAiSearchMode
                        ? t('pages.dashboard.map.ai_search_placeholder')
                        : t('pages.dashboard.map.search_placeholder')
                    }
                    stackProps={{ spacing: 1.25 }}
                    TextFieldProps={{
                      autoComplete: 'off',
                      inputProps: {
                        enterKeyHint: 'search',
                        style: { fontSize: '16px' },
                      },
                      onFocus: () => {
                        if (!isAiSearchMode && query.trim()) setSuggestionsOpen(true);
                      },
                      onKeyDown: (e) => {
                        if (e.key === 'Escape') {
                          setSuggestionsOpen(false);
                          return;
                        }
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          setSuggestionsOpen(false);
                          if (isAiSearchMode) {
                            handleMapNlSearch();
                          } else {
                            // Commit the query now instead of waiting out the debounce tick,
                            // so Enter applies the same live name filter typing does.
                            setDebouncedQuery(query.trim());
                          }
                        }
                      },
                      InputProps: {
                        endAdornment: searchEndAdornment,
                        sx: isAiSearchMode
                          ? {
                              outline: `2px solid ${theme.palette.primary.main}`,
                              outlineOffset: '-1px',
                            }
                          : undefined,
                      },
                    }}
                  />
                  <MapSearchSuggestions
                    open={
                      !isAiSearchMode &&
                      suggestionsOpen &&
                      !!debouncedQuery &&
                      !mapNlLoading &&
                      (nameSuggestionsLoading ||
                        inViewSuggestions.length > 0 ||
                        elsewhereSuggestions.length > 0 ||
                        locationSuggestions.length > 0)
                    }
                    anchorEl={searchAnchorRef.current}
                    query={debouncedQuery}
                    inViewRows={inViewSuggestions}
                    elsewhereRows={elsewhereSuggestions}
                    locationRows={locationSuggestions}
                    loading={nameSuggestionsLoading}
                    onPick={handleSuggestionPick}
                    onPickLocation={handlePickLocation}
                    onClose={handleSuggestionsClose}
                  />
                </Box>
                {mapNlLoading ? (
                  <NlSearchLoadingCard
                    phrases={searchLoadingPhrases}
                    activeStep={mapNlLoadingStep}
                    phraseKeys={SEARCH_LOADING_KEYS}
                  />
                ) : null}
                {mapNlSearchError ? (
                  <Alert
                    severity="error"
                    variant="outlined"
                    role="alert"
                    onClose={() => setMapNlSearchError(null)}
                  >
                    {mapNlSearchError}
                  </Alert>
                ) : null}
                <ScrollableChipRow
                  role="group"
                  aria-label={t('pages.dashboard.map.filter_tabs_aria')}
                  gap={0.75}
                  sx={{ mx: 0 }}
                >
                  <Button
                    ref={followingChipRef}
                    color="inherit"
                    disableElevation
                    aria-pressed={followingHasSelection}
                    aria-haspopup="listbox"
                    aria-expanded={followingMenuOpen}
                    startIcon={<Iconify icon={ic.usersGroupTwoRoundedBold} width={16} />}
                    onClick={handleFollowingChipClick}
                    sx={scrollableChipPillButtonSx(theme, { selected: followingHasSelection })}
                  >
                    {t('pages.dashboard.map.chip_following')}
                    {followingActive &&
                      selectedFollowingListIds !== 'all' &&
                      selectedFollowingListIds.size > 0 && <> ({selectedFollowingListIds.size})</>}
                  </Button>
                  <Button
                    ref={savedChipRef}
                    color="inherit"
                    disableElevation
                    aria-pressed={savedHasSelection}
                    aria-haspopup="listbox"
                    aria-expanded={savedMenuOpen}
                    startIcon={<Iconify icon={ic.bookmarkBold} width={16} />}
                    onClick={handleSavedChipClick}
                    sx={scrollableChipPillButtonSx(theme, { selected: savedHasSelection })}
                  >
                    {t('pages.dashboard.map.chip_saved_my_own')}
                    {savedActive &&
                      selectedSavedMapListIds !== 'all' &&
                      selectedSavedMapListIds.size > 0 && <> ({selectedSavedMapListIds.size})</>}
                  </Button>
                  <Button
                    color="inherit"
                    disableElevation
                    aria-pressed={filterSheetHasExtra}
                    aria-expanded={tagFilterSheetOpen}
                    aria-haspopup="dialog"
                    startIcon={<Iconify icon={ic.compassBold} width={16} />}
                    onClick={() => {
                      trackEvent('map_more_filters_opened');
                      setTagFilterSheetOpen(true);
                    }}
                    sx={scrollableChipPillButtonSx(theme, {
                      selected: filterSheetHasExtra,
                    })}
                  >
                    {t('pages.dashboard.map.chip_more')}
                  </Button>
                </ScrollableChipRow>
              </Stack>
            </Box>

            {/* Following list selector popover */}
            <Popover
              open={followingMenuOpen}
              anchorEl={followingChipRef.current}
              onClose={handleFollowingMenuClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              disableScrollLock
              disableEnforceFocus
              slotProps={mapChipListPickerPopoverSlotProps}
            >
              <Stack sx={{ overflow: 'hidden', flex: 1 }}>
                {/* Header */}
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{
                    px: 2,
                    py: 1.25,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    flexShrink: 0,
                  }}
                >
                  <Typography variant="subtitle2">
                    {t('pages.dashboard.map.chip_following')}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={handleFollowingMenuClose}
                    aria-label={t('common.close', { defaultValue: 'Close' })}
                  >
                    <Iconify icon={ic.closeLine} width={16} />
                  </IconButton>
                </Stack>

                {/* All option */}
                <Box
                  role="option"
                  aria-selected={selectedFollowingListIds === 'all'}
                  onClick={handleFollowingSelectAll}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    px: 1.5,
                    py: 0.5,
                    cursor: 'pointer',
                    flexShrink: 0,
                    ...hoverable({ bgcolor: 'action.hover' }),
                  }}
                >
                  <Checkbox
                    size="small"
                    checked={selectedFollowingListIds === 'all'}
                    indeterminate={
                      selectedFollowingListIds !== 'all' && selectedFollowingListIds.size > 0
                    }
                    onChange={handleFollowingSelectAll}
                    onClick={(e) => e.stopPropagation()}
                    tabIndex={-1}
                  />
                  <Typography variant="body2" sx={{ ml: 0.5, fontWeight: 500 }}>
                    {t('pages.dashboard.map.chip_following_all')}
                  </Typography>
                </Box>

                <Divider sx={{ flexShrink: 0 }} />

                {/* Individual followed lists */}
                <Box role="listbox" aria-multiselectable="true" sx={{ overflowY: 'auto', flex: 1 }}>
                  {followingListsLoading && (
                    <Stack alignItems="center" justifyContent="center" sx={{ py: 3 }}>
                      <CircularProgress size={24} />
                    </Stack>
                  )}
                  {!followingListsLoading && followingLists.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 2 }}>
                      {t('pages.dashboard.map.chip_following_empty')}
                    </Typography>
                  )}
                  {!followingListsLoading &&
                    followingLists.length > 0 &&
                    [
                      [
                        'public',
                        'pages.dashboard.map.chip_following_group_public',
                        followingListsGrouped.publicByPerson,
                      ],
                      [
                        'subscription',
                        'pages.dashboard.map.chip_following_group_subscription',
                        followingListsGrouped.subscriptionByPerson,
                      ],
                    ]
                      .filter(([, , byPerson]) => byPerson.length > 0)
                      .map(([groupKey, titleNs, byPerson], idx) => (
                        <Box
                          key={groupKey}
                          component="section"
                          aria-label={t(titleNs)}
                          sx={{
                            pt: idx === 0 ? 0 : 0.5,
                            borderTop: (tt) =>
                              idx > 0 ? `1px solid ${tt.palette.divider}` : 'none',
                          }}
                        >
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              px: 2,
                              pt: 1,
                              pb: 0.75,
                              display: 'block',
                              fontWeight: 700,
                              letterSpacing: 0.04,
                              textTransform: 'uppercase',
                            }}
                          >
                            {t(titleNs)}
                          </Typography>
                          {byPerson.map((personGroup) => (
                            <Box
                              key={`${groupKey}-owner-${personGroup.lists[0]?.id ?? personGroup.sortKey}`}
                              sx={{ pb: 0.25 }}
                            >
                              {personGroup.title ? (
                                <Typography
                                  variant="subtitle2"
                                  sx={{
                                    px: 2,
                                    pt: 0.75,
                                    pb: 0.35,
                                    color: 'text.primary',
                                    fontWeight: 600,
                                  }}
                                >
                                  {personGroup.title}
                                </Typography>
                              ) : null}
                              {personGroup.lists.map((list) => {
                                const listId = String(list.id);
                                const isChecked =
                                  selectedFollowingListIds === 'all' ||
                                  selectedFollowingListIds.has(listId);
                                const owner =
                                  list.owner_display_name || list.owner_username || null;
                                return (
                                  <Box
                                    key={listId}
                                    role="option"
                                    aria-selected={isChecked}
                                    onClick={() => handleFollowingListToggle(listId)}
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      px: 1.5,
                                      py: 0.5,
                                      cursor: 'pointer',
                                      ...hoverable({ bgcolor: 'action.hover' }),
                                    }}
                                  >
                                    <Checkbox
                                      size="small"
                                      checked={isChecked}
                                      onChange={() => handleFollowingListToggle(listId)}
                                      onClick={(e) => e.stopPropagation()}
                                      tabIndex={-1}
                                    />
                                    <Box sx={{ ml: 0.5, flex: 1, minWidth: 0 }}>
                                      <Typography variant="body2" noWrap>
                                        {list.name}
                                      </Typography>
                                      {!personGroup.title && owner ? (
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                          noWrap
                                          display="block"
                                        >
                                          {t('pages.dashboard.map.chip_following_by', {
                                            name: owner,
                                          })}
                                        </Typography>
                                      ) : null}
                                    </Box>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ ml: 1, flexShrink: 0, ...tabularNumsSx }}
                                    >
                                      {list.item_count}
                                    </Typography>
                                  </Box>
                                );
                              })}
                            </Box>
                          ))}
                        </Box>
                      ))}
                </Box>
              </Stack>
            </Popover>

            {/* Saved (my lists) selector popover */}
            <Popover
              open={savedMenuOpen}
              anchorEl={savedChipRef.current}
              onClose={handleSavedMenuClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              disableScrollLock
              disableEnforceFocus
              slotProps={mapChipListPickerPopoverSlotProps}
            >
              <Stack sx={{ overflow: 'hidden', flex: 1 }}>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{
                    px: 2,
                    py: 1.25,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    flexShrink: 0,
                  }}
                >
                  <Typography variant="subtitle2">
                    {t('pages.dashboard.map.chip_saved_my_own')}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={handleSavedMenuClose}
                    aria-label={t('common.close', { defaultValue: 'Close' })}
                  >
                    <Iconify icon={ic.closeLine} width={16} />
                  </IconButton>
                </Stack>

                <Box
                  role="option"
                  aria-selected={selectedSavedMapListIds === 'all'}
                  onClick={handleSavedSelectAll}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    px: 1.5,
                    py: 0.5,
                    cursor: 'pointer',
                    flexShrink: 0,
                    ...hoverable({ bgcolor: 'action.hover' }),
                  }}
                >
                  <Checkbox
                    size="small"
                    checked={selectedSavedMapListIds === 'all'}
                    indeterminate={
                      selectedSavedMapListIds !== 'all' && selectedSavedMapListIds.size > 0
                    }
                    onChange={handleSavedSelectAll}
                    onClick={(e) => e.stopPropagation()}
                    tabIndex={-1}
                  />
                  <Typography variant="body2" sx={{ ml: 0.5, fontWeight: 500 }}>
                    {t('pages.dashboard.map.chip_saved_all')}
                  </Typography>
                </Box>

                <Divider sx={{ flexShrink: 0 }} />

                <Box role="listbox" aria-multiselectable="true" sx={{ overflowY: 'auto', flex: 1 }}>
                  {(savedOwnedListsLoading || savedSharedListsLoading) && (
                    <Stack alignItems="center" justifyContent="center" sx={{ py: 3 }}>
                      <CircularProgress size={24} />
                    </Stack>
                  )}
                  {!savedOwnedListsLoading &&
                    !savedSharedListsLoading &&
                    savedOwnedLists.length === 0 &&
                    savedSharedLists.length === 0 && (
                      <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 2 }}>
                        {t('pages.dashboard.map.chip_saved_empty')}
                      </Typography>
                    )}
                  {!savedOwnedListsLoading &&
                    !savedSharedListsLoading &&
                    [
                      ['owned', 'pages.dashboard.map.chip_saved_group_owned', savedOwnedLists],
                      ['shared', 'pages.dashboard.map.chip_saved_group_shared', savedSharedLists],
                    ]
                      .filter(([, , rows]) => rows.length > 0)
                      .map(([groupKey, titleNs, rows], idx, arr) => (
                        <Box
                          key={groupKey}
                          component="section"
                          aria-label={t(titleNs)}
                          sx={{
                            pt: idx === 0 ? 0 : 0.5,
                            borderTop: (tt) =>
                              idx > 0 ? `1px solid ${tt.palette.divider}` : 'none',
                          }}
                        >
                          {arr.length > 1 ? (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                px: 2,
                                pt: 1,
                                pb: 0.75,
                                display: 'block',
                                fontWeight: 700,
                                letterSpacing: 0.04,
                                textTransform: 'uppercase',
                              }}
                            >
                              {t(titleNs)}
                            </Typography>
                          ) : null}
                          {rows.map((list) => {
                            const listId = String(list.id);
                            const isChecked =
                              selectedSavedMapListIds === 'all' ||
                              selectedSavedMapListIds.has(listId);
                            const owner =
                              groupKey === 'shared'
                                ? list.owner_display_name || list.owner_username || null
                                : null;
                            return (
                              <Box
                                key={listId}
                                role="option"
                                aria-selected={isChecked}
                                onClick={() => handleSavedListToggle(listId)}
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  px: 1.5,
                                  py: 0.5,
                                  cursor: 'pointer',
                                  ...hoverable({ bgcolor: 'action.hover' }),
                                }}
                              >
                                <Checkbox
                                  size="small"
                                  checked={isChecked}
                                  onChange={() => handleSavedListToggle(listId)}
                                  onClick={(e) => e.stopPropagation()}
                                  tabIndex={-1}
                                />
                                <Box sx={{ ml: 0.5, flex: 1, minWidth: 0 }}>
                                  <Typography variant="body2" noWrap>
                                    {list.name}
                                  </Typography>
                                  {owner ? (
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      noWrap
                                      display="block"
                                    >
                                      {t('pages.dashboard.map.chip_saved_shared_by', {
                                        name: owner,
                                      })}
                                    </Typography>
                                  ) : null}
                                </Box>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ ml: 1, flexShrink: 0, ...tabularNumsSx }}
                                >
                                  {list.item_count}
                                </Typography>
                              </Box>
                            );
                          })}
                        </Box>
                      ))}
                </Box>
              </Stack>
            </Popover>

            {/* Bottom sheet — mobile only (tablet/desktop use side panel) */}
            {isMobileSheet ? (
              <MapMobileSpotSheetShell
                bottomInsetPx={NAV.H_MOBILE_BOTTOM}
                sheetHeightPx={sheetHeightPx}
                setSheetHeightPx={setSheetHeightPx}
                sheetSnapBounds={sheetSnapBounds}
                sheetExpandedMobile={sheetExpandedMobile}
                mobileSheetHeightTransition={mobileSheetHeightTransition}
                onSheetHandlePointerDown={onSheetHandlePointerDown}
                onSheetHandlePointerMove={onSheetHandlePointerMove}
                endSheetDrag={endSheetDrag}
                glassPanelSx={glassPanel}
                t={t}
              >
                {spotSheetBody}
              </MapMobileSpotSheetShell>
            ) : null}
          </Box>
        </Box>

        {!isMobileSheet ? (
          <>
            <Box
              role="separator"
              aria-orientation="vertical"
              aria-label={t('pages.dashboard.map.list_resize_divider_aria')}
              aria-valuemin={260}
              aria-valuemax={560}
              aria-valuenow={listPanelWidthPx}
              onPointerDown={onListPanelResizePointerDown}
              sx={{
                display: { xs: 'none', md: 'flex' },
                flexShrink: 0,
                position: 'relative',
                width: 4,
                cursor: 'col-resize',
                touchAction: 'none',
                alignSelf: 'stretch',
                flexDirection: 'column',
                alignItems: 'center',
                bgcolor: asideResizing ? alpha(theme.palette.text.primary, 0.05) : 'transparent',
                transition: theme.transitions.create(['background-color'], {
                  duration: asideResizing ? 0 : 160,
                }),
                ...hoverable({
                  bgcolor: alpha(theme.palette.text.primary, 0.035),
                }),
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  left: '50%',
                  top: '16%',
                  bottom: '16%',
                  width: 1,
                  transform: 'translateX(-50%)',
                  borderRadius: 0.5,
                  bgcolor: alpha(theme.palette.divider, 0.75),
                  transition: theme.transitions.create(['background-color', 'box-shadow'], {
                    duration: asideResizing ? 0 : 160,
                  }),
                  boxShadow: asideResizing
                    ? `0 0 0 1px ${alpha(theme.palette.primary.main, 0.28)}`
                    : 'none',
                },
                ...finePointerHover({
                  '&:hover::after': {
                    bgcolor: alpha(theme.palette.text.secondary, 0.4),
                  },
                }),
              }}
            />
            <Box
              component="aside"
              aria-label={t('pages.dashboard.map.sheet_list_aria')}
              sx={{
                display: { xs: 'none', md: 'flex' },
                flexDirection: 'column',
                width: listPanelWidthPx,
                minWidth: 0,
                flexShrink: 0,
                minHeight: 0,
                alignSelf: 'stretch',
                bgcolor: alpha(theme.palette.background.paper, 0.98),
                borderRadius: { md: '0 12px 12px 0', lg: '0 16px 16px 0' },
                boxShadow: theme.shadows[8],
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  flex: '1 1 0%',
                  minHeight: 0,
                  minWidth: 0,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  WebkitOverflowScrolling: 'touch',
                  overscrollBehavior: 'contain',
                  touchAction: 'pan-y',
                  position: 'relative',
                }}
              >
                {spotSheetBody}
              </Box>
            </Box>
          </>
        ) : null}

        <MapTagFilterSheet
          open={tagFilterSheetOpen}
          onClose={() => setTagFilterSheetOpen(false)}
          tagSections={tagSections}
          selectedSlugs={selectedTagSlugs}
          onSelectedSlugsChange={setSelectedTagSlugs}
          minRating={minRatingFilter}
          onMinRatingChange={setMinRatingFilter}
          sortMode={mapSortMode}
          onSortModeChange={setMapSortMode}
          openNow={openNowFilter}
          onOpenNowChange={setOpenNowFilter}
          loading={!tagCatalogLoaded}
        />
      </Stack>
    </SettingsDrillShell>
  );
}
