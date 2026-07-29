/**
 * Canonical list visibility values used across creator settings, map, and notifications.
 * Unknown / non-string → private (safest default for every audience).
 *
 * @param {unknown} v
 * @returns {'private' | 'public' | 'public_subscribers'}
 */
export function normalizeListVisibility(v) {
  if (typeof v !== 'string') return 'private';
  const x = v.trim();
  if (x === 'public' || x === 'public_subscribers' || x === 'private') return x;
  return 'private';
}
