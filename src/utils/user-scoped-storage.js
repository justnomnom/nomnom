// ----------------------------------------------------------------------

import { safeGetItem, safeSetItem, safeRemoveItem, safeClearPattern } from 'src/utils/safe-storage';

/**
 * Client-side persistence keyed as `{userId}-{segmentA}-{segmentB}`.
 * Uses the same fallbacks as `safe-storage` (localStorage → sessionStorage → cookie → memory),
 * which covers typical browsers, Safari on macOS/iOS, and many embedded WebViews.
 *
 * @param {string} segment
 * @returns {string}
 */
function normalizeSegment(segment) {
  const s = String(segment ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 64);
  return s || '_';
}

/**
 * @param {string | null | undefined} userId
 * @returns {string | null}
 */
function assertUserId(userId) {
  if (userId == null || userId === '') return null;
  if (typeof userId !== 'string') return null;
  return userId;
}

/**
 * Build the storage key: `{userId}-{segmentA}-{segmentB}`.
 *
 * @param {string} userId
 * @param {string} segmentA
 * @param {string} segmentB
 * @returns {string | null}
 */
export function userScopedStorageKey(userId, segmentA, segmentB) {
  const uid = assertUserId(userId);
  if (!uid) return null;
  return `${uid}-${normalizeSegment(segmentA)}-${normalizeSegment(segmentB)}`;
}

/**
 * Read JSON previously stored with `userScopedSetJson` (or `safeSetItem` with the same key).
 *
 * @template T
 * @param {string} userId
 * @param {string} segmentA
 * @param {string} segmentB
 * @returns {T | null}
 */
export function userScopedGetJson(userId, segmentA, segmentB) {
  const key = userScopedStorageKey(userId, segmentA, segmentB);
  if (!key) return null;
  return /** @type {T | null} */ (safeGetItem(key));
}

/**
 * @param {string} userId
 * @param {string} segmentA
 * @param {string} segmentB
 * @param {unknown} value
 * @returns {boolean}
 */
export function userScopedSetJson(userId, segmentA, segmentB, value) {
  const key = userScopedStorageKey(userId, segmentA, segmentB);
  if (!key) return false;
  return safeSetItem(key, value);
}

/**
 * @param {string} userId
 * @param {string} segmentA
 * @param {string} segmentB
 * @returns {boolean}
 */
export function userScopedRemove(userId, segmentA, segmentB) {
  const key = userScopedStorageKey(userId, segmentA, segmentB);
  if (!key) return false;
  return safeRemoveItem(key);
}

/**
 * Remove every stored key that belongs to this user’s `{userId}-…` namespace
 * (matches keys produced by `userScopedStorageKey`).
 *
 * @param {string | null | undefined} userId
 */
export function clearUserScopedStorageForUser(userId) {
  const uid = assertUserId(userId);
  if (!uid) return;
  safeClearPattern(`${uid}-`);
}

/** Canonical segment pairs so keys stay consistent across the app. */
export const USER_SCOPED_KEYS = {
  /** Map sheet: restaurant id → list ids the user saved to. */
  mapListIdsByRestaurant: /** @type {const} */ (['map', 'listIdsByRestaurant']),
  /** Map filter sheet: tag slugs, min rating, sort mode (via `clientScoped*` so guests persist too). */
  mapFilterPrefs: /** @type {const} */ (['map', 'filterPrefs']),
  /** Map "My own" / "Following" chip active states and selected list ids. */
  mapChipPrefs: /** @type {const} */ (['map', 'chipPrefs']),
  /** Desktop map: restaurant list panel width in px (draggable splitter). */
  mapListPanelWidth: /** @type {const} */ (['map', 'listPanelWidth']),
  /** Map canvas: last viewport state (lng/lat/zoom/etc) so refresh restores view. */
  mapViewState: /** @type {const} */ (['map', 'viewState']),
  /** Map: last selected restaurant id (+ optional row snapshot for sheet/pin on refresh). */
  mapSelectedSpot: /** @type {const} */ (['map', 'selectedSpot']),
  /** Discover → Map handoff: a natural-language query the map runs once it mounts. */
  mapPendingAiQuery: /** @type {const} */ (['map', 'pendingAiQuery']),
  /** List detail page: last-selected places view ('list' | 'map'), persisted for guests too. */
  listPlacesView: /** @type {const} */ (['lists', 'placesView']),
};

/**
 * Storage key like `userScopedStorageKey`, but uses literal `guest` when `userId` is missing
 * so UI preferences can persist while signed out.
 *
 * @param {string | null | undefined} userId
 * @param {string} segmentA
 * @param {string} segmentB
 * @returns {string}
 */
export function clientScopedStorageKey(userId, segmentA, segmentB) {
  const uid = assertUserId(userId) ?? 'guest';
  return `${uid}-${normalizeSegment(segmentA)}-${normalizeSegment(segmentB)}`;
}

/**
 * @template T
 * @param {string | null | undefined} userId
 * @param {string} segmentA
 * @param {string} segmentB
 * @returns {T | null}
 */
export function clientScopedGetJson(userId, segmentA, segmentB) {
  const key = clientScopedStorageKey(userId, segmentA, segmentB);
  return /** @type {T | null} */ (safeGetItem(key));
}

/**
 * @param {string | null | undefined} userId
 * @param {string} segmentA
 * @param {string} segmentB
 * @param {unknown} value
 * @returns {boolean}
 */
export function clientScopedSetJson(userId, segmentA, segmentB, value) {
  const key = clientScopedStorageKey(userId, segmentA, segmentB);
  return safeSetItem(key, value);
}

/**
 * @param {string | null | undefined} userId
 * @param {string} segmentA
 * @param {string} segmentB
 * @returns {boolean}
 */
export function clientScopedRemoveJson(userId, segmentA, segmentB) {
  const key = clientScopedStorageKey(userId, segmentA, segmentB);
  return safeRemoveItem(key);
}
