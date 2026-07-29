/**
 * Comma-separated Supabase Auth user UUIDs (server env only).
 * @returns {Set<string>}
 */
export function getAdminUserIdSet() {
  const raw = process.env.ADMIN_USER_IDS ?? '';
  const ids = String(raw)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  return new Set(ids);
}

/**
 * @param {string | null | undefined} userId
 * @returns {boolean}
 */
export function isAdminUserId(userId) {
  if (!userId || typeof userId !== 'string') return false;
  return getAdminUserIdSet().has(userId);
}
