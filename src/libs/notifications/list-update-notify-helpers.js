/**
 * Pure helpers for list-update fan-out, digest window, cleanup, and push.
 */

/**
 * Whether list visibility should fan out list_update notifications.
 *
 * @param {string | null | undefined} visibility
 * @returns {boolean}
 */
export function shouldFanOutListUpdate(visibility) {
  return visibility === 'public' || visibility === 'public_subscribers';
}

/**
 * Build the in-app / push data payload for a list_update notification.
 *
 * @param {Object} params
 * @param {{ id: string, name?: string | null, user_id: string }} params.list
 * @param {string} params.restaurantId
 * @param {{ name?: string | null } | null} [params.restaurant]
 * @param {{ display_name?: string | null, username?: string | null } | null} [params.creatorProfile]
 * @returns {Record<string, unknown>}
 */
export function buildListUpdateNotificationData({
  list,
  restaurantId,
  restaurant,
  creatorProfile,
} = {}) {
  const creatorName =
    creatorProfile?.display_name || creatorProfile?.username || 'A creator you follow';
  return {
    list_id: list?.id ?? null,
    list_name: list?.name ?? null,
    creator_id: list?.user_id ?? null,
    creator_username: creatorProfile?.username ?? null,
    creator_name: creatorName,
    restaurant_id: restaurantId ?? null,
    restaurant_name: restaurant?.name || 'a new spot',
  };
}

/**
 * ISO cutoff for pruning read notifications older than `days`.
 *
 * @param {number} [days]
 * @param {number} [nowMs]
 * @returns {string}
 */
export function notificationCleanupCutoffIso(days = 60, nowMs = Date.now()) {
  const safeDays = Number.isFinite(days) && days > 0 ? days : 60;
  return new Date(nowMs - safeDays * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * ISO lower bound for the daily list-update email digest window.
 *
 * @param {number} [windowHours]
 * @param {number} [nowMs]
 * @returns {string}
 */
export function digestWindowSinceIso(windowHours = 24, nowMs = Date.now()) {
  const hours = Number.isFinite(windowHours) && windowHours > 0 ? windowHours : 24;
  return new Date(nowMs - hours * 60 * 60 * 1000).toISOString();
}

/**
 * Dead Web Push subscription HTTP statuses that should be deleted.
 *
 * @param {unknown} statusCode
 * @returns {boolean}
 */
export function isDeadWebPushStatus(statusCode) {
  return statusCode === 404 || statusCode === 410;
}

/**
 * Whether web push should attempt delivery for this audience.
 *
 * @param {unknown} userIds
 * @returns {boolean}
 */
export function shouldAttemptWebPush(userIds) {
  return Array.isArray(userIds) && userIds.length > 0;
}

/**
 * Lists that newly received this restaurant (re-adds must not re-notify).
 *
 * @param {Iterable<string> | null | undefined} listIds
 * @param {Iterable<string> | null | undefined} existingListIds
 * @returns {string[]}
 */
export function listIdsNewlyReceivingRestaurant(listIds, existingListIds) {
  let existing = [];
  if (existingListIds != null) {
    existing = Array.isArray(existingListIds) ? existingListIds : [...existingListIds];
  }
  const already = new Set(existing);
  let ids = [];
  if (listIds != null) {
    ids = Array.isArray(listIds) ? listIds : [...listIds];
  }
  return ids.filter((id) => id && !already.has(id));
}
