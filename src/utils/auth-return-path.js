/**
 * Safe post-auth return path (open-redirect guard).
 * Used by login, register, GuestGuard, and auth callback for every user type.
 *
 * @param {unknown} path
 * @returns {boolean}
 */
export function isValidAuthReturnPath(path) {
  if (!path || typeof path !== 'string') return false;
  if (!path.startsWith('/')) return false;
  if (path.startsWith('//')) return false;
  if (path.includes('://')) return false;
  if (/^(javascript|data):/i.test(path)) return false;
  return true;
}

/**
 * Returns `path` when it is a safe in-app return, otherwise `fallback`.
 *
 * @param {unknown} path
 * @param {string} fallback
 * @returns {string}
 */
export function sanitizeAuthReturnPath(path, fallback) {
  return isValidAuthReturnPath(path) ? path : fallback;
}
