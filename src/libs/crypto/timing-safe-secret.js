import { timingSafeEqual } from 'node:crypto';

/**
 * Constant-time comparison for shared secrets (Bearer tokens, webhooks).
 * @param {string} provided
 * @param {string} expected
 * @returns {boolean}
 */
export function isValidSecret(provided, expected) {
  if (!expected || typeof provided !== 'string') return false;
  try {
    const a = Buffer.from(provided, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
