/**
 * Safe post-auth return path (open-redirect guard).
 * Used by login, register, and auth callback for every user type.
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
