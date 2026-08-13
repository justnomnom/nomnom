import { filterMutedRecipients } from 'src/libs/notifications/filter-notification-recipients';
import { filterDigestRecipientsByEmailPreference } from 'src/libs/notifications/group-list-update-digest';

/** Minimum hours between Live List subscriber emails for the same list. */
export const LIVE_LIST_NOTIFY_COOLDOWN_HOURS = 24;

/**
 * Whether a Live List email should be skipped because of the per-list cooldown.
 *
 * @param {string | null | undefined} lastNotifiedAt — ISO timestamp from `lists.last_notified_at`
 * @param {number} [nowMs]
 * @param {number} [cooldownHours]
 * @returns {boolean} true when still inside the cooldown window
 */
export function isWithinLiveListNotifyCooldown(
  lastNotifiedAt,
  nowMs = Date.now(),
  cooldownHours = LIVE_LIST_NOTIFY_COOLDOWN_HOURS
) {
  if (!lastNotifiedAt) return false;
  const then = new Date(lastNotifiedAt).getTime();
  if (Number.isNaN(then)) return false;
  const hoursSinceLast = (nowMs - then) / (1000 * 60 * 60);
  return hoursSinceLast < cooldownHours;
}

/**
 * Live List email audience: email opt-in first, then list/creator mutes.
 *
 * @param {Object} params
 * @param {Iterable<string>} params.subscriberIds
 * @param {Array} [params.muteRows]
 * @param {Array} [params.prefRows]
 * @param {string} params.listId
 * @param {string} params.creatorId
 * @returns {string[]}
 */
export function resolveLiveListEmailRecipients({
  subscriberIds = [],
  muteRows = [],
  prefRows = [],
  listId,
  creatorId,
} = {}) {
  const emailOptInIds = filterDigestRecipientsByEmailPreference(subscriberIds, prefRows);
  return filterMutedRecipients([...emailOptInIds], muteRows, { listId, creatorId });
}

/**
 * Keep only admin-user lookups that returned an email address.
 *
 * @param {Array<[string, string | null]> | null | undefined} entries
 * @returns {Record<string, string>}
 */
export function emailsByUserFromAdminLookups(entries) {
  return Object.fromEntries((Array.isArray(entries) ? entries : []).filter(([, email]) => email));
}

/**
 * Stamp `last_notified_at` only when at least one send settled fulfilled.
 *
 * @param {PromiseSettledResult<unknown>[] | null | undefined} sendResults
 * @returns {boolean}
 */
export function shouldStampLiveListNotifiedAt(sendResults) {
  return (Array.isArray(sendResults) ? sendResults : []).some((r) => r.status === 'fulfilled');
}
