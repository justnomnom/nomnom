/**
 * Suggested-creator rows from `get_suggested_creators_for_municipality`.
 * Ids may not be RFC UUID v1–v5 (same contract as onboarding locality ids).
 */

const CREATOR_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * @param {unknown} row
 * @returns {{ userId: string, username: string, name: string, subtitle: string, avatar: string } | null}
 */
export function normalizeSuggestedCreator(row) {
  if (!row || typeof row !== 'object') return null;
  const userId = String(row.user_id ?? row.userId ?? '')
    .trim()
    .toLowerCase();
  if (!CREATOR_ID_RE.test(userId)) return null;
  const username = String(row.username ?? '').trim();
  const displayName = String(row.display_name ?? row.displayName ?? row.name ?? '').trim();
  if (!username && !displayName) return null;
  const name = displayName || username;
  const subtitle = String(row.subtitle ?? '').trim() || (username ? `@${username}` : '');
  const avatar = String(row.avatar_url ?? row.avatarUrl ?? row.avatar ?? '').trim();
  return { userId, username, name, subtitle, avatar };
}

/**
 * @param {unknown} creators
 * @returns {boolean}
 */
export function hasNormalizedSuggestedCreators(creators) {
  if (!Array.isArray(creators)) return false;
  return creators.some((row) => Boolean(normalizeSuggestedCreator(row)));
}
