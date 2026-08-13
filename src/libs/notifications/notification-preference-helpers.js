/** Defaults when no `notification_preferences` row exists. */
export const NOTIFICATION_PREF_DEFAULTS = Object.freeze({
  list_updates_in_app: true,
  list_updates_push: true,
  list_updates_email: false,
});

/** Allowed mute target types. */
export const NOTIFICATION_MUTE_TYPES = Object.freeze(new Set(['list', 'creator']));

/**
 * Merge a DB preference row with defaults (missing fields → defaults).
 *
 * @param {{ list_updates_in_app?: boolean, list_updates_push?: boolean, list_updates_email?: boolean } | null | undefined} row
 * @returns {{ list_updates_in_app: boolean, list_updates_push: boolean, list_updates_email: boolean }}
 */
export function mergeNotificationPreferences(row) {
  return {
    list_updates_in_app: row?.list_updates_in_app ?? NOTIFICATION_PREF_DEFAULTS.list_updates_in_app,
    list_updates_push: row?.list_updates_push ?? NOTIFICATION_PREF_DEFAULTS.list_updates_push,
    list_updates_email: row?.list_updates_email ?? NOTIFICATION_PREF_DEFAULTS.list_updates_email,
  };
}

/**
 * Build an upsert row from a patch. Only boolean fields are copied.
 *
 * @param {string} userId
 * @param {{ list_updates_in_app?: unknown, list_updates_push?: unknown, list_updates_email?: unknown } | null | undefined} patch
 * @param {string} [updatedAt]
 * @returns {{ user_id: string, updated_at: string, list_updates_in_app?: boolean, list_updates_push?: boolean, list_updates_email?: boolean } | null}
 */
export function buildNotificationPreferenceUpsert(userId, patch, updatedAt = new Date().toISOString()) {
  if (!userId) return null;
  const row = { user_id: userId, updated_at: updatedAt };
  let hasField = false;
  if (typeof patch?.list_updates_in_app === 'boolean') {
    row.list_updates_in_app = patch.list_updates_in_app;
    hasField = true;
  }
  if (typeof patch?.list_updates_push === 'boolean') {
    row.list_updates_push = patch.list_updates_push;
    hasField = true;
  }
  if (typeof patch?.list_updates_email === 'boolean') {
    row.list_updates_email = patch.list_updates_email;
    hasField = true;
  }
  return hasField ? row : null;
}

/**
 * Validate mute target arguments.
 *
 * @param {unknown} targetType
 * @param {unknown} targetId
 * @returns {boolean}
 */
export function isValidNotificationMuteTarget(targetType, targetId) {
  return NOTIFICATION_MUTE_TYPES.has(targetType) && Boolean(targetId);
}

/**
 * Optimistic prefs after a toggle. Rollback when the save returns an error.
 *
 * @param {Record<string, boolean>} prefs
 * @param {string} key
 * @param {boolean} previousValue
 * @param {string | null | undefined} error
 * @returns {Record<string, boolean>}
 */
export function rollbackNotificationPrefIfFailed(prefs, key, previousValue, error) {
  if (!error) return prefs;
  return { ...prefs, [key]: previousValue };
}

/**
 * Apply an optimistic pref toggle before the server round-trip.
 *
 * @param {Record<string, boolean>} prefs
 * @param {string} key
 * @param {boolean} value
 * @returns {Record<string, boolean>}
 */
export function optimisticNotificationPrefs(prefs, key, value) {
  return { ...prefs, [key]: value };
}

/**
 * Which push-enable UI to show on notification settings.
 *
 * @param {{ iosNotInstalled?: boolean, supported?: boolean, permission?: string, subscribed?: boolean }} state
 * @returns {'ios_hint'|'unsupported'|'blocked'|'enabled'|'enable'}
 */
export function resolvePushEnableControlKind({
  iosNotInstalled,
  supported,
  permission,
  subscribed,
} = {}) {
  if (iosNotInstalled) return 'ios_hint';
  if (!supported) return 'unsupported';
  if (permission === 'denied') return 'blocked';
  if (subscribed) return 'enabled';
  return 'enable';
}
