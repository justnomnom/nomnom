/** Sentinel for "show every list" in the notifications panel filter chips. */
export const NOTIFICATION_LIST_FILTER_ALL = '__all__';

/**
 * Filter notifications by list chip selection.
 *
 * @param {Array<{ data?: { list_id?: string } }> | null | undefined} notifications
 * @param {string} [listFilter]
 * @returns {Array}
 */
export function filterNotificationsByListId(notifications, listFilter = NOTIFICATION_LIST_FILTER_ALL) {
  const rows = Array.isArray(notifications) ? notifications : [];
  if (!listFilter || listFilter === NOTIFICATION_LIST_FILTER_ALL) return rows;
  return rows.filter((n) => n?.data?.list_id === listFilter);
}

/**
 * Build unique list filter chips from a notification feed (first-seen order).
 *
 * @param {Array<{ data?: { list_id?: string, list_name?: string } }> | null | undefined} notifications
 * @param {string} [fallbackName]
 * @returns {Array<{ id: string, name: string }>}
 */
export function buildNotificationListFilterChips(notifications, fallbackName = 'List') {
  const seen = new Map();
  (Array.isArray(notifications) ? notifications : []).forEach((n) => {
    const id = n?.data?.list_id;
    if (!id || seen.has(id)) return;
    seen.set(id, n?.data?.list_name || fallbackName);
  });
  return [...seen.entries()].map(([id, name]) => ({ id, name }));
}

/**
 * Whether a notification row can expose "mute this list".
 * Only list_update rows with a list_id support mute today.
 *
 * @param {{ type?: string, data?: { list_id?: string } } | null | undefined} notification
 * @returns {boolean}
 */
export function canMuteNotificationList(notification) {
  return notification?.type === 'list_update' && Boolean(notification?.data?.list_id);
}

/**
 * Known in-app notification types produced by the app.
 * Unknown types still render via the list_update-style fallback in the panel.
 */
export const NOTIFICATION_TYPES = Object.freeze([
  'list_update',
  'new_follower',
  'list_invite',
  'list_subscribed',
  'invite_accepted',
  'join_approved',
]);
