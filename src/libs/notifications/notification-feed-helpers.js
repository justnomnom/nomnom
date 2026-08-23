/** Sentinel for "show every list" in the notifications panel filter chips. */
export const NOTIFICATION_LIST_FILTER_ALL = '__all__';

/**
 * Filter notifications by list chip selection.
 *
 * @param {Array<{ data?: { list_id?: string } }> | null | undefined} notifications
 * @param {string} [listFilter]
 * @returns {Array}
 */
export function filterNotificationsByListId(
  notifications,
  listFilter = NOTIFICATION_LIST_FILTER_ALL
) {
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

/** Date buckets the feed groups rows under, newest first. */
export const NOTIFICATION_DATE_SECTIONS = Object.freeze(['today', 'week', 'earlier']);

const DAY_MS = 24 * 60 * 60 * 1000;

/** Local midnight for a timestamp — buckets follow the reader's calendar, not UTC. */
function startOfLocalDay(value) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Which date section a notification belongs to.
 * Future-dated rows (clock skew) fall in `today` rather than disappearing.
 *
 * @param {string | number | Date | null | undefined} createdAt
 * @param {number | Date} [now]
 * @returns {'today'|'week'|'earlier'}
 */
export function resolveNotificationDateSection(createdAt, now = Date.now()) {
  const ts = new Date(createdAt ?? NaN).getTime();
  if (!Number.isFinite(ts)) return 'earlier';
  const todayStart = startOfLocalDay(now);
  if (ts >= todayStart) return 'today';
  // "This week" = the six calendar days before today.
  if (ts >= todayStart - 6 * DAY_MS) return 'week';
  return 'earlier';
}

/** Timestamp of a `groupNotifications` entry (single row or collapsed group). */
export function resolveFeedEntryTimestamp(entry) {
  if (!entry) return null;
  return entry.kind === 'group' ? entry.createdAt : (entry.notification?.created_at ?? null);
}

/**
 * Bucket `groupNotifications` output into date sections, preserving feed order
 * within each section and dropping empty sections.
 *
 * @param {Array<object> | null | undefined} entries
 * @param {number | Date} [now]
 * @returns {Array<{ key: 'today'|'week'|'earlier', entries: Array<object> }>}
 */
export function bucketFeedEntriesByDate(entries, now = Date.now()) {
  const buckets = new Map(NOTIFICATION_DATE_SECTIONS.map((key) => [key, []]));

  (Array.isArray(entries) ? entries : []).forEach((entry) => {
    if (!entry) return;
    const section = resolveNotificationDateSection(resolveFeedEntryTimestamp(entry), now);
    buckets.get(section).push(entry);
  });

  return NOTIFICATION_DATE_SECTIONS.map((key) => ({ key, entries: buckets.get(key) })).filter(
    (section) => section.entries.length > 0
  );
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
