'use client';

import { fetchRestaurantPinsInBbox } from 'src/auth/actions/location-actions';

import { MAP_VIEW_BBOX, MAP_VIEW_PINS_LIMIT } from 'src/sections/roulette/constants';

/**
 * Warms the map's default pin set before the user opens the Map tab, and persists it to
 * sessionStorage for an instant first paint on (re)mount. The map's own in-memory LRU cache only
 * survives while MapView is mounted, so the first visit each session otherwise pays the full
 * world-bbox round-trip ("the map takes a long time to load all the restaurants"). This module
 * decouples that fetch from the MapView lifecycle:
 *
 *  - {@link prefetchDefaultMapPins} — fire-and-forget warm (deduped + freshness-gated). Call on
 *    app entry from an idle callback so it never competes with critical rendering / LCP.
 *  - {@link readPersistedDefaultMapPins} — synchronous read for an instant first paint.
 *  - {@link writeDefaultMapPins} — let MapView feed its own (homeLocality-accurate) default result
 *    back so the next entry serves the freshest set.
 *
 * Pins are plotted purely by coordinate, so the lean default fetch here yields the same usable set
 * the map draws; MapView still re-fetches with the precise filter/sort key and replaces these
 * (stale-while-revalidate) — the swap is seamless since the coordinates are identical.
 */

const STORAGE_KEY = 'nn_map_default_pins_v1';
/** Treat a warm result as fresh for 5 min; after that the next app entry re-warms in the bg. */
const FRESH_MS = 5 * 60 * 1000;

/** @typedef {{ pins: Array<Record<string, unknown>>, ts: number }} DefaultPinsEntry */

/** @type {DefaultPinsEntry | null} */
let memoryEntry = null;
/** @type {Promise<void> | null} */
let inFlight = null;

function isFresh(entry) {
  return !!entry && Date.now() - entry.ts < FRESH_MS;
}

function persist(entry) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // sessionStorage full / unavailable (private mode) — the memory cache still serves this tab.
  }
}

/**
 * Synchronous read for an instant first paint. Prefers the in-memory entry, falling back to
 * sessionStorage (covers a cold mount after a full page reload). Returns the pin rows or null.
 *
 * @returns {Array<Record<string, unknown>> | null}
 */
export function readPersistedDefaultMapPins() {
  if (memoryEntry && Array.isArray(memoryEntry.pins) && memoryEntry.pins.length) {
    return memoryEntry.pins;
  }
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.pins) && parsed.pins.length) {
      memoryEntry = { pins: parsed.pins, ts: Number(parsed.ts) || 0 };
      return memoryEntry.pins;
    }
  } catch {
    // Corrupt cache — ignore and fall through to a network fetch.
  }
  return null;
}

/**
 * Store a default-query pin result (called by MapView after its own successful default fetch, which
 * is keyed with the real `homeLocalityId`). Keeps the persisted set both fresh and accurate.
 *
 * @param {Array<Record<string, unknown>>} pins
 */
export function writeDefaultMapPins(pins) {
  if (!Array.isArray(pins) || pins.length === 0) return;
  memoryEntry = { pins, ts: Date.now() };
  persist(memoryEntry);
}

/**
 * Warm the default pin set. Safe to call repeatedly — concurrent calls share one request, and a
 * fresh result (< {@link FRESH_MS} old) short-circuits without a network round-trip.
 *
 * @param {{ force?: boolean }} [opts]
 * @returns {Promise<void>}
 */
export function prefetchDefaultMapPins(opts = {}) {
  if (typeof window === 'undefined') return Promise.resolve();
  if (inFlight) return inFlight;
  if (!opts.force) {
    // Hydrate memory from storage first so the freshness check survives a reload.
    if (!memoryEntry) readPersistedDefaultMapPins();
    if (isFresh(memoryEntry)) return Promise.resolve();
  }
  // homeLocalityId = null keeps the RPC's sponsor-injection path off; the only difference from the
  // viewer-scoped set is a possible single sponsor pin, which MapView's precise fetch reconciles.
  inFlight = fetchRestaurantPinsInBbox(
    MAP_VIEW_BBOX.west,
    MAP_VIEW_BBOX.south,
    MAP_VIEW_BBOX.east,
    MAP_VIEW_BBOX.north,
    null,
    MAP_VIEW_PINS_LIMIT
  )
    .then(({ restaurants, error }) => {
      if (error) {
        console.warn('[map-default-prefetch]', error);
        return;
      }
      const pins = restaurants ?? [];
      if (pins.length) {
        memoryEntry = { pins, ts: Date.now() };
        persist(memoryEntry);
      }
    })
    .catch((e) => {
      console.warn('[map-default-prefetch]', e?.message ?? e);
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}
