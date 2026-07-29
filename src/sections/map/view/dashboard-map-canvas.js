'use client';

import 'mapbox-gl/dist/mapbox-gl.css';
import PropTypes from 'prop-types';
import Map, { Layer, Marker, Source } from 'react-map-gl/mapbox';
import { memo, useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

import { fRating } from 'src/utils/format-number';
import {
  USER_SCOPED_KEYS,
  clientScopedGetJson,
  clientScopedSetJson,
} from 'src/utils/user-scoped-storage';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { tabularNumsSx } from 'src/theme/spacing';

import Iconify from 'src/components/iconify';
import MapControl from 'src/components/map/map-control';

import { ROULETTE_PREVIEW_BBOX } from 'src/sections/roulette/constants';
import { mapPlaceNumericRating } from 'src/sections/map/map-spot-sheet-helpers';

// ----------------------------------------------------------------------

const MAP_STYLE = 'mapbox://styles/mapbox/streets-v12';

function spotIdEq(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

function parseLngLat(row) {
  const lat = row.latitude != null ? Number(row.latitude) : NaN;
  const lng = row.longitude != null ? Number(row.longitude) : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };

/**
 * Clusters exist up to `clusterMaxZoom` (13); the following badges are DOM markers that
 * can't participate in clustering, so they only render once every point is unclustered.
 */
const FOLLOWING_BADGE_MIN_ZOOM = 13;

/** Cap DOM markers — following lists are small, but guard against pathological viewports. */
const FOLLOWING_BADGE_MAX_MARKERS = 40;

function ownerFirstName(owner) {
  const display = typeof owner?.displayName === 'string' ? owner.displayName.trim() : '';
  if (display) return display.split(/\s+/)[0];
  const username = typeof owner?.username === 'string' ? owner.username.trim() : '';
  return username;
}

/** "Maria" · "Maria & Rui" · "Maria, Rui & Ana" · "Maria, Rui & Ana +2" */
function followerNamesLabel(owners) {
  const names = owners.map(ownerFirstName).filter(Boolean);
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  if (names.length === 3) return `${names[0]}, ${names[1]} & ${names[2]}`;
  return `${names[0]}, ${names[1]} & ${names[2]} +${names.length - 3}`;
}

// ----------------------------------------------------------------------

function DashboardMapCanvas({
  accessToken,
  places,
  selectedId,
  onMarkerClick,
  clientScopeUserId = null,
  /** `{ [restaurantId]: Array<{ userId, displayName, username, avatarUrl }> }` — followed users
   * who have the spot on one of their lists; drives the minimal avatar badge on pins. */
  followingOwnersByRestaurant = null,
  /** `{ [restaurantId]: string[] }` — list ids the viewer has saved the spot to; a non-empty
   * entry lightens the pin so saved spots stand out from un-saved ones. */
  savedListIdsByRestaurant = null,
  /** Viewer avatar/name — injected as the first badge owner on spots the viewer has saved, so
   * "my own icon" shows next to my saved pins alongside any followed users who also have them. */
  viewerAvatarUrl = null,
  viewerDisplayName = null,
  mapSelectedRow = null,
  fitBoundsTarget = null,
  onViewportCenterChange = null,
  /** Emits `{west, south, east, north}` on map load and ~450ms after the user finishes moving. */
  onViewportBoundsChange = null,
  /**
   * Imperative escape hatch: when provided, `boundsApiRef.current.getBounds()` returns the map's
   * *live* viewport `{west, south, east, north}` synchronously. "Search this area" reads this on
   * click so it searches exactly what's on screen — not the debounced `onViewportBoundsChange`
   * value, which can lag a fast pan by ~450ms.
   */
  boundsApiRef = null,
  /**
   * Emits `{ latitude, longitude }` when the user taps the GeolocateControl and a GPS fix lands.
   * Lets the parent anchor distance sorting to the user's real location instead of the map center.
   */
  onUserLocate = null,
  /**
   * Auto-firing geolocate on load races user pinch-zoom — the async geolocation API can resolve
   * seconds after mount and then flies the map away from wherever the user already zoomed to.
   * Default off; users can tap the GeolocateControl button explicitly to recenter.
   */
  autoGeolocateOnLoad = false,
  /** When set (desktop split view), used for fitBounds / initial padding instead of breakpoint defaults. */
  rightAsideWidthPx = null,
  /** When this value changes (e.g. embedded list map slot height), trigger `map.resize()`. */
  resizeSignal = null,
}) {
  const theme = useTheme();
  const { t, currentLang } = useTranslate();
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'));
  /** Matches desktop aside width in map-view / loading skeleton: md 380, lg 400, xl 420. */
  const isLgUp = useMediaQuery(theme.breakpoints.up('lg'));
  const isXlUp = useMediaQuery(theme.breakpoints.up('xl'));
  let breakpointAsideWidthPx = 380;
  if (isXlUp) {
    breakpointAsideWidthPx = 420;
  } else if (isLgUp) {
    breakpointAsideWidthPx = 400;
  }
  const desktopAsideWidthPx =
    typeof rightAsideWidthPx === 'number' && Number.isFinite(rightAsideWidthPx)
      ? rightAsideWidthPx
      : breakpointAsideWidthPx;
  const mapRef = useRef(null);
  const geolocateControlRef = useRef(/** @type {{ trigger?: () => void } | null} */ (null));
  const autoGeolocateAttemptedRef = useRef(false);
  const lastFitKeyRef = useRef('');
  /** Set once the user has manually moved/zoomed the map — used to suppress the *initial*
   * auto-fit that races their gesture (e.g. saved/following chip restored from previous session
   * landing while the user is pinch-zooming). After the first suppression, subsequent fits run
   * normally so explicit chip toggles still recenter. */
  const userMovedMapRef = useRef(false);
  const suppressedInitialFitRef = useRef(false);
  const centerDebounceRef = useRef(null);
  const viewStatePersistRef = useRef(null);
  /** Current zoom (settled, post-move) — gates the following badges to unclustered zooms. */
  const [settledZoom, setSettledZoom] = useState(null);

  const [mapViewSegA, mapViewSegB] = USER_SCOPED_KEYS.mapViewState;

  const persistedViewState = useMemo(() => {
    const raw = clientScopedGetJson(clientScopeUserId, mapViewSegA, mapViewSegB);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const lat = Number(raw.latitude);
    const lng = Number(raw.longitude);
    const zoom = Number(raw.zoom);
    const bearing = raw.bearing == null ? 0 : Number(raw.bearing);
    const pitch = raw.pitch == null ? 0 : Number(raw.pitch);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(zoom)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    if (zoom < 0 || zoom > 24) return null;
    return {
      latitude: lat,
      longitude: lng,
      zoom,
      bearing: Number.isFinite(bearing) ? bearing : 0,
      pitch: Number.isFinite(pitch) ? pitch : 0,
    };
  }, [clientScopeUserId, mapViewSegA, mapViewSegB]);

  useEffect(
    () => () => {
      if (centerDebounceRef.current) {
        clearTimeout(centerDebounceRef.current);
      }
      if (viewStatePersistRef.current) {
        clearTimeout(viewStatePersistRef.current);
      }
    },
    []
  );

  const emitViewportCenter = useCallback(() => {
    if (!onViewportCenterChange) return;
    const map = mapRef.current?.getMap?.();
    const c = map?.getCenter?.();
    if (!c) return;
    onViewportCenterChange({ latitude: c.lat, longitude: c.lng });
  }, [onViewportCenterChange]);

  const emitViewportBounds = useCallback(() => {
    if (!onViewportBoundsChange) return;
    const map = mapRef.current?.getMap?.();
    const b = map?.getBounds?.();
    if (!b) return;
    onViewportBoundsChange({
      west: b.getWest(),
      south: b.getSouth(),
      east: b.getEast(),
      north: b.getNorth(),
    });
  }, [onViewportBoundsChange]);

  // Expose a synchronous live-bounds reader to the parent (see `boundsApiRef` prop docs).
  useEffect(() => {
    if (!boundsApiRef) return undefined;
    boundsApiRef.current = {
      getBounds: () => {
        const map = mapRef.current?.getMap?.();
        const b = map?.getBounds?.();
        if (!b) return null;
        return {
          west: b.getWest(),
          south: b.getSouth(),
          east: b.getEast(),
          north: b.getNorth(),
        };
      },
    };
    return () => {
      boundsApiRef.current = null;
    };
  }, [boundsApiRef]);

  const handleGeolocate = useCallback(
    (evt) => {
      const lat = evt?.coords?.latitude;
      const lng = evt?.coords?.longitude;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      // Deterministically center on the user. The native control's own camera move uses
      // fitBounds around the GPS accuracy circle — on a low-accuracy (desktop/wifi) fix that
      // box is huge, so it zooms out so far it looks like "nothing happened". An explicit
      // flyTo to a usable zoom overrides that and reliably takes the user to where they are.
      const map = mapRef.current?.getMap?.();
      if (map?.flyTo) {
        const currentZoom = typeof map.getZoom === 'function' ? map.getZoom() : 0;
        map.flyTo({
          center: [lng, lat],
          zoom: Math.max(Number.isFinite(currentZoom) ? currentZoom : 0, 14),
          essential: true,
          duration: 1000,
        });
      }
      onUserLocate?.({ latitude: lat, longitude: lng });
    },
    [onUserLocate]
  );

  /** Geolocation failed (permission denied, timeout, unavailable). Surface it instead of
   * silently doing nothing — the user tapped the button expecting the map to move. */
  const handleGeolocateError = useCallback((err) => {
    console.warn('[DashboardMapCanvas] geolocate failed:', err?.message ?? err);
  }, []);

  const { west, south, east, north } = ROULETTE_PREVIEW_BBOX;

  const initialViewState = useMemo(
    () =>
      persistedViewState || {
        bounds: [
          [west, south],
          [east, north],
        ],
        fitBoundsOptions: {
          maxZoom: 11,
          ...(isNarrow
            ? {
                padding: {
                  top: 110,
                  bottom: 248,
                  left: 14,
                  right: 14,
                },
              }
            : {
                /** Room for floating search (top) + responsive-width spots panel (right). */
                padding: { top: 72, bottom: 40, left: 40, right: desktopAsideWidthPx },
              }),
        },
      },
    [west, south, east, north, isNarrow, desktopAsideWidthPx, persistedViewState]
  );

  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map?.resize) return undefined;
    const id = requestAnimationFrame(() => {
      map.resize();
    });
    return () => cancelAnimationFrame(id);
  }, [isNarrow, desktopAsideWidthPx, resizeSignal]);

  const rowForFly = useMemo(() => {
    if (!selectedId) return null;
    if (mapSelectedRow && spotIdEq(mapSelectedRow.id, selectedId)) {
      return mapSelectedRow;
    }
    return places.find((p) => spotIdEq(p.id, selectedId)) ?? null;
  }, [places, selectedId, mapSelectedRow]);

  const selectedCoords = rowForFly ? parseLngLat(rowForFly) : null;
  const selectedLat = selectedCoords?.lat;
  const selectedLng = selectedCoords?.lng;

  /**
   * Layout values only affect the *padding* of a fly — they must NOT retrigger one. They settle
   * 2-3 times right after mount (media queries hydrate; the list-panel width loads from storage),
   * so keeping them in `flyToSelection`'s deps made the camera re-fly to the selected pin on each
   * settle — the "map jumps a few times then stops" bug. Read them from a ref so a fly only fires
   * when the *selection* changes.
   */
  const flyPaddingRef = useRef({ isNarrow, desktopAsideWidthPx });
  flyPaddingRef.current = { isNarrow, desktopAsideWidthPx };

  const flyToSelection = useCallback(() => {
    if (!Number.isFinite(selectedLat) || !Number.isFinite(selectedLng)) return;
    const map = mapRef.current?.getMap?.();
    if (!map?.flyTo) return;
    const nextZoom = Math.max(map.getZoom(), 12.5);
    // Pad against the bottom sheet (mobile) or right aside (desktop) so the pin
    // lands in the visible region rather than under an overlay.
    const { isNarrow: narrow, desktopAsideWidthPx: asideWidth } = flyPaddingRef.current;
    const padding = narrow
      ? { top: 96, bottom: 220, left: 20, right: 20 }
      : { top: 72, bottom: 40, left: 40, right: asideWidth };
    map.flyTo({
      center: [selectedLng, selectedLat],
      zoom: nextZoom,
      padding,
      essential: true,
      duration: 1200,
    });
  }, [selectedLat, selectedLng]);

  // Only re-center when the selected place or its coordinates change — not when `places` is replaced
  // with the same selection (e.g. filters refetch) or when layout settles (breakpoint/panel width).
  useEffect(() => {
    flyToSelection();
  }, [selectedId, flyToSelection]);

  const onLoad = useCallback(() => {
    flyToSelection();
    emitViewportCenter();
    emitViewportBounds();

    const loadedZoom = mapRef.current?.getMap?.()?.getZoom?.();
    if (Number.isFinite(loadedZoom)) setSettledZoom(loadedZoom);

    const shouldAutoGeolocate = autoGeolocateOnLoad && !persistedViewState;
    if (shouldAutoGeolocate && !selectedId && !autoGeolocateAttemptedRef.current) {
      autoGeolocateAttemptedRef.current = true;
      window.setTimeout(() => {
        const gc = geolocateControlRef.current;
        if (typeof gc?.trigger === 'function') {
          gc.trigger();
        }
      }, 120);
    }
  }, [
    autoGeolocateOnLoad,
    persistedViewState,
    emitViewportCenter,
    emitViewportBounds,
    flyToSelection,
    selectedId,
  ]);

  useEffect(() => {
    const key = fitBoundsTarget?.key ?? '';
    const rows = fitBoundsTarget?.places;
    if (!key || !rows?.length) {
      lastFitKeyRef.current = '';
      return undefined;
    }
    if (key === lastFitKeyRef.current) {
      return undefined;
    }
    // If a saved/following fetch is landing *while* the user is mid-gesture (the initial-load
    // race), don't fly the camera away from them. Only suppress this once — after the first
    // suppression, subsequent fits (e.g. user toggling a chip) run normally.
    if (userMovedMapRef.current && !suppressedInitialFitRef.current) {
      suppressedInitialFitRef.current = true;
      lastFitKeyRef.current = key;
      return undefined;
    }

    let cancelled = false;
    let rafAttempts = 0;

    const run = () => {
      if (cancelled) return;
      const map = mapRef.current?.getMap?.();
      if (!map?.fitBounds) {
        rafAttempts += 1;
        // Mapbox init (style fetch, WebGL context) can outlive a short poll window,
        // especially on slow devices — give it ~15s before abandoning the fit.
        if (rafAttempts < 900) {
          requestAnimationFrame(run);
        }
        return;
      }
      // Mark the key consumed only once a camera move actually runs; marking it
      // up-front meant a missed fit (map not ready in time) was never retried and
      // users landed on the default preview bbox instead of the list's spots.
      lastFitKeyRef.current = key;
      let bboxWest = Infinity;
      let bboxEast = -Infinity;
      let bboxSouth = Infinity;
      let bboxNorth = -Infinity;
      rows.forEach((p) => {
        const ll = parseLngLat(p);
        if (!ll) return;
        bboxWest = Math.min(bboxWest, ll.lng);
        bboxEast = Math.max(bboxEast, ll.lng);
        bboxSouth = Math.min(bboxSouth, ll.lat);
        bboxNorth = Math.max(bboxNorth, ll.lat);
      });
      if (!Number.isFinite(bboxWest) || !Number.isFinite(bboxEast)) return;
      if (bboxWest === bboxEast && bboxSouth === bboxNorth) {
        map.flyTo({
          center: [bboxWest, bboxSouth],
          zoom: 12.5,
          duration: 700,
          essential: true,
        });
        return;
      }
      map.fitBounds(
        [
          [bboxWest, bboxSouth],
          [bboxEast, bboxNorth],
        ],
        {
          padding: isNarrow
            ? { top: 96, bottom: 220, left: 20, right: 52 }
            : {
                top: 72,
                bottom: 40,
                left: 40,
                right: desktopAsideWidthPx,
              },
          maxZoom: 14,
          duration: 750,
          essential: true,
        }
      );
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [fitBoundsTarget, isNarrow, desktopAsideWidthPx]);

  const onMoveEnd = useCallback(
    (evt) => {
      // User-driven moves carry an originalEvent; programmatic flyTo/fitBounds don't.
      if (evt.originalEvent) userMovedMapRef.current = true;

      const vs = evt.viewState;
      if (vs && Number.isFinite(vs.zoom)) setSettledZoom(vs.zoom);
      if (
        vs &&
        Number.isFinite(vs.latitude) &&
        Number.isFinite(vs.longitude) &&
        Number.isFinite(vs.zoom)
      ) {
        if (viewStatePersistRef.current) {
          clearTimeout(viewStatePersistRef.current);
        }
        const snapshot = {
          latitude: vs.latitude,
          longitude: vs.longitude,
          zoom: vs.zoom,
          bearing: Number.isFinite(vs.bearing) ? vs.bearing : 0,
          pitch: Number.isFinite(vs.pitch) ? vs.pitch : 0,
        };
        viewStatePersistRef.current = setTimeout(() => {
          viewStatePersistRef.current = null;
          clientScopedSetJson(clientScopeUserId, mapViewSegA, mapViewSegB, snapshot);
        }, 400);
      }

      if (!onViewportCenterChange && !onViewportBoundsChange) return;
      if (centerDebounceRef.current) {
        clearTimeout(centerDebounceRef.current);
      }
      centerDebounceRef.current = setTimeout(() => {
        centerDebounceRef.current = null;
        emitViewportCenter();
        emitViewportBounds();
      }, 450);
    },
    [
      emitViewportCenter,
      emitViewportBounds,
      onViewportCenterChange,
      onViewportBoundsChange,
      clientScopeUserId,
      mapViewSegA,
      mapViewSegB,
    ]
  );

  const placesGeoJson = useMemo(
    () => ({
      type: 'FeatureCollection',
      features: places
        .map((row) => {
          const ll = parseLngLat(row);
          if (!ll) return null;
          const trimmedName =
            row.name != null && String(row.name).trim() !== '' ? String(row.name).trim() : '';
          const ratingVal = mapPlaceNumericRating(row);
          const savedListIds = savedListIdsByRestaurant?.[String(row.id)];
          const saved = Array.isArray(savedListIds) && savedListIds.length > 0;
          return {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [ll.lng, ll.lat] },
            properties: {
              id: String(row.id),
              name: trimmedName,
              sponsored: row.is_sponsored === true ? 1 : 0,
              saved: saved ? 1 : 0,
              hasRating: ratingVal != null,
              ratingText: ratingVal != null ? fRating(ratingVal, currentLang) : '',
            },
          };
        })
        .filter(Boolean),
    }),
    [places, savedListIdsByRestaurant, currentLang]
  );

  /**
   * Minimal "who follows this" badges (DESIGN map-pin component): a 16px avatar of the first
   * followed user with the spot on a list, plus a `+N` chip for the rest, docked top-left on the dot.
   * The dot itself stays the hero — it remains the circle layer below.
   */
  /** The viewer themselves as a badge owner — prepended on spots they've saved ("my own icon"). */
  const viewerOwner = useMemo(
    () =>
      clientScopeUserId
        ? {
            userId: String(clientScopeUserId),
            displayName: viewerDisplayName ?? null,
            username: null,
            avatarUrl: viewerAvatarUrl ?? null,
          }
        : null,
    [clientScopeUserId, viewerDisplayName, viewerAvatarUrl]
  );

  const followingBadgePins = useMemo(() => {
    const pins = [];
    for (let i = 0; i < places.length && pins.length < FOLLOWING_BADGE_MAX_MARKERS; i += 1) {
      const row = places[i];
      const rid = String(row.id);
      const followedOwners = Array.isArray(followingOwnersByRestaurant?.[rid])
        ? followingOwnersByRestaurant[rid]
        : [];
      const savedByViewer =
        !!viewerOwner &&
        Array.isArray(savedListIdsByRestaurant?.[rid]) &&
        savedListIdsByRestaurant[rid].length > 0;
      if (followedOwners.length > 0 || savedByViewer) {
        // Viewer first ("my own icon"), then followed users (deduped against the viewer's id in
        // case a future source ever lists the viewer among owners).
        const owners = savedByViewer
          ? [viewerOwner, ...followedOwners.filter((o) => String(o?.userId) !== viewerOwner.userId)]
          : followedOwners;
        const ll = parseLngLat(row);
        if (ll) {
          pins.push({ id: rid, lng: ll.lng, lat: ll.lat, owners });
        }
      }
    }
    return pins;
  }, [places, followingOwnersByRestaurant, savedListIdsByRestaurant, viewerOwner]);

  const showFollowingBadges =
    Number.isFinite(settledZoom) && settledZoom > FOLLOWING_BADGE_MIN_ZOOM;

  const unclusteredFilter = useMemo(() => {
    const base = ['!', ['has', 'point_count']];
    if (!selectedId) return base;
    return ['all', base, ['!=', ['get', 'id'], String(selectedId)]];
  }, [selectedId]);

  const clusterLayer = useMemo(
    () => ({
      id: 'clusters',
      type: 'circle',
      source: 'places',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          theme.palette.primary.light,
          25,
          theme.palette.primary.main,
          75,
          theme.palette.primary.dark,
        ],
        'circle-radius': ['step', ['get', 'point_count'], 16, 25, 22, 75, 28],
        'circle-stroke-width': 2,
        'circle-stroke-color': theme.palette.common.white,
      },
    }),
    [theme]
  );

  const clusterCountLayer = useMemo(
    () => ({
      id: 'cluster-count',
      type: 'symbol',
      source: 'places',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': 13,
        'text-allow-overlap': true,
      },
      paint: { 'text-color': theme.palette.common.white },
    }),
    [theme]
  );

  /**
   * Simple dot pins — small markers, paired with a separate label layer that shows the
   * restaurant name beside them. Sponsored places swap to the warning tone; everything else
   * uses the dark terracotta (primary.darker) so non-sponsored pins read as "restaurant" in the
   * brand palette without competing with the lighter cluster bubbles. (DESIGN — Map Pins card.)
   */
  const unclusteredDotLayer = useMemo(
    () => ({
      id: 'unclustered-dot',
      type: 'circle',
      source: 'places',
      filter: unclusteredFilter,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 3, 12, 4, 14, 6],
        'circle-color': [
          'case',
          ['==', ['get', 'sponsored'], 1],
          theme.palette.warning.main,
          // Saved spots read as a lighter terracotta so they pop against the darker un-saved pins.
          ['==', ['get', 'saved'], 1],
          theme.palette.primary.main,
          theme.palette.primary.darker,
        ],
        'circle-stroke-width': 1.5,
        'circle-stroke-color': theme.palette.common.white,
      },
    }),
    [theme, unclusteredFilter]
  );

  /**
   * Restaurant-name labels beside the dots. Text-only (no icons) keeps it lightweight; mapbox
   * handles collision so labels hide automatically when zoomed out, then fade in as you zoom in.
   * `text-allow-overlap: false` lets denser areas auto-thin without manual filtering.
   */
  const unclusteredLabelLayer = useMemo(
    () => ({
      id: 'unclustered-label',
      type: 'symbol',
      source: 'places',
      filter: unclusteredFilter,
      layout: {
        // Name on its own; when a rating exists, append a gold "★ 4.7" section so unselected
        // pins read the same as the selected-pin label (which uses an Iconify star).
        'text-field': [
          'case',
          ['get', 'hasRating'],
          [
            'format',
            ['get', 'name'],
            {},
            // Star keeps its original gold tone; only the rating number reads in text.primary.
            '   ★ ',
            { 'text-color': theme.palette.warning.main },
            ['get', 'ratingText'],
            { 'text-color': theme.palette.text.primary },
          ],
          ['get', 'name'],
        ],
        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
        'text-size': 11,
        'text-offset': [0.7, 0],
        'text-anchor': 'left',
        'text-optional': true,
        'text-allow-overlap': false,
        'text-max-width': 8,
      },
      paint: {
        'text-color': theme.palette.text.primary,
        'text-halo-color': theme.palette.common.white,
        'text-halo-width': 1.2,
        'text-opacity': ['interpolate', ['linear'], ['zoom'], 11.8, 0, 13, 1],
      },
    }),
    [theme, unclusteredFilter]
  );

  const onMapClick = useCallback(
    (evt) => {
      const features = evt.features || [];
      const cluster = features.find((f) => f.layer?.id === 'clusters');
      if (cluster) {
        const map = mapRef.current?.getMap?.();
        const src = map?.getSource?.('places');
        if (src?.getClusterExpansionZoom) {
          src.getClusterExpansionZoom(cluster.properties.cluster_id, (err, z) => {
            if (err || !Number.isFinite(z)) return;
            map.easeTo({
              center: cluster.geometry.coordinates,
              zoom: z,
              duration: 500,
            });
          });
        }
        return;
      }
      const pin = features.find(
        (f) => f.layer?.id === 'unclustered-dot' || f.layer?.id === 'unclustered-label'
      );
      if (pin) onMarkerClick?.(pin.properties.id);
    },
    [onMarkerClick]
  );

  if (!accessToken) {
    return null;
  }

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={accessToken}
      mapStyle={MAP_STYLE}
      initialViewState={initialViewState}
      style={MAP_CONTAINER_STYLE}
      reuseMaps
      /* We never use 3D pitch or rotation on this view — disabling them removes the gesture
       * recognizers and the per-frame matrix math Mapbox would otherwise spend on them. */
      dragRotate={false}
      pitchWithRotate={false}
      touchPitch={false}
      /* Discrete touchZoomRotate is fine; we just don't want it driving a *rotation* gesture. */
      maxPitch={0}
      /* Single-copy world keeps tile fetches + label collision work scoped to one globe pass. */
      renderWorldCopies={false}
      onLoad={onLoad}
      onMoveEnd={onMoveEnd}
      onClick={onMapClick}
      interactiveLayerIds={['clusters', 'unclustered-dot', 'unclustered-label']}
    >
      <MapControl
        hideScaleControl
        geolocateControlRef={geolocateControlRef}
        onGeolocate={handleGeolocate}
        onGeolocateError={handleGeolocateError}
      />

      <Source
        id="places"
        type="geojson"
        data={placesGeoJson}
        cluster
        clusterMaxZoom={13}
        clusterRadius={50}
      >
        <Layer {...clusterLayer} />
        <Layer {...clusterCountLayer} />
        <Layer {...unclusteredDotLayer} />
        <Layer {...unclusteredLabelLayer} />
      </Source>

      {showFollowingBadges
        ? followingBadgePins.map((pin) => {
            // The selected pin renders its own expanded follower row below.
            if (spotIdEq(pin.id, selectedId)) return null;
            const first = pin.owners[0];
            const rest = pin.owners.length - 1;
            return (
              <Marker
                key={`following-badge-${pin.id}`}
                longitude={pin.lng}
                latitude={pin.lat}
                anchor="center"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  onMarkerClick?.(pin.id);
                }}
              >
                <Box
                  sx={{
                    position: 'relative',
                    width: 12,
                    height: 12,
                    pointerEvents: 'none',
                  }}
                >
                  <Box
                    sx={{
                      // Docked above-right of the dot (DESIGN whoBadge: top -11, right 7) so the
                      // dot stays the hero instead of being covered by the photo.
                      position: 'absolute',
                      top: -11,
                      right: 7,
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      pointerEvents: 'auto',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    <Avatar
                      src={first.avatarUrl || undefined}
                      alt={ownerFirstName(first)}
                      sx={{
                        width: 16,
                        height: 16,
                        fontSize: 8,
                        fontWeight: 800,
                        border: '1.5px solid',
                        borderColor: 'common.white',
                        boxShadow: theme.shadows[2],
                        bgcolor: 'primary.lighter',
                        color: 'primary.darker',
                      }}
                    >
                      {ownerFirstName(first).charAt(0).toUpperCase()}
                    </Avatar>
                    {rest > 0 ? (
                      <Box
                        component="span"
                        sx={{
                          ml: -0.5,
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 8,
                          fontWeight: 800,
                          bgcolor: 'grey.200',
                          color: 'text.secondary',
                          border: '1.5px solid',
                          borderColor: 'common.white',
                          boxShadow: theme.shadows[2],
                        }}
                      >
                        +{rest}
                      </Box>
                    ) : null}
                  </Box>
                </Box>
              </Marker>
            );
          })
        : null}

      {(() => {
        if (!rowForFly) return null;
        const ll = parseLngLat(rowForFly);
        if (!ll) return null;
        const isSponsored = rowForFly.is_sponsored === true;
        const placeName =
          rowForFly.name != null && String(rowForFly.name).trim() !== ''
            ? String(rowForFly.name).trim()
            : t('pages.dashboard.restaurant.category_fallback');
        const dotColor = isSponsored ? theme.palette.warning.main : theme.palette.primary.darker;
        const ratingVal = mapPlaceNumericRating(rowForFly);
        const selectedOwners = Array.isArray(followingOwnersByRestaurant?.[String(rowForFly.id)])
          ? followingOwnersByRestaurant[String(rowForFly.id)]
          : [];
        const selectedOwnersLabel = followerNamesLabel(selectedOwners);
        return (
          <Marker
            longitude={ll.lng}
            latitude={ll.lat}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              onMarkerClick?.(rowForFly.id);
            }}
          >
            {/**
             * Selected-pin visual: same shape language as the unclustered dots — just a slightly
             * larger filled circle with a thicker white ring and a soft halo to read as "selected".
             * Name sits right beside it (always visible — the user just picked this pin).
             */}
            <Box
              role="button"
              tabIndex={0}
              aria-label={t('pages.dashboard.map.pin_aria', { name: placeName })}
              onClick={() => onMarkerClick?.(rowForFly.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onMarkerClick?.(rowForFly.id);
                }
              }}
              sx={{
                position: 'relative',
                width: 14,
                height: 14,
                cursor: 'pointer',
                pointerEvents: 'auto',
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
                '&:focus-visible': {
                  outline: `2px solid ${theme.palette.primary.main}`,
                  outlineOffset: 4,
                  borderRadius: '50%',
                },
              }}
            >
              {/* Soft halo to indicate selection */}
              <Box
                aria-hidden
                sx={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  transform: 'translate(-50%, -50%)',
                  bgcolor: alpha(dotColor, 0.22),
                  pointerEvents: 'none',
                }}
              />
              {/* The dot itself — sized box is the marker's geometric center, so anchor="center" lands on the location. */}
              <Box
                aria-hidden
                sx={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  bgcolor: dotColor,
                  border: '2.5px solid',
                  borderColor: 'common.white',
                  boxShadow: theme.shadows[4],
                }}
              />
              {/* Expanded follower badge — on selection the stack opens up to show EVERY
               * followed user with this spot on a list (DESIGN map-pins: "the badge expands to
               * show every follower"). Following+this-spot sets are inherently small, so there is
               * no `+N` collapse here — that abbreviation is only for the unselected resting pin. */}
              {selectedOwners.length > 0 ? (
                <Box
                  aria-hidden
                  sx={{
                    // Full follower stack docked above the dot (DESIGN whoBadge selected:
                    // top -13, right 9) — not floated off to the side.
                    position: 'absolute',
                    top: -13,
                    right: 9,
                    display: 'flex',
                    alignItems: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  {selectedOwners.map((owner, i) => (
                    <Avatar
                      key={owner.userId ?? i}
                      src={owner.avatarUrl || undefined}
                      alt={ownerFirstName(owner)}
                      sx={{
                        width: 16,
                        height: 16,
                        fontSize: 8,
                        fontWeight: 800,
                        ml: i > 0 ? -0.5 : 0,
                        border: '1.5px solid',
                        borderColor: 'common.white',
                        boxShadow: theme.shadows[2],
                        bgcolor: 'primary.lighter',
                        color: 'primary.darker',
                      }}
                    >
                      {ownerFirstName(owner).charAt(0).toUpperCase()}
                    </Avatar>
                  ))}
                </Box>
              ) : null}
              <Box
                sx={{
                  position: 'absolute',
                  left: '100%',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  ml: 0.75,
                  width: 'max-content',
                  maxWidth: 'none',
                  bgcolor: alpha(theme.palette.background.paper, 0.92),
                  px: 0.75,
                  py: 0.35,
                  borderRadius: 1,
                  border: `1px solid ${alpha(theme.palette.grey[600], 0.18)}`,
                  boxShadow: theme.shadows[2],
                  pointerEvents: 'none',
                }}
              >
                {/* Spot name + rating (line 1) + follower names (line 2). Text-only — the photos
                 * live on the pin badge above, so the pill names the followers in words. (DESIGN pill.) */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography
                    component="span"
                    sx={{
                      whiteSpace: 'nowrap',
                      fontWeight: 700,
                      fontSize: 11,
                      lineHeight: 1.2,
                      color: 'text.primary',
                    }}
                  >
                    {placeName}
                  </Typography>
                  {ratingVal != null ? (
                    <Box
                      component="span"
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.25,
                        flexShrink: 0,
                      }}
                    >
                      <Iconify
                        icon={ic.starBold}
                        width={11}
                        sx={{ color: 'warning.main', flexShrink: 0 }}
                      />
                      <Typography
                        component="span"
                        sx={{ fontWeight: 800, fontSize: 11, lineHeight: 1.2, ...tabularNumsSx }}
                      >
                        {fRating(ratingVal, currentLang)}
                      </Typography>
                    </Box>
                  ) : null}
                </Box>
                {selectedOwnersLabel ? (
                  // DESIGN map-pins pill `.by` row: mini follower photos then the names label,
                  // so the pill restates *who* with faces, not just words.
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      mt: 0.5,
                      maxWidth: 200,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                      {selectedOwners.slice(0, 3).map((owner, i) => (
                        <Avatar
                          key={owner.userId ?? i}
                          src={owner.avatarUrl || undefined}
                          alt={ownerFirstName(owner)}
                          sx={{
                            width: 12,
                            height: 12,
                            fontSize: 7,
                            fontWeight: 800,
                            ml: i > 0 ? -0.375 : 0,
                            border: '1px solid',
                            borderColor: 'common.white',
                            bgcolor: 'primary.lighter',
                            color: 'primary.darker',
                          }}
                        >
                          {ownerFirstName(owner).charAt(0).toUpperCase()}
                        </Avatar>
                      ))}
                    </Box>
                    <Typography
                      component="span"
                      noWrap
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        fontWeight: 600,
                        fontSize: 9,
                        lineHeight: 1.3,
                        color: 'text.secondary',
                      }}
                    >
                      {selectedOwnersLabel}
                    </Typography>
                  </Box>
                ) : null}
              </Box>
            </Box>
          </Marker>
        );
      })()}
    </Map>
  );
}

export default memo(DashboardMapCanvas);

DashboardMapCanvas.propTypes = {
  accessToken: PropTypes.string.isRequired,
  places: PropTypes.array.isRequired,
  selectedId: PropTypes.string,
  onMarkerClick: PropTypes.func,
  mapSelectedRow: PropTypes.object,
  fitBoundsTarget: PropTypes.shape({
    key: PropTypes.string,
    places: PropTypes.array,
  }),
  clientScopeUserId: PropTypes.string,
  followingOwnersByRestaurant: PropTypes.object,
  savedListIdsByRestaurant: PropTypes.object,
  viewerAvatarUrl: PropTypes.string,
  viewerDisplayName: PropTypes.string,
  onViewportCenterChange: PropTypes.func,
  onViewportBoundsChange: PropTypes.func,
  boundsApiRef: PropTypes.shape({ current: PropTypes.any }),
  onUserLocate: PropTypes.func,
  autoGeolocateOnLoad: PropTypes.bool,
  rightAsideWidthPx: PropTypes.number,
  resizeSignal: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};
