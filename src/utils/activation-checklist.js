/**
 * First-run activation checklist: dismiss persistence and done-state derivation.
 * Completion is derived from follows/saves — not a separate table.
 */

export const ACTIVATION_DISMISS_VERSION = 1;
export const ACTIVATION_DISMISS_PREFIX = 'nomnom.activation.dismissed';

/**
 * @param {string | null | undefined} userId
 * @returns {string}
 */
export function activationDismissStorageKey(userId) {
  const id = userId != null && String(userId).trim() !== '' ? String(userId).trim() : '_';
  return `${ACTIVATION_DISMISS_PREFIX}.v${ACTIVATION_DISMISS_VERSION}:${id}`;
}

/**
 * @param {string | null | undefined} userId
 * @returns {boolean}
 */
export function isActivationChecklistDismissed(userId) {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(activationDismissStorageKey(userId)) === '1';
  } catch {
    return false;
  }
}

/**
 * @param {string | null | undefined} userId
 */
export function dismissActivationChecklist(userId) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(activationDismissStorageKey(userId), '1');
  } catch {
    /* quota / private mode */
  }
}

/**
 * @param {Record<string, unknown> | null | undefined} savedListIdsByRestaurant
 * @returns {boolean}
 */
export function restaurantHasSaves(savedListIdsByRestaurant) {
  if (!savedListIdsByRestaurant || typeof savedListIdsByRestaurant !== 'object') {
    return false;
  }
  return Object.values(savedListIdsByRestaurant).some(
    (ids) => Array.isArray(ids) && ids.length > 0
  );
}

/**
 * @param {{ dismissed?: boolean, hasFollowed?: boolean, hasSaved?: boolean }} state
 * @returns {boolean}
 */
export function shouldShowActivationChecklist({ dismissed, hasFollowed, hasSaved } = {}) {
  if (dismissed) return false;
  return !(Boolean(hasFollowed) && Boolean(hasSaved));
}
