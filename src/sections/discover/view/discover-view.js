'use client';

import Image from 'next/image';
import dynamic from 'next/dynamic';
import PropTypes from 'prop-types';
// Aliased: a helper in this file already uses `m` as a local variable name.
import { m as motion, AnimatePresence } from 'framer-motion';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import List from '@mui/material/List';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';
import ListItemButton from '@mui/material/ListItemButton';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import { alpha, darken, useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { restaurantHrefWithFrom } from 'src/routes/restaurant-nav-from';
import { RouterLink, NAV_FORWARD_TRANSITION_TYPES } from 'src/routes/components';

import { useShareLink } from 'src/hooks/use-share-link';
import { usePrefersReducedMotion } from 'src/hooks/use-prefers-reduced-motion';

import { haversineKm } from 'src/utils/geo-distance';
import { USER_SCOPED_KEYS, clientScopedSetJson } from 'src/utils/user-scoped-storage';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { APP, NAV } from 'src/config-global';
import { useAuthContext } from 'src/auth/hooks';
import { hoverable } from 'src/theme/overrides/hoverable';
import { isCapacitorNative } from 'src/libs/capacitor/platform';
import { SPACE, RADIUS, TOUCH_TARGET_SIZE } from 'src/theme/spacing';
import { useAnalytics } from 'src/libs/analytics/analytics-provider';
import { listIdsByRestaurantIdsForUser } from 'src/libs/lists/actions';
import { useRestaurantTagsCatalog } from 'src/api/restaurant-tags-catalog';
import {
  RESTAURANT_SURFACE,
  useRestaurantAnalytics,
} from 'src/libs/analytics/restaurant-analytics';
import {
  fetchLocationLocalities,
  searchRestaurantsByName,
  fetchRestaurantsForHomeLocality,
} from 'src/auth/actions/location-actions';
import {
  updateDiscoverHomeMarket,
  syncDiscoverHomeFromDevice,
  syncDiscoverHomeToFallbackMarket,
} from 'src/auth/actions/discover-actions';

import Iconify from 'src/components/iconify';
import { ResponsiveSheet } from 'src/components/sheet-shell';
import { DashboardDelightEmpty } from 'src/components/dashboard';
import SearchAiToggleAdornment from 'src/components/search-ai-toggle';
import { ScrollableChipRow } from 'src/components/horizontal-scroll-row';
import ShareFeedbackSnackbar from 'src/components/share/share-feedback-snackbar';
import DashboardSearchFilterRow from 'src/components/dashboard-search-filter-row';

import MapSheetSortMenu from 'src/sections/map/map-sheet-sort-menu';
import MapSearchSuggestions from 'src/sections/map/map-search-suggestions';
import { MapSpotSheetListRow } from 'src/sections/map/map-spot-sheet-inner';
import DiscoverListsLeaderboard from 'src/sections/discover/discover-lists-leaderboard';
import DiscoverLocatingSkeleton from 'src/sections/discover/discover-locating-skeleton';
import DiscoverMarketListSkeleton from 'src/sections/discover/discover-market-list-skeleton';
import {
  mapPlaceMapsUrl,
  mapPlaceTelHref,
  mapPlaceNumericRating,
  mapPlaceTagLabelsCapped,
  mapPlaceFromListRestaurant,
  sortMapSheetPlacesByRecency,
  mapSheetViewerIdentityFromUser,
} from 'src/sections/map/map-spot-sheet-helpers';
import {
  SettingsDrillShell,
  dashboardPageRootSx,
  dashboardSectionLabelSx,
  dashboardSubsectionStackProps,
  settingsDrillFullBleedStripSx,
  dashboardMobileStretchButtonSx,
  dashboardPageSectionStackProps,
} from 'src/sections/profile/view';

const SaveToListSheet = dynamic(() => import('src/sections/lists/save-to-list-sheet'), {
  ssr: false,
});

const MAP_SHEET_LIST_ACTION_BTN_SIZE = 32;

/**
 * Discover feed pagination. The SSR feed and each "Show more" tap fetch one page
 * (`DISCOVER_FEED_PAGE_SIZE`); the offsetless RPC grows the limit and replaces the list with the
 * larger superset (existing rows keep their keys, so scroll position is preserved). `DISCOVER_FEED_MAX`
 * caps how far the feed can grow.
 */
const DISCOVER_FEED_PAGE_SIZE = 36;
const DISCOVER_FEED_MAX = 360;

function discoverMarketOptionLabel(row) {
  if (row == null || typeof row !== 'object') {
    return '';
  }
  const l = row.locality_name ?? row.localityName;
  const m = row.municipality_name ?? row.municipalityName;
  const c = row.city_name ?? row.cityName;
  const n = row.name;
  const s = String(l ?? m ?? c ?? n ?? '').trim();
  return s || '—';
}

/** Proximity reference from a locality row (centroid) when lat/lng are present. */
function discoverMarketProximityRef(row) {
  if (row == null || typeof row !== 'object') {
    return {};
  }
  const lat = row.latitude;
  const lng = row.longitude;
  if (
    typeof lat === 'number' &&
    Number.isFinite(lat) &&
    typeof lng === 'number' &&
    Number.isFinite(lng)
  ) {
    return { refLat: lat, refLng: lng };
  }
  return {};
}

/**
 * Proximity ref for discover feed fetches when sort is "distance". Falls back to market centroid,
 * manual location pick, or the SSR fallback ref — same precedence as pagination.
 */
function discoverFeedDistanceRef({
  geoRef,
  manual,
  manualMatches,
  localityRow,
  homeLocalityId,
  feedRefLat,
  feedRefLng,
}) {
  if (geoRef) {
    return { refLat: geoRef.lat, refLng: geoRef.lng };
  }
  const manualProximity =
    manualMatches &&
    manual &&
    typeof manual.refLat === 'number' &&
    Number.isFinite(manual.refLat) &&
    typeof manual.refLng === 'number' &&
    Number.isFinite(manual.refLng)
      ? { refLat: manual.refLat, refLng: manual.refLng }
      : {};
  if (manualProximity.refLat != null) {
    return manualProximity;
  }
  const marketProximity = discoverMarketProximityRef(localityRow);
  if (marketProximity.refLat != null) {
    return marketProximity;
  }
  if (
    !homeLocalityId &&
    typeof feedRefLat === 'number' &&
    Number.isFinite(feedRefLat) &&
    typeof feedRefLng === 'number' &&
    Number.isFinite(feedRefLng)
  ) {
    return { refLat: feedRefLat, refLng: feedRefLng };
  }
  return {};
}

// ----------------------------------------------------------------------

/**
 * Feed filter chip — quieter than the vibe stripe above it, which is a colourful
 * decision-making surface. These sit directly on the results and should read as controls.
 */
function discoverFeedChipSx(theme, selected) {
  return {
    flexShrink: 0,
    alignSelf: 'center',
    height: { xs: 36, sm: 32 },
    minHeight: { xs: 36, sm: 32 },
    borderRadius: RADIUS.pill,
    px: 1.5,
    py: 0,
    textTransform: 'none',
    bgcolor: selected ? 'primary.main' : 'transparent',
    border: `1px solid ${selected ? theme.palette.primary.main : theme.palette.divider}`,
    color: selected ? theme.palette.primary.contrastText : 'text.secondary',
    '& .MuiButton-startIcon': { marginRight: '5px', marginLeft: 0 },
    '&:hover': selected ? { bgcolor: 'primary.dark', borderColor: 'primary.dark' } : undefined,
  };
}

export default function DiscoverView({
  marketLabel,
  homeLocalityId,
  homeMunicipalityId = null,
  feedLocalityId = null,
  feedRefLat = null,
  feedRefLng = null,
  isFallbackMarket = false,
  restaurants = [],
  savedListIdsByRestaurant = {},
  listsLeaderboard = { interaction_leaders: [], follower_leaders: [], error: null },
}) {
  const theme = useTheme();
  const { t } = useTranslate();
  const router = useRouter();
  const { user } = useAuthContext();
  const { trackEvent } = useAnalytics();
  const restaurantAnalytics = useRestaurantAnalytics();
  const restaurantAnalyticsRef = useRef(restaurantAnalytics);
  restaurantAnalyticsRef.current = restaurantAnalytics;
  /** Once-per-market viewport impressions for discover feed rows. */
  const feedImpressedIdsRef = useRef(/** @type {Set<string>} */ (new Set()));
  const feedImpressionObserverRef = useRef(/** @type {IntersectionObserver | null} */ (null));
  const feedRowElsRef = useRef(/** @type {Map<string, Element>} */ (new Map()));
  const itemRefByIdRef = useRef(
    /** @type {Map<string, (el: HTMLElement | null) => void>} */ (new Map())
  );
  const prefersReducedMotion = usePrefersReducedMotion();
  const { tags: tagCatalog, loaded: tagCatalogLoaded } = useRestaurantTagsCatalog();
  const [saveSheetRestaurantId, setSaveSheetRestaurantId] = useState(
    /** @type {string | null} */ (null)
  );
  const [search, setSearch] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [nameSuggestions, setNameSuggestions] = useState(
    /** @type {Array<Record<string, unknown>>} */ ([])
  );
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [nameSuggestionsLoading, setNameSuggestionsLoading] = useState(false);
  const searchAnchorRef = useRef(null);

  /**
   * Which kind of search the bar performs. `'places'` is the name typeahead that filters the
   * feed by restaurant name; `'ai'` hands the query to the natural-language agent
   * (`handleAiSearch`). Mirrors the map page's split so the two searches are no longer blended
   * into one bar (typing filtered, Enter fired AI) with no way to tell which you were doing.
   * @type {['places' | 'ai', Function]}
   */
  const [searchMode, setSearchMode] = useState(/** @type {'places' | 'ai'} */ ('places'));
  const isAiSearchMode = searchMode === 'ai';
  /**
   * The query as a feed name-filter. In AI mode the query is a natural-language prompt (handed off
   * to the map on submit via `handleAiSearch`), so it must NOT live-filter the feed on every
   * keystroke — that would empty the feed while the user composes their question.
   */
  const effectiveFeedSearch = isAiSearchMode ? '' : search;
  const prevHomeLocalityIdRef = useRef(homeLocalityId);
  const prevDiscoverServerSortRef = useRef(/** @type {'relevance' | 'distance'} */ ('relevance'));
  const prevDiscoverGeoRefRef = useRef(/** @type {{ lat: number, lng: number } | null} */ (null));
  /** Client-owned feed after location/market pick — blocks SSR prop sync and duplicate fetches. */
  const manualFeedLocalityRef = useRef(
    /** @type {{ localityId: string, refLat?: number, refLng?: number } | null} */ (null)
  );
  const [discoverSortMode, setDiscoverSortMode] = useState(
    /** @type {'relevance' | 'distance' | 'recent'} */ ('relevance')
  );
  const [discoverGeoRef, setDiscoverGeoRef] = useState(
    /** @type {{ lat: number, lng: number } | null} */ (null)
  );
  const [discoverSortLocationError, setDiscoverSortLocationError] = useState(false);
  // A provisional (fallback) market already has a label + feed to show, so we're
  // not in the "locating…" state even though `homeLocalityId` is still null — the
  // background geolocation effect below refines it without blocking the UI.
  const [locResolving, setLocResolving] = useState(!homeLocalityId && !isFallbackMarket);
  const [feedRefetching, setFeedRefetching] = useState(false);
  const [feedRestaurants, setFeedRestaurants] = useState(restaurants);
  // Current feed page size. Grows by `DISCOVER_FEED_PAGE_SIZE` on "Show more"; reset to one page
  // whenever the feed is rebuilt for a new market/search (see the feed-refetch effect below).
  const [feedLimit, setFeedLimit] = useState(DISCOVER_FEED_PAGE_SIZE);
  /**
   * Selected vibe from the stripe below the leaderboard, filtering the feed in place.
   * `restaurants_for_municipality` has always accepted `p_vibe_key` — the AI search path
   * uses it (`restaurant-search-agent.js`) — but the feed passed null and the chips
   * navigated to the map instead, leaving their selected styling unreachable.
   */
  const [selectedVibeKey, setSelectedVibeKey] = useState(null);
  /**
   * Feed category. `null` is "Daily NomNoms" — the unfiltered feed — matching how the AI
   * search path already treats `daily` (`restaurant-search-agent.js` maps it to null before
   * calling the RPC). The copy for these chips has been translated in both locales, and
   * named in `BRAND.md` as shipped, since before the chips themselves existed.
   */
  const [selectedCategoryKey, setSelectedCategoryKey] = useState(null);
  /** Filters the feed to spots open right now, using the status resolved server-side. */
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [prevSavedByRestaurant, setPrevSavedByRestaurant] = useState(savedListIdsByRestaurant);
  const [savedByRestaurant, setSavedByRestaurant] = useState(savedListIdsByRestaurant);
  if (savedListIdsByRestaurant !== prevSavedByRestaurant) {
    setPrevSavedByRestaurant(savedListIdsByRestaurant);
    setSavedByRestaurant(savedListIdsByRestaurant);
  }
  const [marketDialogOpen, setMarketDialogOpen] = useState(false);
  const [marketOptions, setMarketOptions] = useState(
    /** @type {Array<Record<string, unknown>>} */ ([])
  );
  const [marketOptionsLoading, setMarketOptionsLoading] = useState(false);
  const [marketSearchQuery, setMarketSearchQuery] = useState('');
  const [marketSaveBusy, setMarketSaveBusy] = useState(false);
  const [marketSaveError, setMarketSaveError] = useState(/** @type {string | null} */ (null));
  const [useLocationBusy, setUseLocationBusy] = useState(false);
  const [useLocationError, setUseLocationError] = useState(/** @type {string | null} */ (null));
  const [prevMarketLabel, setPrevMarketLabel] = useState(marketLabel);
  const [activeMarketLabel, setActiveMarketLabel] = useState(marketLabel);
  if (marketLabel !== prevMarketLabel) {
    setPrevMarketLabel(marketLabel);
    setActiveMarketLabel(marketLabel);
  }
  const activeMarketLabelRef = useRef(activeMarketLabel);
  activeMarketLabelRef.current = activeMarketLabel;

  useEffect(() => {
    feedImpressedIdsRef.current.clear();
    const observer = feedImpressionObserverRef.current;
    if (!observer) return;
    feedRowElsRef.current.forEach((el) => {
      observer.observe(el);
    });
  }, [homeLocalityId, activeMarketLabel]);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = entry.target.getAttribute('data-restaurant-id');
          if (!id || feedImpressedIdsRef.current.has(id)) return;
          feedImpressedIdsRef.current.add(id);
          restaurantAnalyticsRef.current.trackFeedImpression({
            restaurant_id: id,
            market_label: activeMarketLabelRef.current || undefined,
          });
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.4 }
    );
    feedImpressionObserverRef.current = observer;

    feedRowElsRef.current.forEach((el, id) => {
      if (!feedImpressedIdsRef.current.has(id)) observer.observe(el);
    });

    return () => {
      observer.disconnect();
      feedImpressionObserverRef.current = null;
    };
  }, []);

  const setFeedRowRef = useCallback((id, el) => {
    const key = String(id);
    const observer = feedImpressionObserverRef.current;
    const prev = feedRowElsRef.current.get(key);
    if (prev && observer) observer.unobserve(prev);

    if (el) {
      el.setAttribute('data-restaurant-id', key);
      feedRowElsRef.current.set(key, el);
      if (observer && !feedImpressedIdsRef.current.has(key)) observer.observe(el);
    } else {
      feedRowElsRef.current.delete(key);
    }
  }, []);

  const getFeedItemRef = useCallback(
    (id) => {
      const key = String(id);
      const cache = itemRefByIdRef.current;
      let fn = cache.get(key);
      if (!fn) {
        fn = (el) => setFeedRowRef(key, el);
        cache.set(key, fn);
      }
      return fn;
    },
    [setFeedRowRef]
  );

  const handleDiscoverSortChange = useCallback(
    (mode) => {
      setDiscoverSortLocationError(false);
      if (mode !== 'distance') {
        setDiscoverSortMode(mode);
        return;
      }
      if (discoverGeoRef) {
        setDiscoverSortMode('distance');
        return;
      }
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        setDiscoverSortLocationError(true);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setDiscoverGeoRef({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setDiscoverSortMode('distance');
        },
        () => {
          setDiscoverSortLocationError(true);
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 120_000 }
      );
    },
    [discoverGeoRef]
  );

  /** Server fetch ignores "recent" — that mode reorders client-side only. */
  const discoverServerSortMode = discoverSortMode === 'recent' ? 'relevance' : discoverSortMode;

  const sortedFeedRestaurants = useMemo(() => {
    const base = feedRestaurants;
    if (base.length < 2) return base;
    if (discoverSortMode === 'recent') {
      return sortMapSheetPlacesByRecency(base);
    }
    if (discoverSortMode === 'distance' && discoverGeoRef) {
      return base
        .map((r, i) => ({
          r,
          i,
          d: haversineKm(
            discoverGeoRef.lat,
            discoverGeoRef.lng,
            Number(r?.latitude),
            Number(r?.longitude)
          ),
        }))
        .sort((a, b) => (a.d !== b.d ? a.d - b.d : a.i - b.i))
        .map((x) => x.r);
    }
    return base;
  }, [feedRestaurants, discoverSortMode, discoverGeoRef]);

  /**
   * "Open now" filters client-side rather than server-side: `openingStatus` is already
   * resolved onto these rows by `fetchRestaurantsForHomeLocality`, so no RPC change is
   * needed. Rows whose hours are unknown are kept — hiding a place because ingest failed
   * is worse than showing it — so this narrows rather than guarantees.
   */
  const displayRestaurants = useMemo(() => {
    if (!openNowOnly) return sortedFeedRestaurants;
    return sortedFeedRestaurants.filter((r) => r?.openingStatus?.status !== 'closed');
  }, [sortedFeedRestaurants, openNowOnly]);

  // Locality the feed is anchored to: the saved home market, or the provisional fallback locality
  // (so "Show more" paginates the fallback feed before GPS resolves a saved market).
  const feedLocalityIdEffective = homeLocalityId ?? feedLocalityId;

  const viewerIdentity = useMemo(() => mapSheetViewerIdentityFromUser(user), [user]);

  const listRowActionBtnSx = useMemo(() => {
    const borderAlpha = theme.palette.mode === 'dark' ? 0.2 : 0.55;
    return {
      width: MAP_SHEET_LIST_ACTION_BTN_SIZE,
      height: MAP_SHEET_LIST_ACTION_BTN_SIZE,
      p: 0,
      flexShrink: 0,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '50%',
      bgcolor: (tt) => alpha(tt.palette.background.paper, 0.96),
      boxShadow: theme.shadows[2],
      color: 'text.primary',
      border: `1px solid ${alpha(theme.palette.common.white, borderAlpha)}`,
      WebkitTapHighlightColor: 'transparent',
      ...hoverable({ bgcolor: (tt) => alpha(tt.palette.background.paper, 0.98) }),
    };
  }, [theme]);

  const handleDiscoverRowSelect = useCallback(
    (id) => {
      router.push(restaurantHrefWithFrom(paths.dashboard.restaurant(id), 'discover'), {
        transitionTypes: ['nav-forward'],
      });
    },
    [router]
  );

  const {
    share: shareLink,
    feedback: shareFeedback,
    dismissFeedback: dismissShareFeedback,
  } = useShareLink();

  const handleDiscoverRowShare = useCallback(
    async (row) => {
      restaurantAnalytics.trackShareClicked({
        restaurant_id: String(row.id),
        surface: RESTAURANT_SURFACE.DISCOVER_FEED,
      });
      const base = typeof window !== 'undefined' ? window.location.origin : '';
      await shareLink({ url: `${base}${paths.restaurantPublic(row.id)}`, title: row.name });
    },
    [restaurantAnalytics, shareLink]
  );

  const handleDiscoverRowListSave = useCallback((id) => {
    setSaveSheetRestaurantId(id != null ? String(id) : null);
  }, []);

  const handleDiscoverSaveSheetClose = useCallback(() => {
    setSaveSheetRestaurantId(null);
  }, []);

  const handleDiscoverSaveApplied = useCallback(() => {
    setSaveSheetRestaurantId(null);
    router.refresh();
  }, [router]);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(search.trim()), 120);
    return () => clearTimeout(id);
  }, [search]);

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
      .then(({ restaurants: rows, error }) => {
        if (cancelled) return;
        if (error) {
          console.warn('[DiscoverView] searchRestaurantsByName:', error);
          setNameSuggestions([]);
        } else {
          setNameSuggestions(rows ?? []);
        }
      })
      .finally(() => {
        if (!cancelled) setNameSuggestionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, isAiSearchMode]);

  const { inMarketSuggestions, elsewhereSuggestions } = useMemo(() => {
    if (!nameSuggestions.length) {
      return { inMarketSuggestions: [], elsewhereSuggestions: [] };
    }
    const inMarket = [];
    const elsewhere = [];
    nameSuggestions.forEach((r) => {
      if (homeMunicipalityId && r?.municipality_id === homeMunicipalityId) {
        inMarket.push(r);
      } else {
        elsewhere.push(r);
      }
    });
    return { inMarketSuggestions: inMarket, elsewhereSuggestions: elsewhere };
  }, [nameSuggestions, homeMunicipalityId]);

  const handleSuggestionPick = useCallback(
    (row) => {
      if (!row?.id) return;
      const strId = String(row.id);
      trackEvent('discover_search_suggestion_picked', { restaurant_id: strId, destination: 'map' });
      setSuggestionsOpen(false);
      // Open the picked spot on the map instead of the detail page: stash it in the map's
      // selected-spot slot — the map restores it on mount (flies to the pin + opens the spot
      // sheet) — then navigate there. The suggestion row already carries id/name/lat/lng/address.
      const [segA, segB] = USER_SCOPED_KEYS.mapSelectedSpot;
      clientScopedSetJson(user?.id ?? null, segA, segB, { id: strId, row });
      router.push(paths.dashboard.map, { transitionTypes: ['nav-forward'] });
    },
    [router, trackEvent, user?.id]
  );

  const handleSuggestionsClose = useCallback(() => {
    setSuggestionsOpen(false);
  }, []);

  const handleSearchModeChange = useCallback(
    (nextMode) => {
      if (nextMode !== 'places' && nextMode !== 'ai') return;
      setSearchMode((prev) => {
        if (prev === nextMode) return prev;
        if (nextMode === 'places') {
          // Leaving AI: reopen the typeahead if there's a query to match.
          setSuggestionsOpen(!!search.trim());
        } else {
          // Entering AI: the name typeahead has no meaning here.
          setSuggestionsOpen(false);
        }
        trackEvent('discover_search_ai_changed', { mode: nextMode });
        return nextMode;
      });
    },
    [search, trackEvent]
  );

  const discoverGlassPanel = useMemo(
    () => ({
      bgcolor: alpha(theme.palette.background.paper, 0.98),
      border: `1px solid ${alpha(theme.palette.divider, theme.palette.mode === 'dark' ? 0.9 : 1)}`,
      boxShadow: theme.shadows[8],
    }),
    [theme]
  );

  useEffect(() => {
    if (homeLocalityId) {
      setLocResolving(false);
    }
  }, [homeLocalityId]);

  useEffect(() => {
    if (!user?.id) {
      return undefined;
    }
    const ids = [...new Set(displayRestaurants.map((r) => r.id).filter(Boolean))];
    if (ids.length === 0) {
      return undefined;
    }
    let cancelled = false;
    listIdsByRestaurantIdsForUser(ids).then(({ map, error }) => {
      if (cancelled || error || !map) {
        if (error) {
          console.warn('[DiscoverView] listIdsByRestaurantIdsForUser:', error);
        }
        return;
      }
      setSavedByRestaurant((prev) => {
        const next = { ...prev };
        ids.forEach((id) => {
          next[id] = map[id] ?? [];
        });
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [displayRestaurants, user?.id]);

  useEffect(() => {
    if (!marketDialogOpen) {
      return undefined;
    }
    let cancelled = false;
    setMarketOptionsLoading(true);
    setMarketSaveError(null);
    setMarketSearchQuery('');
    fetchLocationLocalities().then(({ locations, error }) => {
      if (cancelled) {
        return;
      }
      setMarketOptionsLoading(false);
      if (error) {
        setMarketSaveError(t('pages.dashboard.discover.market_change_load_error'));
        setMarketOptions([]);
        return;
      }
      const rows = Array.isArray(locations) ? locations : [];
      const sorted = [...rows].sort((a, b) =>
        discoverMarketOptionLabel(a).localeCompare(discoverMarketOptionLabel(b), undefined, {
          sensitivity: 'base',
        })
      );
      setMarketOptions(sorted);
    });
    return () => {
      cancelled = true;
    };
  }, [marketDialogOpen, t]);

  useEffect(() => {
    setDiscoverSortMode('relevance');
    setDiscoverSortLocationError(false);
  }, [homeLocalityId]);

  useEffect(() => {
    if (!homeLocalityId) {
      return undefined;
    }
    const qNorm = String(effectiveFeedSearch ?? '')
      .toLowerCase()
      .trim();
    const needsRpc = qNorm !== '';
    const localityChanged = prevHomeLocalityIdRef.current !== homeLocalityId;
    const sortChanged =
      prevDiscoverServerSortRef.current !== discoverServerSortMode ||
      (discoverServerSortMode === 'distance' &&
        (prevDiscoverGeoRefRef.current?.lat !== discoverGeoRef?.lat ||
          prevDiscoverGeoRefRef.current?.lng !== discoverGeoRef?.lng));
    const homeIdNorm = String(homeLocalityId ?? '')
      .trim()
      .toLowerCase();
    const manual = manualFeedLocalityRef.current;
    const manualMatches =
      manual &&
      String(manual.localityId ?? '')
        .trim()
        .toLowerCase() === homeIdNorm;

    if (localityChanged && manual && !manualMatches) {
      manualFeedLocalityRef.current = null;
    }

    prevHomeLocalityIdRef.current = homeLocalityId;
    prevDiscoverServerSortRef.current = discoverServerSortMode;
    prevDiscoverGeoRefRef.current = discoverGeoRef;

    if (manualMatches && !needsRpc && !sortChanged) {
      return undefined;
    }

    if (!needsRpc && !localityChanged && !sortChanged) {
      setFeedRestaurants(restaurants);
      setFeedLimit(DISCOVER_FEED_PAGE_SIZE);
      return undefined;
    }

    // New market/search/sort rebuilds the feed → collapse pagination back to the first page.
    setFeedLimit(DISCOVER_FEED_PAGE_SIZE);

    let cancelled = false;
    setFeedRefetching(true);
    const localityRow = marketOptions.find(
      (row) =>
        String(row?.id ?? '')
          .trim()
          .toLowerCase() === homeIdNorm
    );
    const distanceRef =
      discoverServerSortMode === 'distance'
        ? discoverFeedDistanceRef({
            geoRef: discoverGeoRef,
            manual,
            manualMatches,
            localityRow,
            homeLocalityId,
            feedRefLat,
            feedRefLng,
          })
        : {};
    fetchRestaurantsForHomeLocality(homeLocalityId, {
      tagSlugs: null,
      matchAll: false,
      search: effectiveFeedSearch.trim() || null,
      vibeKey: selectedVibeKey,
      categoryKey: selectedCategoryKey,
      limit: DISCOVER_FEED_PAGE_SIZE,
      ...distanceRef,
    }).then(({ restaurants: rows, error }) => {
      if (cancelled) return;
      setFeedRefetching(false);
      if (error) {
        console.warn('[DiscoverView] fetchRestaurantsForHomeLocality:', error);
        return;
      }
      setFeedRestaurants(rows ?? []);
    });
    return () => {
      cancelled = true;
      setFeedRefetching(false);
    };
  }, [
    homeLocalityId,
    effectiveFeedSearch,
    restaurants,
    marketOptions,
    discoverServerSortMode,
    discoverGeoRef,
    feedRefLat,
    feedRefLng,
    selectedVibeKey,
    selectedCategoryKey,
  ]);

  // "Show more": grow the page size and refetch the larger superset (the RPC has no offset).
  // Replacing the list keeps existing rows' keys, so scroll position is preserved. Runs on its own
  // `loadingMore` flag (button spinner) instead of the feed-refetch effect's full-skeleton path.
  const handleLoadMoreFeed = useCallback(async () => {
    if (!feedLocalityIdEffective || loadingMore) {
      return;
    }
    const nextLimit = Math.min(DISCOVER_FEED_MAX, feedLimit + DISCOVER_FEED_PAGE_SIZE);
    if (nextLimit <= feedLimit) {
      return;
    }
    const homeIdNorm = String(feedLocalityIdEffective ?? '')
      .trim()
      .toLowerCase();
    const localityRow = marketOptions.find(
      (row) =>
        String(row?.id ?? '')
          .trim()
          .toLowerCase() === homeIdNorm
    );
    const manual = manualFeedLocalityRef.current;
    const manualMatches =
      manual &&
      String(manual.localityId ?? '')
        .trim()
        .toLowerCase() === homeIdNorm;
    const distanceRef =
      discoverServerSortMode === 'distance'
        ? discoverFeedDistanceRef({
            geoRef: discoverGeoRef,
            manual,
            manualMatches,
            localityRow,
            homeLocalityId,
            feedRefLat,
            feedRefLng,
          })
        : {};

    setLoadingMore(true);
    trackEvent('discover_feed_load_more', {
      home_locality_id: feedLocalityIdEffective,
      next_limit: nextLimit,
    });
    try {
      const { restaurants: rows, error } = await fetchRestaurantsForHomeLocality(
        feedLocalityIdEffective,
        {
          tagSlugs: null,
          matchAll: false,
          search: search.trim() || null,
          vibeKey: selectedVibeKey,
          categoryKey: selectedCategoryKey,
          limit: nextLimit,
          ...distanceRef,
        }
      );
      if (error) {
        console.warn('[DiscoverView] handleLoadMoreFeed:', error);
        return;
      }
      setFeedRestaurants(rows ?? []);
      setFeedLimit(nextLimit);
    } finally {
      setLoadingMore(false);
    }
  }, [
    feedLocalityIdEffective,
    homeLocalityId,
    feedRefLat,
    feedRefLng,
    loadingMore,
    feedLimit,
    selectedVibeKey,
    selectedCategoryKey,
    marketOptions,
    search,
    trackEvent,
    discoverServerSortMode,
    discoverGeoRef,
  ]);

  const handleAiSearch = useCallback(() => {
    const q = search.trim();
    if (!q) {
      return;
    }
    trackEvent('discover_ai_search_submitted', {
      home_locality_id: homeLocalityId,
      query_length: q.length,
      destination: 'map',
    });
    // Hand the natural-language query to the map rather than rendering results inline: the map
    // runs the AI search with its richer viewport scoping + fallback widening, and surfaces the
    // AI's derived tag/rating filters in its own filter UI. The map reads + clears this on mount.
    const [segA, segB] = USER_SCOPED_KEYS.mapPendingAiQuery;
    clientScopedSetJson(user?.id ?? null, segA, segB, { query: q });
    router.push(paths.dashboard.map, { transitionTypes: ['nav-forward'] });
  }, [homeLocalityId, router, search, trackEvent, user?.id]);

  useEffect(() => {
    if (homeLocalityId) {
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.geolocation) {
          await syncDiscoverHomeToFallbackMarket();
          return;
        }
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            // Short timeout: this blocks the first feed paint, so fall back to the
            // default market quickly rather than holding the LCP element for 12s
            // while the permission prompt sits unanswered. A cached fix returns instantly.
            timeout: 6_000,
            maximumAge: 300_000,
          });
        });
        const sync = await syncDiscoverHomeFromDevice(pos.coords.longitude, pos.coords.latitude);
        if (!sync.ok) {
          await syncDiscoverHomeToFallbackMarket();
        }
      } catch {
        await syncDiscoverHomeToFallbackMarket();
      } finally {
        if (!cancelled) {
          await router.refresh();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [homeLocalityId, router]);

  const showDiscoverLocating = locResolving && restaurants.length === 0;
  const showDiscoverRefetching = !showDiscoverLocating && feedRefetching;
  const showDiscoverFeedEmpty =
    !showDiscoverLocating && !showDiscoverRefetching && displayRestaurants.length === 0;
  // Offsetless heuristic: a full page back implies there may be more. A short page means we got
  // everything. Hidden at the cap.
  const showDiscoverLoadMore =
    !!feedLocalityIdEffective &&
    feedLimit < DISCOVER_FEED_MAX &&
    feedRestaurants.length >= feedLimit;
  const showDiscoverSortControl =
    !showDiscoverLocating &&
    !showDiscoverRefetching &&
    !showDiscoverFeedEmpty &&
    feedRestaurants.length > 1;

  /**
   * Toggle a vibe. Tapping the selected chip clears it, so the feed is always one tap
   * from unfiltered — there is no separate "clear" control to hunt for.
   */
  const toggleVibe = useCallback(
    (key) => {
      setSelectedVibeKey((prev) => {
        const next = prev === key ? null : key;
        trackEvent('discover_vibe_selected', { vibe_key: next ?? prev, selected: next !== null });
        // Reset paging: the filtered set is a different result set, not more of the same one.
        setFeedLimit(DISCOVER_FEED_PAGE_SIZE);
        return next;
      });
    },
    [trackEvent]
  );

  /** `null` is the default "Daily NomNoms" feed; re-tapping the active chip returns to it. */
  const selectCategory = useCallback(
    (key) => {
      setSelectedCategoryKey((prev) => {
        const next = prev === key ? null : key;
        trackEvent('discover_category_selected', { category_key: next ?? 'daily' });
        setFeedLimit(DISCOVER_FEED_PAGE_SIZE);
        return next;
      });
    },
    [trackEvent]
  );

  const toggleOpenNow = useCallback(() => {
    setOpenNowOnly((prev) => {
      trackEvent('discover_open_now_toggled', { enabled: !prev });
      return !prev;
    });
  }, [trackEvent]);

  /** `key: null` is the default chip — the RPC treats "daily" as no category filter. */
  const categories = useMemo(
    () => [
      { key: null, label: t('pages.dashboard.discover.cat_daily') },
      { key: 'coffee', label: t('pages.dashboard.discover.cat_coffee') },
      { key: 'hidden', label: t('pages.dashboard.discover.cat_hidden') },
      { key: 'datecat', label: t('pages.dashboard.discover.cat_date') },
    ],
    [t]
  );

  const vibes = useMemo(
    () => [
      {
        key: 'date',
        label: t('pages.dashboard.discover.vibe_date'),
        icon: ic.heartBold,
        bg: alpha(theme.palette.error.main, 0.08),
        border: alpha(theme.palette.error.main, 0.22),
        color: theme.palette.error.main,
        selectedBg: theme.palette.error.dark,
        selectedColor: theme.palette.error.contrastText,
      },
      {
        key: 'friends',
        label: t('pages.dashboard.discover.vibe_friends'),
        icon: ic.usersGroupTwoRoundedBold,
        bg: alpha(theme.palette.info.main, 0.1),
        border: alpha(theme.palette.info.main, 0.22),
        color: theme.palette.info.main,
        selectedBg: theme.palette.info.dark,
        selectedColor: theme.palette.info.contrastText,
      },
      {
        key: 'cheap',
        label: t('pages.dashboard.discover.vibe_cheap'),
        icon: ic.walletBold,
        bg: alpha(theme.palette.success.main, 0.1),
        border: alpha(theme.palette.success.main, 0.22),
        color: theme.palette.success.darker,
        selectedBg: darken(theme.palette.success.darker, 0.18),
        selectedColor: theme.palette.common.white,
      },
      {
        key: 'corporate',
        label: t('pages.dashboard.discover.vibe_corporate'),
        icon: ic.briefcase,
        bg: alpha(theme.palette.grey[500], 0.1),
        border: alpha(theme.palette.grey[500], 0.28),
        color: theme.palette.text.primary,
        selectedBg:
          theme.palette.mode === 'light' ? theme.palette.grey[800] : theme.palette.grey[700],
        selectedColor: theme.palette.common.white,
      },
    ],
    [t, theme]
  );

  const isMarketLabelLoading = locResolving || useLocationBusy || marketSaveBusy;
  const showMarketHint = Boolean(activeMarketLabel) || isMarketLabelLoading;
  const marketDisplayLabel = isMarketLabelLoading ? '...' : activeMarketLabel;

  const handlePickDiscoverMarket = useCallback(
    async (nextId) => {
      const id = nextId != null ? String(nextId).trim().toLowerCase() : '';
      if (
        !id ||
        id ===
          String(homeLocalityId ?? '')
            .trim()
            .toLowerCase()
      ) {
        setMarketDialogOpen(false);
        return;
      }
      const pickedRow = marketOptions.find(
        (row) =>
          String(row?.id ?? '')
            .trim()
            .toLowerCase() === id
      );
      const nextLabel = discoverMarketOptionLabel(pickedRow);

      setMarketSaveError(null);
      setMarketDialogOpen(false);
      setMarketSaveBusy(true);
      setSearch('');
      setFeedLimit(DISCOVER_FEED_PAGE_SIZE);
      setFeedRefetching(true);

      try {
        const result = await updateDiscoverHomeMarket(id);
        if (!result?.ok) {
          setMarketSaveError(t('pages.dashboard.discover.market_change_error'));
          trackEvent('discover_market_change_failed', {
            market_id: id,
          });
          return;
        }
        trackEvent('discover_market_changed', {
          market_id: id,
        });
        if (nextLabel) {
          setActiveMarketLabel(nextLabel);
        }
        const marketProximity = discoverMarketProximityRef(pickedRow);
        manualFeedLocalityRef.current = { localityId: id, ...marketProximity };
        prevHomeLocalityIdRef.current = id;
        const { restaurants: rows, error } = await fetchRestaurantsForHomeLocality(id, {
          limit: 36,
        });
        if (!error) {
          setFeedRestaurants(rows ?? []);
        }
        await router.refresh();
      } finally {
        setFeedRefetching(false);
        setMarketSaveBusy(false);
      }
    },
    [homeLocalityId, marketOptions, router, t, trackEvent]
  );

  const handleMarketClose = useCallback(() => {
    setMarketDialogOpen(false);
  }, []);

  const handleUseCurrentLocation = useCallback(async () => {
    if (useLocationBusy || marketSaveBusy) {
      return;
    }
    setUseLocationError(null);
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setUseLocationError(t('pages.dashboard.discover.market_use_location_unavailable'));
      return;
    }
    setUseLocationBusy(true);
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 12_000,
          maximumAge: 0,
        });
      });
      const sync = await syncDiscoverHomeFromDevice(pos.coords.longitude, pos.coords.latitude);
      if (!sync.ok) {
        setUseLocationError(t('pages.dashboard.discover.market_use_location_failed'));
        trackEvent('discover_market_from_location_failed');
        return;
      }
      trackEvent('discover_market_from_location_updated');
      setSearch('');
      setFeedLimit(DISCOVER_FEED_PAGE_SIZE);
      if (sync.localityName) {
        setActiveMarketLabel(sync.localityName);
      }
      const { localityId } = sync;
      if (!localityId) {
        setUseLocationError(t('pages.dashboard.discover.market_use_location_failed'));
        return;
      }
      manualFeedLocalityRef.current = {
        localityId,
        refLat: pos.coords.latitude,
        refLng: pos.coords.longitude,
      };
      setDiscoverGeoRef({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      prevHomeLocalityIdRef.current = localityId;
      setFeedRefetching(true);
      const { restaurants: rows, error } = await fetchRestaurantsForHomeLocality(localityId, {
        limit: 36,
      });
      if (!error) {
        setFeedRestaurants(rows ?? []);
      }
      await router.refresh();
    } catch {
      setUseLocationError(t('pages.dashboard.discover.market_use_location_denied'));
      trackEvent('discover_market_from_location_denied');
    } finally {
      setFeedRefetching(false);
      setUseLocationBusy(false);
    }
  }, [useLocationBusy, marketSaveBusy, router, t, trackEvent]);

  const discoverLeading = useMemo(
    () => (
      <Box
        component={RouterLink}
        href={paths.dashboard.discover}
        sx={{
          textDecoration: 'none',
          color: 'inherit',
          display: 'flex',
          alignItems: 'center',
          py: 0.5,
          minWidth: 0,
          alignSelf: 'stretch',
        }}
        aria-label={t('pages.dashboard.discover.brand_aria')}
      >
        {/* Fixed-size next/image: reserves exact space (no CLS on load) and serves an
            optimized raster instead of the raw 533 KB PNG in the dashboard header. */}
        <Box sx={{ position: 'relative', height: { xs: 26, sm: 30 }, width: { xs: 59, sm: 68 } }}>
          <Image
            src="/logo/logo_single.png"
            alt={APP.name}
            fill
            sizes="68px"
            style={{ objectFit: 'contain' }}
          />
        </Box>
      </Box>
    ),
    [t]
  );

  const discoverToolbarFooter = useMemo(() => {
    const searchEndAdornment = (
      <SearchAiToggleAdornment
        mode={searchMode}
        onModeChange={handleSearchModeChange}
        hasQuery={!!search.trim()}
        onClear={() => {
          setSearch('');
          setSuggestionsOpen(false);
        }}
        onSubmit={() => handleAiSearch()}
      />
    );

    return (
      <Stack spacing={1} sx={{ width: 1 }}>
        <Box ref={searchAnchorRef} sx={{ position: 'relative', width: 1 }}>
          <DashboardSearchFilterRow
            variant="glass"
            glassSx={discoverGlassPanel}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (!isAiSearchMode) setSuggestionsOpen(true);
            }}
            placeholder={
              isAiSearchMode
                ? t('pages.dashboard.discover.ai_search_placeholder')
                : t('pages.dashboard.discover.search_placeholder')
            }
            filter={
              <IconButton
                component={RouterLink}
                href={`${paths.dashboard.map}?filters=open`}
                transitionTypes={NAV_FORWARD_TRANSITION_TYPES}
                onClick={() => trackEvent('discover_map_filters_opened')}
                aria-label={t('pages.dashboard.discover.filter_aria')}
              >
                <Iconify icon={ic.tuningLinear} width={20} />
              </IconButton>
            }
            stackProps={{ spacing: 1.25 }}
            TextFieldProps={{
              autoComplete: 'off',
              inputProps: {
                enterKeyHint: 'search',
                style: { fontSize: '16px' },
              },
              onFocus: () => {
                if (!isAiSearchMode && search.trim()) setSuggestionsOpen(true);
              },
              onKeyDown: (e) => {
                if (e.key === 'Escape') {
                  setSuggestionsOpen(false);
                  return;
                }
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setSuggestionsOpen(false);
                  // Places mode filters by name via the typeahead — Enter just dismisses it.
                  // Only AI mode hands the query to the agent.
                  if (isAiSearchMode) handleAiSearch();
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
              (nameSuggestionsLoading ||
                inMarketSuggestions.length > 0 ||
                elsewhereSuggestions.length > 0)
            }
            anchorEl={searchAnchorRef.current}
            query={debouncedQuery}
            inViewRows={inMarketSuggestions}
            elsewhereRows={elsewhereSuggestions}
            loading={nameSuggestionsLoading}
            onPick={handleSuggestionPick}
            onClose={handleSuggestionsClose}
          />
        </Box>
      </Stack>
    );
  }, [
    search,
    t,
    searchMode,
    isAiSearchMode,
    handleSearchModeChange,
    handleAiSearch,
    discoverGlassPanel,
    suggestionsOpen,
    debouncedQuery,
    nameSuggestionsLoading,
    inMarketSuggestions,
    elsewhereSuggestions,
    handleSuggestionPick,
    handleSuggestionsClose,
    trackEvent,
    theme,
  ]);

  const marketSearchNormalized = marketSearchQuery.trim().toLowerCase();
  const filteredMarketOptions = useMemo(() => {
    if (!marketSearchNormalized) {
      return marketOptions;
    }
    return marketOptions.filter((row) =>
      discoverMarketOptionLabel(row).toLowerCase().includes(marketSearchNormalized)
    );
  }, [marketOptions, marketSearchNormalized]);

  let marketChangeDialogBody = null;
  if (marketOptionsLoading) {
    marketChangeDialogBody = <DiscoverMarketListSkeleton />;
  } else if (!marketSaveError && marketOptions.length === 0) {
    marketChangeDialogBody = (
      <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 3 }}>
        {t('pages.dashboard.discover.market_change_empty')}
      </Typography>
    );
  } else if (marketOptions.length > 0) {
    marketChangeDialogBody = (
      <Box>
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 1,
            bgcolor: 'background.paper',
            px: 2,
            py: 1.5,
            borderBottom: (tt) => `1px solid ${tt.palette.divider}`,
          }}
        >
          <TextField
            fullWidth
            size="small"
            autoFocus={!isCapacitorNative()}
            value={marketSearchQuery}
            onChange={(e) => setMarketSearchQuery(e.target.value)}
            placeholder={t('pages.dashboard.discover.market_change_search_placeholder')}
            aria-label={t('pages.dashboard.discover.market_change_search_placeholder')}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon={ic.searchLinear} width={18} />
                </InputAdornment>
              ),
            }}
          />
        </Box>
        {filteredMarketOptions.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 3 }}>
            {t('pages.dashboard.discover.market_change_search_empty')}
          </Typography>
        ) : (
          <List disablePadding dense>
            {filteredMarketOptions.map((row) => {
              const id = row?.id != null ? String(row.id) : '';
              const label = discoverMarketOptionLabel(row);
              const selected =
                id && homeLocalityId && id === String(homeLocalityId).trim().toLowerCase();
              return (
                <ListItemButton
                  key={id || label}
                  selected={Boolean(selected)}
                  disabled={marketSaveBusy || !id}
                  onClick={() => handlePickDiscoverMarket(id)}
                >
                  <ListItemText primary={label} primaryTypographyProps={{ fontWeight: 600 }} />
                </ListItemButton>
              );
            })}
          </List>
        )}
      </Box>
    );
  }

  return (
    <SettingsDrillShell
      title=""
      compactToolbar
      leadingSlot={discoverLeading}
      toolbarFooter={discoverToolbarFooter}
      backHref={paths.dashboard.discover}
      backAriaLabel={t('pages.dashboard.discover.document_title')}
    >
      <Box data-testid="e2e-discover-view" sx={dashboardPageRootSx}>
        <Stack {...dashboardPageSectionStackProps}>
          {showMarketHint ? (
            <Stack spacing={0.5}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={1}
                sx={{ flexWrap: 'wrap', gap: 0.5 }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                  aria-busy={isMarketLabelLoading}
                  sx={{ fontWeight: 600, minWidth: 0 }}
                >
                  {t('pages.dashboard.discover.market_context', { market: marketDisplayLabel })}
                </Typography>
                <Stack direction="row" alignItems="center" spacing={0.25} sx={{ flexShrink: 0 }}>
                  <Tooltip title={t('pages.dashboard.discover.market_use_location_aria')}>
                    <span>
                      <IconButton
                        color="primary"
                        onClick={handleUseCurrentLocation}
                        disabled={marketSaveBusy || useLocationBusy}
                        aria-label={t('pages.dashboard.discover.market_use_location_aria')}
                        sx={{ width: TOUCH_TARGET_SIZE, height: TOUCH_TARGET_SIZE, p: 0 }}
                      >
                        {useLocationBusy ? (
                          <CircularProgress size={18} thickness={5} />
                        ) : (
                          <Iconify icon={ic.mapPointBold} width={20} />
                        )}
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Button
                    size="small"
                    variant="text"
                    color="primary"
                    onClick={() => {
                      setMarketSaveError(null);
                      setUseLocationError(null);
                      setMarketDialogOpen(true);
                    }}
                    disabled={marketSaveBusy}
                    sx={{
                      fontWeight: 700,
                      flexShrink: 0,
                      textTransform: 'none',
                      minHeight: TOUCH_TARGET_SIZE,
                    }}
                  >
                    {t('pages.dashboard.discover.market_context_change')}
                  </Button>
                </Stack>
              </Stack>
              {useLocationError ? (
                <Typography variant="caption" color="error" sx={{ display: 'block' }}>
                  {useLocationError}
                </Typography>
              ) : null}
              {marketSaveError ? (
                <Typography variant="caption" color="error" sx={{ display: 'block' }}>
                  {marketSaveError}
                </Typography>
              ) : null}
            </Stack>
          ) : null}

          <ResponsiveSheet
            open={marketDialogOpen}
            onClose={handleMarketClose}
            titleId="discover-market-dialog-title"
            maxWidth="sm"
            mobileSheetSx={{
              minHeight: 'min(75dvh, calc(100dvh - env(safe-area-inset-top, 0px) - 48px))',
            }}
            title={
              <Typography
                id="discover-market-dialog-title"
                variant="subtitle1"
                component="h2"
                sx={{ fontWeight: 800, flex: 1, minWidth: 0, lineHeight: 1.3, m: 0 }}
              >
                {t('pages.dashboard.discover.market_change_dialog_title')}
              </Typography>
            }
          >
            {marketSaveError ? (
              <Alert severity="error" onClose={() => setMarketSaveError(null)}>
                {marketSaveError}
              </Alert>
            ) : null}
            {marketChangeDialogBody}
          </ResponsiveSheet>

          <Box
            component="section"
            aria-label={t('pages.dashboard.discover.lists_leaderboard_title')}
          >
            <DiscoverListsLeaderboard leaderboard={listsLeaderboard} />
          </Box>

          <Stack {...dashboardSubsectionStackProps}>
            <Typography variant="overline" sx={dashboardSectionLabelSx(theme)}>
              {t('pages.dashboard.discover.vibe_section')}
            </Typography>
            <ScrollableChipRow gap={{ xs: 1, sm: 1.5 }} sx={settingsDrillFullBleedStripSx}>
              {vibes.map((v) => {
                const selected = selectedVibeKey === v.key;
                return (
                  <Button
                    key={v.key}
                    onClick={() => toggleVibe(v.key)}
                    aria-pressed={selected}
                    size="small"
                    sx={{
                      flexShrink: 0,
                      alignSelf: 'center',
                      height: { xs: 44, sm: 36 },
                      minHeight: { xs: 44, sm: 36 },
                      borderRadius: RADIUS.pill,
                      px: '13px',
                      py: 0,
                      textTransform: 'none',
                      bgcolor: selected ? v.selectedBg : v.bg,
                      border: `1px solid ${selected ? v.selectedBg : v.border}`,
                      color: selected ? v.selectedColor : v.color,
                      boxShadow: selected ? `0 4px 14px -4px ${alpha(v.selectedBg, 0.45)}` : 'none',
                      '& .MuiButton-startIcon': {
                        color: selected ? v.selectedColor : v.color,
                        marginRight: '5px',
                        marginLeft: 0,
                      },
                      transition: (tt) =>
                        tt.transitions.create(
                          ['background-color', 'border-color', 'color', 'box-shadow', 'transform'],
                          { duration: tt.transitions.duration.shorter }
                        ),
                      '&:active': { transform: 'scale(0.94)' },
                      '@media (prefers-reduced-motion: reduce)': {
                        '&:active': { transform: 'none' },
                      },
                      ...(selected && {
                        '&:hover': { bgcolor: v.selectedBg, borderColor: v.selectedBg },
                      }),
                    }}
                    startIcon={<Iconify icon={v.icon} width={15} />}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 800 }}>
                      {v.label}
                    </Typography>
                  </Button>
                );
              })}
            </ScrollableChipRow>
          </Stack>

          <Stack {...dashboardSubsectionStackProps}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                {t('pages.dashboard.discover.roulette_kicker')}
              </Typography>
              <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
            </Stack>

            <Button
              component={RouterLink}
              href={paths.dashboard.roulette}
              fullWidth
              sx={{
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 1,
                borderRadius: 4,
                px: { xs: 1.5, sm: 2 },
                py: { xs: 1.25, sm: 1.5 },
                minHeight: { xs: 56, sm: undefined },
                textAlign: 'left',
                border: (tt) => `2px solid ${alpha(tt.palette.primary.main, 0.15)}`,
                bgcolor: (tt) => alpha(tt.palette.primary.main, 0.06),
                color: 'text.primary',
                transition: (tt) =>
                  tt.transitions.create(['background-color', 'border-color', 'transform'], {
                    duration: tt.transitions.duration.shorter,
                  }),
                '&:hover': {
                  bgcolor: (tt) => alpha(tt.palette.primary.main, 0.1),
                  borderColor: (tt) => alpha(tt.palette.primary.main, 0.28),
                  '& .discover-roulette-dice': {
                    transform: 'rotate(-4deg) scale(1.06)',
                  },
                },
                '@media (prefers-reduced-motion: reduce)': {
                  '&:hover .discover-roulette-dice': {
                    transform: 'none',
                  },
                },
              }}
            >
              <Stack
                direction="row"
                spacing={2}
                alignItems="center"
                sx={{ minWidth: 0, flex: 1, textAlign: 'left' }}
              >
                <Box
                  className="discover-roulette-dice"
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    bgcolor: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: 'rotate(3deg)',
                    flexShrink: 0,
                    boxShadow: (tt) => `0 8px 20px ${alpha(tt.palette.primary.main, 0.25)}`,
                    transition: (tt) =>
                      tt.transitions.create('transform', {
                        duration: tt.transitions.duration.shorter,
                      }),
                    '@media (prefers-reduced-motion: reduce)': {
                      transform: 'none',
                      transition: 'none',
                    },
                  }}
                >
                  <Iconify icon={ic.dice5} width={28} sx={{ color: 'primary.contrastText' }} />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontWeight: 800,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {t('pages.dashboard.roulette.nav_promo_title')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    {t('pages.dashboard.discover.roulette_sub')}
                  </Typography>
                </Box>
              </Stack>
              <Iconify
                icon={ic.arrowRightBold}
                width={22}
                sx={{ color: 'primary.main', flexShrink: 0 }}
              />
            </Button>
          </Stack>

          <Stack {...dashboardSubsectionStackProps}>
            {/**
             * Crossfade the three feed states so the skeleton fades out as results fade in,
             * instead of the abrupt swap. `MotionViewport` still drives its own per-card stagger.
             */}
            <AnimatePresence mode="wait" initial={false}>
              {(() => {
                if (showDiscoverLocating) {
                  return (
                    <motion.div
                      key="discover-locating"
                      initial={prefersReducedMotion ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={prefersReducedMotion ? undefined : { opacity: 0 }}
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <DiscoverLocatingSkeleton />
                    </motion.div>
                  );
                }
                if (showDiscoverRefetching) {
                  return (
                    <motion.div
                      key="discover-refetching"
                      initial={prefersReducedMotion ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={prefersReducedMotion ? undefined : { opacity: 0 }}
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <DiscoverLocatingSkeleton count={3} showTip={false} />
                    </motion.div>
                  );
                }
                if (showDiscoverFeedEmpty) {
                  return (
                    <motion.div
                      key="discover-empty"
                      initial={prefersReducedMotion ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={prefersReducedMotion ? undefined : { opacity: 0 }}
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <DashboardDelightEmpty
                        icon={ic.mapPointBold}
                        title={t('pages.dashboard.discover.feed_empty_title')}
                        body={
                          selectedVibeKey
                            ? t('pages.dashboard.discover.feed_empty_vibe')
                            : t('pages.dashboard.discover.feed_empty')
                        }
                        action={
                          <Button
                            variant="soft"
                            color="primary"
                            size="small"
                            sx={dashboardMobileStretchButtonSx}
                            onClick={
                              // A vibe filter is the likelier cause of an empty feed than the
                              // market being wrong, so offer the fix that matches the cause.
                              selectedVibeKey
                                ? () => toggleVibe(selectedVibeKey)
                                : () => setMarketDialogOpen(true)
                            }
                          >
                            {t(
                              selectedVibeKey
                                ? 'pages.dashboard.discover.feed_empty_clear_vibe'
                                : 'pages.dashboard.discover.feed_empty_change_area'
                            )}
                          </Button>
                        }
                      />
                    </motion.div>
                  );
                }
                return (
                  <motion.div
                    key="discover-results"
                    initial={prefersReducedMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={prefersReducedMotion ? undefined : { opacity: 0 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <ScrollableChipRow
                      gap={{ xs: 0.75, sm: 1 }}
                      sx={{ ...settingsDrillFullBleedStripSx, pt: SPACE.sm }}
                    >
                      {categories.map((c) => {
                        const selected = selectedCategoryKey === c.key;
                        return (
                          <Button
                            key={c.key ?? 'daily'}
                            onClick={() => selectCategory(c.key)}
                            aria-pressed={selected}
                            size="small"
                            sx={discoverFeedChipSx(theme, selected)}
                          >
                            <Typography variant="caption" sx={{ fontWeight: 800 }}>
                              {c.label}
                            </Typography>
                          </Button>
                        );
                      })}
                      <Button
                        onClick={toggleOpenNow}
                        aria-pressed={openNowOnly}
                        size="small"
                        startIcon={<Iconify icon={ic.clockCircleBold} width={15} />}
                        sx={discoverFeedChipSx(theme, openNowOnly)}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 800 }}>
                          {t('pages.dashboard.discover.filter_open_now')}
                        </Typography>
                      </Button>
                    </ScrollableChipRow>

                    {showDiscoverSortControl ? (
                      <Box sx={{ pt: SPACE.sm, mb: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <MapSheetSortMenu
                            sortMode={discoverSortMode}
                            onSortModeChange={handleDiscoverSortChange}
                          />
                        </Box>
                        {discoverSortLocationError ? (
                          <Alert
                            severity="warning"
                            onClose={() => setDiscoverSortLocationError(false)}
                            sx={{ mt: 1 }}
                          >
                            {t('pages.lists.sort_location_error')}
                          </Alert>
                        ) : null}
                      </Box>
                    ) : null}
                    <List
                      dense
                      disablePadding
                      aria-label={t('pages.dashboard.map.sheet_list_aria')}
                      sx={{ mx: -0.5 }}
                    >
                      {displayRestaurants.map((r) => {
                        const placeRow = mapPlaceFromListRestaurant(r);
                        if (!placeRow) return null;
                        const mapsUrl = mapPlaceMapsUrl(placeRow);
                        const phoneCall = mapPlaceTelHref(placeRow);
                        const rowListIds = savedByRestaurant[String(placeRow.id)] ?? [];
                        const isSaved = Array.isArray(rowListIds) && rowListIds.length > 0;
                        const ratingVal = mapPlaceNumericRating(placeRow);
                        const chipLabels = mapPlaceTagLabelsCapped(placeRow, t, tagCatalog, {
                          tagCatalogLoaded,
                        });
                        return (
                          <MapSpotSheetListRow
                            key={placeRow.id}
                            row={placeRow}
                            mapsUrl={mapsUrl}
                            phoneCall={phoneCall}
                            rowListIds={rowListIds}
                            isSaved={isSaved}
                            ratingVal={ratingVal}
                            chipLabels={chipLabels}
                            tagsLoading={!tagCatalogLoaded}
                            listRingItems={[]}
                            followingOwners={[]}
                            followingOwnersLoading={false}
                            userId={user?.id ?? null}
                            viewerAvatarUrl={viewerIdentity.avatarUrl}
                            viewerDisplayName={viewerIdentity.displayName}
                            itemRef={getFeedItemRef(placeRow.id)}
                            onSelectSpot={handleDiscoverRowSelect}
                            onListSave={handleDiscoverRowListSave}
                            onShareRow={handleDiscoverRowShare}
                            listRowActionBtnSx={listRowActionBtnSx}
                            restaurantAnalytics={restaurantAnalytics}
                            t={t}
                          />
                        );
                      })}
                    </List>
                    {showDiscoverLoadMore ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1.5 }}>
                        <Button
                          variant="outlined"
                          color="inherit"
                          onClick={loadingMore ? undefined : handleLoadMoreFeed}
                          disabled={loadingMore}
                          startIcon={
                            loadingMore ? (
                              <CircularProgress size={16} thickness={5} color="inherit" />
                            ) : null
                          }
                          sx={{
                            borderRadius: RADIUS.pill,
                            fontWeight: 700,
                            textTransform: 'none',
                            borderColor: (tt) => alpha(tt.palette.text.primary, 0.12),
                            ...hoverable({ bgcolor: (tt) => alpha(tt.palette.text.primary, 0.04) }),
                          }}
                        >
                          {t('pages.dashboard.discover.feed_load_more')}
                        </Button>
                      </Box>
                    ) : null}
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </Stack>
        </Stack>
      </Box>
      <SaveToListSheet
        open={Boolean(saveSheetRestaurantId)}
        onClose={handleDiscoverSaveSheetClose}
        restaurantId={saveSheetRestaurantId}
        onApplied={handleDiscoverSaveApplied}
        myUserId={user?.id ?? null}
      />
      <ShareFeedbackSnackbar
        feedback={shareFeedback}
        onClose={dismissShareFeedback}
        /* Clear the fixed mobile bottom nav. */
        sx={{ bottom: { xs: NAV.H_MOBILE_BOTTOM + 16, md: 24 } }}
      />
    </SettingsDrillShell>
  );
}

DiscoverView.propTypes = {
  marketLabel: PropTypes.string,
  homeLocalityId: PropTypes.string,
  homeMunicipalityId: PropTypes.string,
  feedLocalityId: PropTypes.string,
  feedRefLat: PropTypes.number,
  feedRefLng: PropTypes.number,
  isFallbackMarket: PropTypes.bool,
  restaurants: PropTypes.arrayOf(PropTypes.object),
  savedListIdsByRestaurant: PropTypes.object,
  listsLeaderboard: PropTypes.shape({
    interaction_leaders: PropTypes.array,
    follower_leaders: PropTypes.array,
    error: PropTypes.string,
  }),
};
