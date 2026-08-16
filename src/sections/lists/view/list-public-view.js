'use client';

import dynamic from 'next/dynamic';
import PropTypes from 'prop-types';
import { useSearchParams } from 'next/navigation';
import { useRef, useMemo, useState, useEffect, useCallback, useLayoutEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import { alpha, useTheme } from '@mui/material/styles';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';
import { restaurantHrefWithFrom } from 'src/routes/restaurant-nav-from';

import { useShareLink } from 'src/hooks/use-share-link';

import { translateStripeCheckoutError } from 'src/utils/stripe-checkout-errors';
import { translateListCollaborationError } from 'src/utils/list-collaboration-errors';
import {
  USER_SCOPED_KEYS,
  clientScopedGetJson,
  clientScopedSetJson,
} from 'src/utils/user-scoped-storage';

import { ic } from 'src/assets/icons';
import { useAuthContext } from 'src/auth/hooks';
import { NAV, MAPBOX_API } from 'src/config-global';
import { useLocales, useTranslate } from 'src/locales';
import { hoverable } from 'src/theme/overrides/hoverable';
import { getLocaleBodyMaxWidthCh } from 'src/theme/locale-prose';
import { useAnalytics } from 'src/libs/analytics/analytics-provider';
import { getPaywallRelativeDate } from 'src/libs/paywall/paywall-recency';
import { SPACE, touchTargetSx, TOUCH_TARGET_SIZE } from 'src/theme/spacing';
import { acceptListInvite, declineListInvite } from 'src/libs/lists/actions';
import { isPlacesView, sortListItemsByMode } from 'src/libs/lists/sort-list-items';
import {
  RESTAURANT_SURFACE,
  useRestaurantAnalytics,
} from 'src/libs/analytics/restaurant-analytics';

import Iconify from 'src/components/iconify';
import ShareFeedbackSnackbar from 'src/components/share/share-feedback-snackbar';

import ListDecidePanel from 'src/sections/lists/list-decide-panel';
import MapSheetSortMenu from 'src/sections/map/map-sheet-sort-menu';
import PlanTonightSheet from 'src/sections/lists/plan-tonight-sheet';
import { useMapMobileSpotSheet } from 'src/sections/map/use-map-mobile-spot-sheet';
import { MapMobileSpotSheetShell } from 'src/sections/map/map-mobile-spot-sheet-shell';
import { useMapSheetViewerIdentity } from 'src/sections/map/use-map-sheet-viewer-identity';
import { spotIdEq, useRestaurantMapSheet } from 'src/sections/map/use-restaurant-map-sheet';
import MapSpotSheetInner, { MapSpotSheetListRow } from 'src/sections/map/map-spot-sheet-inner';
import {
  mapPlaceMapsUrl,
  mapPlaceTelHref,
  mapPlaceNumericRating,
  mapPlaceTagLabelsCapped,
  mapPlaceFromListRestaurant,
} from 'src/sections/map/map-spot-sheet-helpers';

const DashboardMapCanvas = dynamic(() => import('src/sections/map/view/dashboard-map-canvas'), {
  ssr: false,
});

const SaveToListSheet = dynamic(() => import('src/sections/lists/save-to-list-sheet'), {
  ssr: false,
});

const RestaurantPublicAuthPrompt = dynamic(
  () => import('src/sections/restaurant/restaurant-public-auth-prompt'),
  { ssr: false }
);

const MAP_SHEET_LIST_ACTION_BTN_SIZE = 32;

/** Handle for `/u/:handle` / `dashboard/u/:handle`; supports `display_name` like `@foo` when `username` is empty. */
function profileHandleFromOwner(owner) {
  if (!owner) return null;
  const u = owner.username != null ? String(owner.username).trim() : '';
  if (u) return u;
  const d = String(owner.display_name ?? '').trim();
  if (d.startsWith('@')) {
    const h = d.slice(1).trim();
    return h || null;
  }
  return null;
}

// ----------------------------------------------------------------------

function formatAbsoluteDate(isoString) {
  if (!isoString) return null;
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(isoString));
  } catch {
    return null;
  }
}

function formatListMoney(amountCents, currency) {
  const c = typeof amountCents === 'number' ? amountCents : 0;
  const cur = (currency && String(currency).toUpperCase()) || 'EUR';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur }).format(c / 100);
  } catch {
    return `${(c / 100).toFixed(2)} ${cur}`;
  }
}

export default function ListPublicView({
  variant = 'page',
  listId: listIdProp,
  list,
  items,
  owner,
  error,
  membership: initialMembership,
  paidAccess = null,
}) {
  const listId = list?.id ?? listIdProp;
  const theme = useTheme();
  const { t } = useTranslate();
  const { currentLang } = useLocales();
  const publicListBodyMaxWidth = getLocaleBodyMaxWidthCh(currentLang?.value);

  /** Relative phrase for `pages.lists.last_updated` / paywall copy (locale-aware). */
  const formatRelativeDate = useCallback(
    (isoString) => {
      if (!isoString) return null;
      try {
        const diffMs = Date.now() - new Date(isoString).getTime();
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (days === 0) return t('pages.lists.relative_when_today');
        if (days === 1) return t('pages.lists.relative_when_one_day_ago');
        if (days < 30) return t('pages.lists.relative_when_n_days_ago', { count: days });
        const months = Math.floor(days / 30);
        if (months === 1) return t('pages.lists.relative_when_one_month_ago');
        if (months < 12) return t('pages.lists.relative_when_n_months_ago', { count: months });
        const years = Math.floor(months / 12);
        return years === 1
          ? t('pages.lists.relative_when_one_year_ago')
          : t('pages.lists.relative_when_n_years_ago', { count: years });
      } catch {
        return null;
      }
    },
    [t]
  );

  const router = useRouter();
  const searchParams = useSearchParams();
  const { authenticated, supabase, user } = useAuthContext();
  const userId = user?.id ?? null;
  const { avatarUrl: viewerAvatarUrl, displayName: viewerDisplayName } = useMapSheetViewerIdentity(
    user,
    supabase
  );
  const { trackEvent, setGroup } = useAnalytics();
  const restaurantAnalytics = useRestaurantAnalytics();
  /** Which async action is in flight (for per-button loading). */
  const [busyKey, setBusyKey] = useState(null);
  const busy = busyKey !== null;
  const [err, setErr] = useState(null);
  const errText = useMemo(() => translateListCollaborationError(t, err), [err, t]);
  const [placesView, setPlacesView] = useState(/** @type {'list' | 'map'} */ ('list'));

  // The List/Map toggle is a global viewer preference: remember the last-chosen view across
  // reloads and lists via the guest-friendly clientScoped storage (mirrors the map page).
  const handlePlacesViewChange = useCallback(
    (/** @type {'list' | 'map'} */ next) => {
      setPlacesView(next);
      const [segA, segB] = USER_SCOPED_KEYS.listPlacesView;
      clientScopedSetJson(userId, segA, segB, next);
    },
    [userId]
  );
  const [selectedMapPlaceId, setSelectedMapPlaceId] = useState(null);
  const [pinHighlightMapId, setPinHighlightMapId] = useState(null);
  const [saveSheetRestaurantId, setSaveSheetRestaurantId] = useState(null);
  const [guestAuthPromptOpen, setGuestAuthPromptOpen] = useState(false);
  const [guestAuthPromptRestaurantId, setGuestAuthPromptRestaurantId] = useState(null);
  const [planTonightOpen, setPlanTonightOpen] = useState(false);
  const tonightParamOpenedRef = useRef(false);

  useEffect(() => {
    if (tonightParamOpenedRef.current) return;
    if (searchParams.get('tonight') !== '1') return;
    if (!initialMembership?.isOwner) return;
    tonightParamOpenedRef.current = true;
    setPlanTonightOpen(true);
  }, [searchParams, initialMembership?.isOwner]);

  // Deep-link: `?spot=<restaurantId>` (e.g. from a notification) highlights that
  // spot in the list and scrolls it into view.
  const spotParam = searchParams.get('spot');
  useEffect(() => {
    if (!spotParam) return;
    setPinHighlightMapId(String(spotParam));
    const el =
      typeof document !== 'undefined' ? document.getElementById(`list-spot-${spotParam}`) : null;
    if (el) {
      // Defer so the row is mounted before scrolling.
      requestAnimationFrame(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }));
    }
  }, [spotParam, items]);

  // In-sheet sort for the list's places. `relevance` keeps the curated server order; `recent`
  // orders by when each place was added to the list; `distance` needs the viewer's coordinates.
  const [listSortMode, setListSortMode] = useState(
    /** @type {'relevance' | 'distance' | 'recent'} */ ('relevance')
  );
  const [listGeoRef, setListGeoRef] = useState(
    /** @type {{ lat: number, lng: number } | null} */ (null)
  );
  const [listSortLocationError, setListSortLocationError] = useState(false);

  const handleListSortChange = useCallback(
    (mode) => {
      setListSortLocationError(false);
      if (mode !== 'distance') {
        setListSortMode(mode);
        return;
      }
      if (listGeoRef) {
        setListSortMode('distance');
        return;
      }
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        setListSortLocationError(true);
        return;
      }
      // Ask for location on first switch to "Nearest"; only commit the sort once granted so the
      // list never shows a distance order with no reference point. Denial keeps the current sort.
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setListGeoRef({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setListSortMode('distance');
        },
        () => {
          setListSortLocationError(true);
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 120_000 }
      );
    },
    [listGeoRef]
  );

  // Reordered copy of `items` for the list view. Rows without coordinates sink to the end of a
  // "Nearest" sort; rows without a timestamp sink to the end of "Last added". Both are stable.
  const sortedItems = useMemo(
    () => sortListItemsByMode(items, listSortMode, listGeoRef),
    [items, listSortMode, listGeoRef]
  );

  const sortedMapPlaces = useMemo(
    () =>
      sortedItems
        .map((row) => mapPlaceFromListRestaurant(row.restaurants))
        .filter((place) => {
          if (!place) return false;
          const lat = place.latitude != null ? Number(place.latitude) : NaN;
          const lng = place.longitude != null ? Number(place.longitude) : NaN;
          return Number.isFinite(lat) && Number.isFinite(lng);
        }),
    [sortedItems]
  );

  const listHasMultiplePlaces = (items?.length ?? 0) > 1;

  const isPublicPageVariant = variant === 'page';

  const handleRowSaveRequest = useCallback(
    (restaurantId) => {
      if (isPublicPageVariant && !authenticated) {
        setGuestAuthPromptRestaurantId(restaurantId == null ? null : String(restaurantId));
        setGuestAuthPromptOpen(true);
        return;
      }
      setSaveSheetRestaurantId(restaurantId);
    },
    [isPublicPageVariant, authenticated]
  );

  const handleCloseGuestAuthPrompt = useCallback(() => {
    setGuestAuthPromptOpen(false);
  }, []);

  useEffect(() => {
    if (!listId) return;
    setGroup('list', listId);
    trackEvent('list_viewed', { list_id: listId });
  }, [listId, setGroup, trackEvent]);

  const needsPaidSubscribe =
    list?.visibility === 'public_subscribers' &&
    paidAccess?.enabled &&
    !initialMembership?.isOwner &&
    !initialMembership?.isMember &&
    !paidAccess?.hasSubscription;

  const showPaidPaywall = Boolean(needsPaidSubscribe);

  /** Recency label shown in the paywall value prop ("Updated 3 days ago").
   *  Null when listUpdatedAt is absent or older than 90 days. */
  const paywallRelativeDate = useMemo(
    () => getPaywallRelativeDate(paidAccess?.listUpdatedAt, formatRelativeDate),
    [paidAccess?.listUpdatedAt, formatRelativeDate]
  );

  /** Mid-sentence for snapshot upsell: places on the live list outside the buyer's capture. */
  const snapshotNewPlacesNote = useMemo(() => {
    const n = paidAccess?.snapshotNewRestaurantCount;
    if (
      paidAccess?.accessType !== 'snapshot' ||
      n === null ||
      n === undefined ||
      typeof n !== 'number'
    ) {
      return '';
    }
    if (n === 0) return t('pages.lists.snapshot_upsell_new_places_zero');
    if (n === 1) return t('pages.lists.snapshot_upsell_new_places_one');
    return t('pages.lists.snapshot_upsell_new_places_other', { count: n });
  }, [paidAccess?.accessType, paidAccess?.snapshotNewRestaurantCount, t]);

  const handleSubscribeToList = useCallback(async () => {
    setBusyKey('subscribe');
    setErr(null);
    trackEvent('live_list_cta_clicked', { list_id: listId, authenticated });
    trackEvent('live_list_checkout_started', { list_id: listId, authenticated });
    try {
      const res = await fetch('/api/stripe/checkout/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listId,
          type: 'subscription',
          returnPath: window.location.pathname,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        trackEvent('live_list_checkout_failed', {
          list_id: listId,
          authenticated,
          error_code: data?.error || 'checkout_failed',
        });
        setErr(translateStripeCheckoutError(t, data.error || 'checkout_failed'));
        return;
      }
      if (data.url) {
        trackEvent('live_list_checkout_redirected', { list_id: listId, authenticated });
        window.location.href = data.url;
      }
    } catch {
      trackEvent('live_list_checkout_failed', {
        list_id: listId,
        authenticated,
        error_code: 'network_or_unknown',
      });
      setErr(t('pages.lists.paid_checkout_error_generic'));
    } finally {
      setBusyKey(null);
    }
  }, [listId, t, authenticated, trackEvent]);

  const handleSnapshotCheckout = useCallback(async () => {
    setBusyKey('snapshot');
    setErr(null);
    trackEvent('snapshot_cta_clicked', { list_id: listId, authenticated });
    trackEvent('snapshot_checkout_started', { list_id: listId, authenticated });
    try {
      const res = await fetch('/api/stripe/checkout/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listId, type: 'snapshot', returnPath: window.location.pathname }),
      });
      const data = await res.json();
      if (!res.ok) {
        trackEvent('snapshot_checkout_failed', {
          list_id: listId,
          authenticated,
          error_code: data?.error || 'checkout_failed',
        });
        setErr(translateStripeCheckoutError(t, data.error || 'checkout_failed'));
        return;
      }
      if (data.url) {
        trackEvent('snapshot_checkout_redirected', { list_id: listId, authenticated });
        window.location.href = data.url;
      }
    } catch {
      trackEvent('snapshot_checkout_failed', {
        list_id: listId,
        authenticated,
        error_code: 'network_or_unknown',
      });
      setErr(t('pages.lists.paid_checkout_error_generic'));
    } finally {
      setBusyKey(null);
    }
  }, [listId, t, authenticated, trackEvent]);

  const isDashboardEmbed = variant === 'dashboard';
  const ownerProfileHandle = profileHandleFromOwner(owner);

  // Login href with returnTo so unauthenticated users come back to this list after signing in.
  const loginHref = useMemo(() => {
    const listPath =
      ownerProfileHandle && list?.slug
        ? `/lists/${ownerProfileHandle}/${list.slug}`
        : `/lists/${listId}`;
    return `${paths.auth.supabase.login}?returnTo=${encodeURIComponent(listPath)}`;
  }, [listId, ownerProfileHandle, list?.slug]);

  const showPlacesChromeForMap =
    (items?.length ?? 0) > 0 && !showPaidPaywall && error !== 'login_required';

  const listMapSlotRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const [listMapSlotHeightPx, setListMapSlotHeightPx] = useState(null);

  // Restore the last-chosen List/Map view once after mount. Kept out of the initial useState so the
  // first paint matches the server ('list') and there's no hydration mismatch.
  useEffect(() => {
    const [segA, segB] = USER_SCOPED_KEYS.listPlacesView;
    const stored = clientScopedGetJson(userId, segA, segB);
    if (isPlacesView(stored)) setPlacesView(stored);
    // Run once on mount; a later userId change shouldn't yank the view out from under the viewer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // placesView is a global preference and intentionally carries across lists.
    setSelectedMapPlaceId(null);
    setPinHighlightMapId(null);
    setListSortMode('relevance');
    setListSortLocationError(false);
  }, [listId]);

  /** End invite accept/decline loading after RSC refresh updates membership (or timeout). */
  useEffect(() => {
    const inviteBusy = busyKey === 'inviteAccept' || busyKey === 'inviteDecline';
    if (!inviteBusy) return undefined;
    if (initialMembership?.pending !== 'invite') {
      setBusyKey(null);
      return undefined;
    }
    const settleTimer = setTimeout(() => setBusyKey(null), 8000);
    return () => clearTimeout(settleTimer);
  }, [busyKey, initialMembership?.pending]);

  const checkoutParam = searchParams.get('checkout');
  const checkoutSessionId = searchParams.get('session_id');
  const checkoutStripeAccount = searchParams.get('stripe_account');

  // Handle Stripe checkout return: verify snapshot (beat webhook race), strip query, refresh RSC.
  useEffect(() => {
    if (!checkoutParam) return undefined;
    const cleanUrl = window.location.pathname;
    let cancelled = false;

    (async () => {
      trackEvent('list_checkout_returned', {
        list_id: listId,
        checkout_status: checkoutParam,
        has_session_id: Boolean(checkoutSessionId),
      });
      if (checkoutParam === 'success' && checkoutSessionId && checkoutStripeAccount) {
        try {
          await fetch('/api/stripe/checkout/verify-snapshot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: checkoutSessionId,
              stripeAccountId: checkoutStripeAccount,
            }),
          });
          trackEvent('snapshot_checkout_verified', {
            list_id: listId,
            session_id_present: true,
          });
        } catch {
          trackEvent('snapshot_checkout_verify_failed', {
            list_id: listId,
            session_id_present: true,
          });
          /* Webhook may still persist the row; refresh below still helps. */
        }
      }
      if (cancelled) return;
      router.replace(cleanUrl, { scroll: false });
      if (checkoutParam === 'success') {
        router.refresh();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [checkoutParam, checkoutSessionId, checkoutStripeAccount, listId, router, trackEvent]);

  // Phase 0 success criteria: track paywall card impressions
  // Show paywall card whenever the list has paid access and the viewer hasn't subscribed —
  // even if the list currently has ≤N restaurants (future updates still justify the purchase).
  const paywallVisible =
    !showPaidPaywall &&
    Boolean(paidAccess?.enabled && !paidAccess?.hasSubscription) &&
    !initialMembership?.isOwner;
  useEffect(() => {
    if (!paywallVisible) return;
    trackEvent('freemium_paywall_shown', { list_id: listId, authenticated });
  }, [paywallVisible, listId, authenticated, trackEvent]);

  useLayoutEffect(() => {
    if (!showPlacesChromeForMap || placesView !== 'map') {
      setListMapSlotHeightPx(null);
      return undefined;
    }
    const el = listMapSlotRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height;
      if (typeof h === 'number' && h > 0) {
        setListMapSlotHeightPx(Math.round(h));
      }
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
    };
  }, [showPlacesChromeForMap, placesView, listId]);

  const listSheetPlaces = useMemo(
    () => (items ?? []).map((row) => mapPlaceFromListRestaurant(row.restaurants)).filter(Boolean),
    [items]
  );

  const mapFitBounds = useMemo(
    () => ({
      key: `${listId}:${sortedMapPlaces.length}`,
      places: sortedMapPlaces,
    }),
    [listId, sortedMapPlaces]
  );

  const {
    tagCatalog,
    tagCatalogLoaded,
    selectedRow: selectedMapSource,
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
    places: listSheetPlaces,
    selectedId: selectedMapPlaceId,
    userId,
    userScopedSavedListCacheKey: null,
  });

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
      // 32px visual circle, 44px effective touch target (DESIGN.md §19 / iOS requirement).
      position: 'relative',
      '&::after': {
        content: '""',
        position: 'absolute',
        inset: (TOUCH_TARGET_SIZE - MAP_SHEET_LIST_ACTION_BTN_SIZE) / -2,
        borderRadius: '50%',
      },
      ...hoverable({ bgcolor: (tt) => alpha(tt.palette.background.paper, 0.98) }),
    };
  }, [theme]);

  const {
    share: shareLink,
    feedback: shareFeedback,
    dismissFeedback: dismissShareFeedback,
  } = useShareLink();

  const handleListPlaceShare = useCallback(
    async (row) => {
      restaurantAnalytics.trackShareClicked({
        restaurant_id: String(row.id),
        surface: RESTAURANT_SURFACE.MAP_SHEET,
      });
      const base = typeof window !== 'undefined' ? window.location.origin : '';
      await shareLink({ url: `${base}${paths.restaurantPublic(row.id)}`, title: row.name });
    },
    [restaurantAnalytics, shareLink]
  );

  const handleListPlaceRowSelect = useCallback(
    (id) => {
      const base = isDashboardEmbed ? paths.dashboard.restaurant(id) : paths.restaurantPublic(id);
      const href = restaurantHrefWithFrom(base, isDashboardEmbed ? 'list' : null, {
        listId: isDashboardEmbed ? listId : null,
      });
      router.push(href, { transitionTypes: ['nav-forward'] });
    },
    [isDashboardEmbed, listId, router]
  );

  const pinHighlightMapRow = useMemo(
    () =>
      pinHighlightMapId
        ? (sortedMapPlaces.find((r) => spotIdEq(r.id, pinHighlightMapId)) ?? null)
        : null,
    [sortedMapPlaces, pinHighlightMapId]
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
  } = useMapMobileSpotSheet({
    bottomInsetPx: isDashboardEmbed ? NAV.H_MOBILE_BOTTOM : 0,
    maxSheetHeightPx:
      showPlacesChromeForMap && placesView === 'map' ? (listMapSlotHeightPx ?? 400) : null,
  });

  const handleListMapSaveApplied = useCallback(() => {
    refreshSavedForPlaces(listSheetPlaces);
    router.refresh();
  }, [refreshSavedForPlaces, listSheetPlaces, router]);

  const handleListPlaceSaveApplied = useCallback(() => {
    setSaveSheetRestaurantId(null);
    refreshSavedForPlaces(listSheetPlaces);
    router.refresh();
  }, [refreshSavedForPlaces, listSheetPlaces, router]);

  const handleCloseListMapSpot = useCallback(() => {
    setSelectedMapPlaceId(null);
    setPinHighlightMapId(null);
    if (isMobileSheet) {
      setSheetHeightPx(sheetSnapBounds.peek);
    }
  }, [isMobileSheet, sheetSnapBounds.peek, setSheetHeightPx]);

  const handleListMapMarkerClick = useCallback(
    (id) => {
      const strId = id == null ? null : String(id);
      if (strId != null && selectedMapPlaceId != null && spotIdEq(strId, selectedMapPlaceId)) {
        setSelectedMapPlaceId(null);
        setPinHighlightMapId(null);
        if (isMobileSheet) {
          setSheetHeightPx(sheetSnapBounds.peek);
        }
        return;
      }
      setSelectedMapPlaceId(strId);
      setPinHighlightMapId(strId);
      if (isMobileSheet && strId != null) {
        setSheetHeightPx(sheetSnapBounds.full);
      }
    },
    [
      selectedMapPlaceId,
      isMobileSheet,
      sheetSnapBounds.full,
      sheetSnapBounds.peek,
      setSheetHeightPx,
    ]
  );

  /** Called when a list row is clicked in the map side panel — opens the detail view. */
  const handleListRowMapSelect = useCallback(
    (id) => {
      const strId = id == null ? null : String(id);
      setSelectedMapPlaceId(strId);
      setPinHighlightMapId(strId);
      if (isMobileSheet && strId != null) {
        setSheetHeightPx(sheetSnapBounds.full);
      }
    },
    [isMobileSheet, sheetSnapBounds.full, setSheetHeightPx]
  );

  useEffect(() => {
    const placeIds = new Set(sortedMapPlaces.map((r) => String(r.id)));
    if (selectedMapPlaceId && !placeIds.has(selectedMapPlaceId)) {
      setSelectedMapPlaceId(null);
      if (isMobileSheet) setSheetHeightPx(sheetSnapBounds.peek);
    }
    if (pinHighlightMapId && !placeIds.has(pinHighlightMapId)) {
      setPinHighlightMapId(null);
    }
  }, [
    sortedMapPlaces,
    selectedMapPlaceId,
    pinHighlightMapId,
    isMobileSheet,
    sheetSnapBounds.peek,
    setSheetHeightPx,
  ]);

  const sheetSpotsHeadingBadgeCount = useMemo(() => {
    if (paidAccess?.accessType !== 'snapshot') return null;
    const n = paidAccess?.snapshotPurchasedItemCount;
    return typeof n === 'number' && Number.isFinite(n) ? n : null;
  }, [paidAccess?.accessType, paidAccess?.snapshotPurchasedItemCount]);

  const listMapSpotSheetInner = (
    <MapSpotSheetInner
      placesLoading={false}
      places={sortedMapPlaces}
      sortMode={listHasMultiplePlaces ? listSortMode : null}
      onSortModeChange={listHasMultiplePlaces ? handleListSortChange : null}
      selected={selectedMapSource}
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
      highlightedId={pinHighlightMapId}
      onSelectSpot={handleListRowMapSelect}
      onCloseDetail={handleCloseListMapSpot}
      onSaveApplied={handleListMapSaveApplied}
      onGuestSaveClick={isPublicPageVariant && !authenticated ? handleRowSaveRequest : null}
      refetchSheetReviews={refetchSheetReviews}
      sheetEmptyCopy={t('pages.dashboard.map.sheet_empty')}
      isMobileSheet={isMobileSheet}
      spotsHeadingBadgeCount={sheetSpotsHeadingBadgeCount}
    />
  );

  if (!list) {
    return (
      <Container maxWidth="sm" sx={{ py: { xs: 3, md: 5 } }}>
        <Alert severity="info" variant="outlined" role="status">
          {t('pages.lists.not_found')}
        </Alert>
      </Container>
    );
  }

  const body = (
    <Stack
      spacing={2}
      sx={
        isDashboardEmbed
          ? {
              minWidth: 0,
              ...(placesView === 'map'
                ? {
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'visible',
                    '& > *:not(:last-child)': { flexShrink: 0 },
                  }
                : {
                    flexShrink: 0,
                  }),
            }
          : undefined
      }
    >
      {paidAccess?.creatorDeleted && (
        <Alert severity="warning" variant="outlined" role="status">
          {t('pages.lists.creator_deleted_banner')}
        </Alert>
      )}

      {(list.cover_image_url || !isDashboardEmbed || owner) && (
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          justifyContent="center"
          sx={{ minWidth: 0 }}
        >
          {list.cover_image_url && (
            <Avatar
              alt={list.name}
              src={list.cover_image_url}
              sx={{ width: 48, height: 48, flexShrink: 0 }}
            />
          )}
          <Box sx={{ minWidth: 0, textAlign: 'center' }}>
            {!isDashboardEmbed && (
              <Typography
                variant="h4"
                component="h1"
                sx={{
                  fontWeight: 800,
                  wordBreak: 'break-word',
                  lineHeight: 1.2,
                }}
              >
                {list.name}
              </Typography>
            )}
            {owner &&
              (ownerProfileHandle ? (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', lineHeight: 1.3 }}
                >
                  {t('pages.lists.by_handle_lead')}{' '}
                  <Link
                    component={RouterLink}
                    href={
                      isDashboardEmbed
                        ? paths.dashboard.userPublic(ownerProfileHandle)
                        : paths.userPublic(ownerProfileHandle)
                    }
                    underline="hover"
                    color="primary"
                    sx={{ fontWeight: 700 }}
                  >
                    @{ownerProfileHandle}
                  </Link>
                </Typography>
              ) : (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', lineHeight: 1.3 }}
                >
                  {t('pages.lists.by_handle', { handle: owner.display_name || '—' })}
                </Typography>
              ))}
          </Box>
        </Stack>
      )}
      {list.description ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: 'center', maxWidth: publicListBodyMaxWidth, mx: 'auto' }}
        >
          {list.description}
        </Typography>
      ) : null}

      {list.visibility === 'public' &&
        !showPaidPaywall &&
        error !== 'login_required' &&
        ((items?.length ?? 0) > 0 || Boolean(initialMembership?.isOwner)) && (
          <Stack spacing={SPACE.sm} sx={{ width: 1 }}>
            {(items?.length ?? 0) > 0 ? (
              <ListDecidePanel
                key={searchParams.get('d') || 'decide-idle'}
                listId={listId}
                listName={list.name}
                items={items}
                isOwner={Boolean(initialMembership?.isOwner)}
                ownerUsername={owner?.username || null}
                listSlug={list.slug || null}
                initialSessionId={searchParams.get('d') || null}
              />
            ) : null}
            {Boolean(initialMembership?.isOwner) ? (
              <Button
                fullWidth
                size="small"
                variant="outlined"
                color="primary"
                onClick={() => setPlanTonightOpen(true)}
                sx={touchTargetSx}
              >
                {t('pages.lists.plan_tonight_cta')}
              </Button>
            ) : null}
            {Boolean(initialMembership?.isOwner) ? (
              <PlanTonightSheet
                open={planTonightOpen}
                onClose={() => setPlanTonightOpen(false)}
                listId={listId}
                items={items}
                isOwner={Boolean(initialMembership?.isOwner)}
              />
            ) : null}
          </Stack>
        )}

      {paidAccess?.listUpdatedAt && !isDashboardEmbed && !showPaidPaywall && (
        <Typography
          variant="caption"
          color="text.disabled"
          sx={{ display: 'block', textAlign: 'center' }}
        >
          {t('pages.lists.last_updated', { when: formatRelativeDate(paidAccess.listUpdatedAt) })}
        </Typography>
      )}

      {paidAccess?.accessType === 'snapshot' &&
        paidAccess?.snapshotPurchasedAt &&
        !initialMembership?.isOwner && (
          <Alert
            severity="info"
            variant="outlined"
            role="status"
            sx={{
              alignItems: 'flex-start',
              width: 1,
              '& .MuiAlert-message': { width: 1, minWidth: 0, pt: 0.25 },
            }}
          >
            <Stack spacing={1.5} sx={{ width: 1 }}>
              <Typography variant="body2" component="div" color="inherit">
                {t('pages.lists.snapshot_upsell_body', {
                  date: formatAbsoluteDate(paidAccess.snapshotPurchasedAt),
                  newPlacesNote: snapshotNewPlacesNote,
                })}
              </Typography>
              {authenticated ? (
                <Button
                  fullWidth
                  size="small"
                  variant="contained"
                  color="primary"
                  onClick={handleSubscribeToList}
                  loading={busyKey === 'subscribe'}
                  disabled={busy}
                >
                  {t('pages.lists.snapshot_upsell_cta', {
                    price: formatListMoney(paidAccess.amountCents, paidAccess.currency),
                  })}
                </Button>
              ) : (
                <Button fullWidth size="small" component={RouterLink} href={loginHref}>
                  {t('pages.lists.snapshot_upsell_cta', {
                    price: formatListMoney(paidAccess.amountCents, paidAccess.currency),
                  })}
                </Button>
              )}
            </Stack>
          </Alert>
        )}

      {error === 'login_required' && (
        <Alert severity="info" variant="outlined" role="status">
          {t('pages.lists.login_to_view_places')}
          <Button component={RouterLink} href={loginHref} size="small" sx={{ ml: 1 }}>
            {t('pages.lists.log_in')}
          </Button>
        </Alert>
      )}

      {authenticated && initialMembership?.pending === 'invite' && (
        <Alert
          severity="info"
          variant="outlined"
          role="status"
          sx={{
            alignItems: 'flex-start',
            width: 1,
            '& .MuiAlert-message': { width: 1, minWidth: 0 },
          }}
        >
          {t('pages.lists.pending_invite_hint')}
          <Stack direction="column" spacing={1} sx={{ mt: 1, width: 1 }}>
            <Button
              fullWidth
              size="small"
              variant="contained"
              color="primary"
              loading={busyKey === 'inviteAccept'}
              disabled={busy}
              onClick={async () => {
                setErr(null);
                setBusyKey('inviteAccept');
                const { error: e } = await acceptListInvite(listId);
                if (e) {
                  setBusyKey(null);
                  setErr(e);
                  return;
                }
                router.refresh();
              }}
            >
              {t('pages.lists.accept_invite')}
            </Button>
            <Button
              fullWidth
              size="small"
              variant="text"
              loading={busyKey === 'inviteDecline'}
              disabled={busy}
              onClick={async () => {
                setErr(null);
                setBusyKey('inviteDecline');
                const { error: e } = await declineListInvite(listId);
                if (e) {
                  setBusyKey(null);
                  setErr(e);
                  return;
                }
                router.refresh();
              }}
            >
              {t('pages.lists.decline_invite')}
            </Button>
          </Stack>
        </Alert>
      )}

      {initialMembership?.pending === 'request' && (
        <Typography variant="caption" color="text.secondary">
          {t('pages.lists.request_pending')}
        </Typography>
      )}
      {errText && (
        <Alert severity="error" variant="outlined" role="alert">
          {errText}
        </Alert>
      )}

      {showPaidPaywall && (
        <Stack spacing={2}>
          {/* Value prop — update recency (pre-computed as paywallRelativeDate) */}
          <Box
            sx={{
              px: 2,
              py: 1.5,
              borderRadius: 2,
              bgcolor: (muiTheme) => alpha(muiTheme.palette.primary.main, 0.06),
              border: (muiTheme) => `1px solid ${alpha(muiTheme.palette.primary.main, 0.14)}`,
            }}
          >
            {list?.visibility === 'public_subscribers' && (
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1, lineHeight: 1.35 }}>
                {t('pages.lists.paid_list_paywall_title_subscribers')}
              </Typography>
            )}
            {list?.visibility === 'public_subscribers' && (
              <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.65 }}>
                {t('pages.lists.paid_list_snapshot_hint_subscribers', {
                  snapshotPrice: formatListMoney(
                    paidAccess?.snapshotAmountCents ?? paidAccess?.amountCents,
                    paidAccess?.currency
                  ),
                })}
              </Typography>
            )}
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                lineHeight: 1.65,
                ...(list?.visibility === 'public_subscribers' ? { mt: 1.25 } : {}),
              }}
            >
              {t(
                list?.visibility === 'public_subscribers'
                  ? 'pages.lists.paid_list_intro_subscribers'
                  : 'pages.lists.paid_list_intro',
                list?.visibility === 'public_subscribers'
                  ? { price: formatListMoney(paidAccess?.amountCents, paidAccess?.currency) }
                  : {
                      monthlyPrice: formatListMoney(paidAccess?.amountCents, paidAccess?.currency),
                      snapshotPrice: formatListMoney(
                        paidAccess?.snapshotAmountCents ?? paidAccess?.amountCents,
                        paidAccess?.currency
                      ),
                    }
              )}
            </Typography>
            {paywallRelativeDate && (
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  mt: 0.5,
                  color: 'primary.dark',
                  fontWeight: 600,
                  textAlign: 'right',
                }}
              >
                {t('pages.lists.paid_last_updated', { date: paywallRelativeDate })}
              </Typography>
            )}
          </Box>
          <Stack spacing={1.5}>
            {paidAccess?.creatorDeleted && (
              <Typography variant="body2" color="text.disabled">
                {t('pages.lists.freemium_creator_deleted')}
              </Typography>
            )}
            {!paidAccess?.creatorDeleted && paidAccess?.chargesEnabled === false && (
              <Typography variant="body2" color="text.disabled">
                {t('pages.lists.freemium_payments_not_ready')}
              </Typography>
            )}
            {!paidAccess?.creatorDeleted && paidAccess?.chargesEnabled !== false && (
              <>
                {/* Snapshot — one-time purchase (first) */}
                {authenticated ? (
                  <Button
                    fullWidth
                    variant="outlined"
                    size="large"
                    onClick={handleSnapshotCheckout}
                    loading={busyKey === 'snapshot'}
                    disabled={busy}
                    sx={{ fontWeight: 700, py: 1.4, minHeight: 48, borderRadius: 4 }}
                  >
                    {t('pages.lists.freemium_snapshot_cta', {
                      price: formatListMoney(
                        paidAccess?.snapshotAmountCents ?? paidAccess?.amountCents,
                        paidAccess?.currency
                      ),
                    })}
                  </Button>
                ) : (
                  <Button
                    fullWidth
                    variant="outlined"
                    size="large"
                    component={RouterLink}
                    href={loginHref}
                    sx={{ fontWeight: 700, py: 1.4, minHeight: 48, borderRadius: 4 }}
                  >
                    {t('pages.lists.freemium_snapshot_cta', {
                      price: formatListMoney(
                        paidAccess?.snapshotAmountCents ?? paidAccess?.amountCents,
                        paidAccess?.currency
                      ),
                    })}
                  </Button>
                )}
                {/* Live List — monthly subscription */}
                {authenticated ? (
                  <Button
                    fullWidth
                    color="primary"
                    variant="contained"
                    size="large"
                    onClick={handleSubscribeToList}
                    loading={busyKey === 'subscribe'}
                    disabled={busy}
                    sx={{
                      fontWeight: 800,
                      py: 1.4,
                      minHeight: 48,
                      borderRadius: 4,
                      '&:active': { transform: busyKey === 'subscribe' ? 'none' : 'scale(0.98)' },
                    }}
                  >
                    {t('pages.lists.freemium_live_list_cta', {
                      price: formatListMoney(paidAccess?.amountCents, paidAccess?.currency),
                    })}
                  </Button>
                ) : (
                  <Button
                    fullWidth
                    component={RouterLink}
                    href={loginHref}
                    color="primary"
                    variant="contained"
                    size="large"
                    sx={{ fontWeight: 800, py: 1.4, minHeight: 48, borderRadius: 4 }}
                  >
                    {t('pages.lists.paid_login_to_subscribe')}
                  </Button>
                )}
              </>
            )}
          </Stack>
        </Stack>
      )}

      {(() => {
        const showPlacesChrome =
          (items?.length ?? 0) > 0 && !showPaidPaywall && error !== 'login_required';

        const freemiumGateCard =
          !showPaidPaywall &&
          paidAccess?.enabled &&
          !paidAccess?.hasSubscription &&
          !initialMembership?.isOwner ? (
            <Card
              variant="outlined"
              sx={{
                p: 2.5,
                borderRadius: 2,
                textAlign: 'center',
                bgcolor: 'background.neutral',
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                {paidAccess?.hasMore
                  ? t('pages.lists.freemium_gate_title')
                  : t('pages.lists.freemium_gate_title_small')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {paidAccess?.hasMore
                  ? t('pages.lists.freemium_gate_body', {
                      price: formatListMoney(paidAccess.amountCents, paidAccess.currency),
                    })
                  : t('pages.lists.freemium_gate_body_small', {
                      snapshotPrice: formatListMoney(
                        paidAccess.snapshotAmountCents ?? paidAccess.amountCents,
                        paidAccess.currency
                      ),
                      monthlyPrice: formatListMoney(paidAccess.amountCents, paidAccess.currency),
                    })}
              </Typography>
              {paidAccess?.creatorDeleted && (
                <Typography variant="body2" color="text.disabled">
                  {t('pages.lists.freemium_creator_deleted')}
                </Typography>
              )}
              {!paidAccess?.creatorDeleted && paidAccess?.chargesEnabled === false && (
                <Typography variant="body2" color="text.disabled">
                  {t('pages.lists.freemium_payments_not_ready')}
                </Typography>
              )}
              {!paidAccess?.creatorDeleted && paidAccess?.chargesEnabled !== false && (
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                  alignItems={{ xs: 'stretch', sm: 'center' }}
                  justifyContent="center"
                  flexWrap="wrap"
                  sx={{ width: 1 }}
                >
                  {authenticated ? (
                    <Button
                      variant="outlined"
                      size="large"
                      onClick={handleSnapshotCheckout}
                      loading={busyKey === 'snapshot'}
                      disabled={busy}
                      sx={{ width: { xs: '100%', sm: 'auto' } }}
                    >
                      {t('pages.lists.freemium_snapshot_cta', {
                        price: formatListMoney(
                          paidAccess.snapshotAmountCents ?? paidAccess.amountCents,
                          paidAccess.currency
                        ),
                      })}
                    </Button>
                  ) : (
                    <Button
                      variant="outlined"
                      size="large"
                      component={RouterLink}
                      href={loginHref}
                      sx={{ width: { xs: '100%', sm: 'auto' } }}
                    >
                      {t('pages.lists.freemium_snapshot_cta', {
                        price: formatListMoney(
                          paidAccess.snapshotAmountCents ?? paidAccess.amountCents,
                          paidAccess.currency
                        ),
                      })}
                    </Button>
                  )}
                  {authenticated ? (
                    <Button
                      variant="contained"
                      color="primary"
                      size="large"
                      onClick={handleSubscribeToList}
                      loading={busyKey === 'subscribe'}
                      disabled={busy}
                      sx={{ width: { xs: '100%', sm: 'auto' } }}
                    >
                      {t('pages.lists.freemium_live_list_cta', {
                        price: formatListMoney(paidAccess.amountCents, paidAccess.currency),
                      })}
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      color="primary"
                      size="large"
                      component={RouterLink}
                      href={loginHref}
                      sx={{ width: { xs: '100%', sm: 'auto' } }}
                    >
                      {t('pages.lists.freemium_live_list_cta', {
                        price: formatListMoney(paidAccess.amountCents, paidAccess.currency),
                      })}
                    </Button>
                  )}
                </Stack>
              )}
            </Card>
          ) : null;

        const placeCards = (
          <Stack spacing={1.5}>
            <List
              dense
              disablePadding
              aria-label={t('pages.dashboard.map.sheet_list_aria')}
              sx={{ mx: -0.5 }}
            >
              {sortedItems.map((row) => {
                const placeRow = mapPlaceFromListRestaurant(row.restaurants);
                if (!placeRow) return null;
                const mapsUrl = mapPlaceMapsUrl(placeRow);
                const phoneCall = mapPlaceTelHref(placeRow);
                const rowListIds = savedListIdsByRestaurant[String(placeRow.id)] ?? [];
                const isSaved = Array.isArray(rowListIds) && rowListIds.length > 0;
                const ratingVal = mapPlaceNumericRating(placeRow);
                const chipLabels = mapPlaceTagLabelsCapped(placeRow, t, tagCatalog, {
                  tagCatalogLoaded,
                });
                const listRingItems = [...rowListIds]
                  .map((lid) => {
                    const id = String(lid);
                    const hit = listMetaById[id];
                    return hit ?? { id, name: '', cover_image_url: null };
                  })
                  .sort((a, b) =>
                    String(a.name).localeCompare(String(b.name), undefined, {
                      sensitivity: 'base',
                    })
                  );
                const followingOwners = followingOwnersByRestaurant[String(placeRow.id)] ?? [];
                return (
                  <Box key={row.id} id={`list-spot-${placeRow.id}`} sx={{ scrollMarginTop: 88 }}>
                    <MapSpotSheetListRow
                      row={placeRow}
                      isHighlighted={
                        pinHighlightMapId != null && spotIdEq(placeRow.id, pinHighlightMapId)
                      }
                      mapsUrl={mapsUrl}
                      phoneCall={phoneCall}
                      rowListIds={rowListIds}
                      isSaved={isSaved}
                      ratingVal={ratingVal}
                      chipLabels={chipLabels}
                      tagsLoading={!tagCatalogLoaded}
                      listRingItems={listRingItems}
                      followingOwners={followingOwners}
                      followingOwnersLoading={followingOwnersLoading}
                      userId={userId}
                      viewerAvatarUrl={viewerAvatarUrl}
                      viewerDisplayName={viewerDisplayName}
                      onSelectSpot={handleListPlaceRowSelect}
                      onListSave={handleRowSaveRequest}
                      onShareRow={handleListPlaceShare}
                      listRowActionBtnSx={listRowActionBtnSx}
                      restaurantAnalytics={restaurantAnalytics}
                      t={t}
                    />
                  </Box>
                );
              })}
            </List>
            {freemiumGateCard}
          </Stack>
        );

        let mainPlaces = placeCards;
        if (showPlacesChrome && placesView === 'map') {
          if (!MAPBOX_API.accessToken) {
            mainPlaces = (
              <Alert severity="warning" variant="outlined">
                {t('pages.dashboard.map.map_placeholder')}
              </Alert>
            );
          } else if (sortedMapPlaces.length === 0) {
            mainPlaces = (
              <Alert severity="info" variant="outlined">
                {t('pages.lists.places_map_no_pins')}
              </Alert>
            );
          } else {
            mainPlaces = (
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                sx={{
                  width: 1,
                  /**
                   * Dashboard `Main` + drill shells are flex columns with `minHeight: 0`. Without a
                   * positive xs `minHeight` + `flexShrink: 0`, this stack can collapse to 0px tall on
                   * mobile — Mapbox then renders nothing (blank white under the List/Map toggle).
                   * When embedded in the dashboard, stretch the map card to consume all space under
                   * the List/Map toggle instead of a fixed 360px band.
                   */
                  ...(isDashboardEmbed
                    ? {
                        flex: '1 1 0%',
                        minHeight: 0,
                        minWidth: 0,
                        borderRadius: 0,
                        border: 'none',
                        // md+: parent flex chain isn't always height-definite, so the row's
                        // cross-axis stretches to the tallest child (the aside list panel),
                        // making the map taller than the viewport and the page scroll.
                        // Cap to viewport height under the appbar so panels stay in view.
                        maxHeight: { md: 'calc(100dvh - 160px)' },
                        height: { md: 'calc(100dvh - 160px)' },
                      }
                    : {
                        flexShrink: 0,
                        minHeight: { xs: 360, sm: 420, md: 420 },
                        /**
                         * Public page is a natural-flow document, so the row has no flex chain to
                         * size against. Without an explicit height the md+ row stretches to the
                         * tallest child (the 400px aside list), so the map grows past the viewport
                         * and fitBounds centers the spots below the fold. xs gets the same cap so
                         * the map fills the screen instead of a fixed 360px band with the footer
                         * leaking into the first viewport.
                         */
                        height: {
                          xs: 'calc(100dvh - 260px)',
                          sm: 'calc(100dvh - 280px)',
                          md: 'calc(100dvh - 300px)',
                        },
                        maxHeight: {
                          xs: 'calc(100dvh - 260px)',
                          sm: 'calc(100dvh - 280px)',
                          md: 'calc(100dvh - 300px)',
                        },
                      }),
                  alignItems: { md: 'stretch' },
                  overflow: { xs: 'hidden', md: 'hidden' },
                  ...(!isDashboardEmbed
                    ? {
                        borderRadius: 2,
                        border: (muiTheme) => `1px solid ${muiTheme.palette.divider}`,
                        bgcolor: (muiTheme) => alpha(muiTheme.palette.grey[500], 0.12),
                      }
                    : {
                        bgcolor: (muiTheme) => alpha(muiTheme.palette.grey[500], 0.12),
                      }),
                }}
              >
                <Box
                  ref={listMapSlotRef}
                  sx={{
                    ...(isDashboardEmbed
                      ? {
                          flex: '1 1 0%',
                          flexShrink: { xs: 1, md: 0 },
                          // xs/sm: parent column flex chain doesn't always materialize a
                          // definite height, so the absolutely-positioned map canvas would
                          // collapse to 0. Floor with `minHeight` while still letting
                          // `flex: 1` grow to fill available column space.
                          minHeight: { xs: 360, sm: 420, md: 0 },
                          height: { xs: 'auto', sm: 'auto', md: '100%' },
                        }
                      : {
                          /* Fill the (now viewport-capped) row instead of a fixed 360px band. */
                          flex: '1 1 0%',
                          flexShrink: 0,
                          minHeight: {
                            xs: 360,
                            sm: 420,
                            md: 420,
                          },
                          height: 'auto',
                        }),
                    minWidth: 0,
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    /**
                     * Let Mapbox receive drags/pinches on mobile; avoid the document scroll view
                     * claiming the gesture when the gesture starts inside the map card.
                     */
                    touchAction: { xs: 'none', md: 'auto' },
                    isolation: 'isolate',
                    flexBasis: { md: 0 },
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      zIndex: 0,
                      borderRadius: isDashboardEmbed ? 0 : { xs: '8px 8px 0 0', md: '8px 0 0 8px' },
                      overflow: 'hidden',
                      /* Let Mapbox own pan/pinch; avoid the page scroll view stealing vertical drags on mobile. */
                      touchAction: 'none',
                      '& .mapboxgl-map': { width: '100% !important', height: '100% !important' },
                    }}
                  >
                    <DashboardMapCanvas
                      key={`list-map-${listId}`}
                      accessToken={MAPBOX_API.accessToken}
                      places={sortedMapPlaces}
                      selectedId={pinHighlightMapId}
                      onMarkerClick={handleListMapMarkerClick}
                      followingOwnersByRestaurant={followingOwnersByRestaurant}
                      mapSelectedRow={pinHighlightMapRow}
                      fitBoundsTarget={mapFitBounds}
                      autoGeolocateOnLoad={false}
                      rightAsideWidthPx={isMobileSheet ? undefined : 400}
                      resizeSignal={listMapSlotHeightPx}
                    />
                  </Box>
                  {isMobileSheet ? (
                    <MapMobileSpotSheetShell
                      anchor="embedded"
                      bottomInsetPx={isDashboardEmbed ? NAV.H_MOBILE_BOTTOM : 0}
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
                      {listMapSpotSheetInner}
                    </MapMobileSpotSheetShell>
                  ) : null}
                </Box>
                {!isMobileSheet ? (
                  <Box
                    component="aside"
                    aria-label={t('pages.dashboard.map.sheet_list_aria')}
                    sx={{
                      display: { xs: 'none', md: 'flex' },
                      flexDirection: 'column',
                      width: 400,
                      minWidth: 0,
                      flexShrink: 0,
                      minHeight: 0,
                      alignSelf: 'stretch',
                      bgcolor: (muiTheme) => alpha(muiTheme.palette.background.paper, 0.98),
                      borderRadius: { md: '0 8px 8px 0' },
                      boxShadow: (muiTheme) => muiTheme.shadows[8],
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
                      }}
                    >
                      {listMapSpotSheetInner}
                    </Box>
                  </Box>
                ) : null}
              </Stack>
            );
          }
        }

        const showEmptyPlaces =
          (!items || items.length === 0) && error !== 'login_required' && !showPaidPaywall;

        if (showEmptyPlaces) {
          const emptyPlacesCard = (
            <Box
              sx={{
                mt: 0.5,
                py: { xs: 3, sm: 4 },
                px: 2,
                textAlign: 'center',
                borderRadius: 2,
                bgcolor: (muiTheme) => alpha(muiTheme.palette.grey[500], 0.06),
                border: (muiTheme) => `1px dashed ${muiTheme.palette.divider}`,
                ...(!freemiumGateCard && isDashboardEmbed
                  ? {
                      flex: '1 1 0%',
                      minHeight: 0,
                      width: 1,
                      alignSelf: 'stretch',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                    }
                  : { width: 1 }),
              }}
            >
              <Iconify
                icon={ic.mapPointBold}
                width={36}
                sx={{
                  color: (muiTheme) => alpha(muiTheme.palette.primary.main, 0.4),
                  mb: 1.5,
                  display: 'block',
                  mx: 'auto',
                }}
              />
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
                {t('pages.lists.no_places')}
              </Typography>
              <Typography
                variant="body2"
                color="text.disabled"
                sx={{ mt: 0.75, maxWidth: 280, mx: 'auto' }}
              >
                {t('pages.lists.no_places_hint')}
              </Typography>
            </Box>
          );

          mainPlaces = freemiumGateCard ? (
            <Stack
              spacing={1.5}
              sx={
                isDashboardEmbed
                  ? {
                      flex: '1 1 0%',
                      minHeight: 0,
                      width: 1,
                      alignSelf: 'stretch',
                    }
                  : { width: 1 }
              }
            >
              {emptyPlacesCard}
              {freemiumGateCard}
            </Stack>
          ) : (
            emptyPlacesCard
          );
        }

        const placesViewToggle = showPlacesChrome ? (
          <ToggleButtonGroup
            exclusive
            value={placesView}
            onChange={(_event, next) => {
              if (next != null) handlePlacesViewChange(next);
            }}
            aria-label={t('pages.lists.places_view_toggle_aria')}
            fullWidth
            size="small"
            color="primary"
            sx={{
              mb: isDashboardEmbed ? 0 : 1,
              ...(isDashboardEmbed && placesView === 'list'
                ? { flexShrink: 0, alignSelf: 'stretch' }
                : null),
            }}
          >
            <ToggleButton value="list">{t('pages.lists.places_view_list')}</ToggleButton>
            <ToggleButton value="map">{t('pages.lists.places_view_map')}</ToggleButton>
          </ToggleButtonGroup>
        ) : null;

        const placesSortControl =
          showPlacesChrome && placesView === 'list' && listHasMultiplePlaces ? (
            <Box sx={{ pt: SPACE.sm, mb: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <MapSheetSortMenu sortMode={listSortMode} onSortModeChange={handleListSortChange} />
              </Box>
              {listSortLocationError ? (
                <Alert
                  severity="warning"
                  onClose={() => setListSortLocationError(false)}
                  sx={{ mt: 1 }}
                >
                  {t('pages.lists.sort_location_error')}
                </Alert>
              ) : null}
            </Box>
          ) : null;

        const placesSortLocationAlert =
          showPlacesChrome && placesView === 'map' && listSortLocationError ? (
            <Alert
              severity="warning"
              onClose={() => setListSortLocationError(false)}
              sx={{ mb: 1, mx: { xs: 2, sm: 3, md: 0 } }}
            >
              {t('pages.lists.sort_location_error')}
            </Alert>
          ) : null;

        if (isDashboardEmbed) {
          return (
            <Box
              sx={{
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 0,
                width: 1,
                alignSelf: 'stretch',
                ...(placesView === 'map'
                  ? { flex: 1, minHeight: 0, overflow: 'visible' }
                  : { flexShrink: 0 }),
              }}
            >
              {placesViewToggle}
              {placesSortControl}
              {placesSortLocationAlert}
              <Box
                sx={{
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'visible',
                  width: 1,
                  alignSelf: 'stretch',
                  ...(placesView === 'map'
                    ? {
                        flex: 1,
                        minHeight: 0,
                        /**
                         * Mobile map: bleed past `SettingsPageContainer` side gutters so the map is
                         * edge-to-edge (same values as `SETTINGS_PAGE_GUTTER_PX`). md+ keeps the
                         * split map+sheet layout inside the gutters.
                         */
                        width: { xs: 'auto', md: 1 },
                        mx: { xs: -2, sm: -3, md: 0 },
                      }
                    : {
                        flexShrink: 0,
                      }),
                }}
              >
                {mainPlaces}
              </Box>
            </Box>
          );
        }

        return (
          <>
            {placesViewToggle}
            {placesSortControl}
            {placesSortLocationAlert}
            {mainPlaces}
          </>
        );
      })()}
    </Stack>
  );

  const saveToListSheet = saveSheetRestaurantId ? (
    <SaveToListSheet
      open
      onClose={() => setSaveSheetRestaurantId(null)}
      restaurantId={saveSheetRestaurantId}
      onApplied={handleListPlaceSaveApplied}
      myUserId={userId}
    />
  ) : null;

  const shareFeedbackSnackbar = (
    <ShareFeedbackSnackbar
      feedback={shareFeedback}
      onClose={dismissShareFeedback}
      /* Clear the fixed mobile bottom nav in the dashboard embed. */
      sx={isDashboardEmbed ? { bottom: { xs: NAV.H_MOBILE_BOTTOM + 16, md: 24 } } : undefined}
    />
  );

  const guestAuthPrompt =
    isPublicPageVariant && guestAuthPromptRestaurantId ? (
      <RestaurantPublicAuthPrompt
        restaurantId={guestAuthPromptRestaurantId}
        open={guestAuthPromptOpen}
        onClose={handleCloseGuestAuthPrompt}
        autoOpen={false}
      />
    ) : null;

  if (isDashboardEmbed) {
    return (
      <>
        <Box
          sx={{
            /**
             * List mode stays a narrow reading column. Map mode uses a split layout (map + 400px sheet);
             * capping at 560px leaves ~160px for the map on md+, which looks broken.
             */
            maxWidth: placesView === 'map' ? 'none' : 560,
            width: 1,
            mx: 'auto',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            /**
             * Map mode is a fixed-height split layout, so it must claim the remaining flex space and
             * have `minHeight: 0` so its inner map can shrink. List mode is a natural-flow reading
             * column — let the document/page scroll instead of trapping scroll in an inner container
             * (the dashboard `Main` uses `flexGrow:1` with `flex-basis:auto`, which doesn't reliably
             * constrain a nested `flex:1` scroll viewport).
             */
            ...(placesView === 'map' ? { flex: 1, minHeight: 0 } : { flexShrink: 0 }),
            /**
             * Mobile: fixed `NavBottom` (z-index 1090) sits above in-viewport content. Map + embedded
             * sheet use z-index 2 inside the card — without extra bottom padding, the interactive map
             * and sheet sit under the nav and taps go to nav links instead of the map.
             */
            pb: {
              xs: placesView === 'map' ? 0 : 'max(24px, env(safe-area-inset-bottom, 0px))',
              md: placesView === 'map' ? 0 : 3,
            },
            /**
             * Map tab: cancel `SettingsPageContainer` bottom padding so the map meets the bottom nav /
             * safe area (same values as `SettingsPageContainer` `pb`).
             */
            ...(placesView === 'map'
              ? {
                  mb: {
                    xs: 'calc(-1 * max(24px, env(safe-area-inset-bottom, 0px)))',
                    md: -3,
                    lg: -4,
                  },
                }
              : null),
          }}
        >
          {body}
        </Box>
        {saveToListSheet}
        {guestAuthPrompt}
        {shareFeedbackSnackbar}
      </>
    );
  }

  return (
    <>
      <Container
        maxWidth={placesView === 'map' ? false : 'sm'}
        disableGutters={placesView === 'map'}
        sx={{
          py: placesView === 'map' ? 0 : 4,
          pb: placesView === 'map' ? `env(safe-area-inset-bottom, 0px)` : 8,
          ...(placesView === 'map'
            ? {
                px: 0,
              }
            : {}),
        }}
      >
        {body}
      </Container>
      {saveToListSheet}
      {guestAuthPrompt}
      {shareFeedbackSnackbar}
    </>
  );
}

ListPublicView.propTypes = {
  variant: PropTypes.oneOf(['page', 'dashboard']),
  listId: PropTypes.string,
  list: PropTypes.object,
  items: PropTypes.array,
  owner: PropTypes.object,
  error: PropTypes.string,
  membership: PropTypes.object,
  paidAccess: PropTypes.object,
};
