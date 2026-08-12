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
