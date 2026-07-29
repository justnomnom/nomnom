/**
 * Fixed-window in-memory rate limiter (per Node instance).
 * For strict cross-instance limits, use Redis / Upstash on Vercel.
 */

/** @type {Map<string, { count: number, resetAt: number }>} */
const buckets = new Map();

const MAX_KEYS = 50_000;

/**
 * @param {string} key
 * @param {number} max — max attempts per window
 * @param {number} windowMs — window length in ms
 * @returns {boolean} true if allowed, false if over limit
 */
export function rateLimitTake(key, max, windowMs) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  if (b.count >= max) {
    return false;
  }
  b.count += 1;
  if (buckets.size > MAX_KEYS) {
    const keys = Array.from(buckets.keys());
    for (let i = 0; i < keys.length && buckets.size > MAX_KEYS * 0.8; i += 1) {
      buckets.delete(keys[i]);
    }
  }
  return true;
}
