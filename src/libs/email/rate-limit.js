/**
 * Rate limiting: Upstash Redis when `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
 * are set (shared across serverless instances); otherwise fixed-window in-memory per instance.
 */

import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

import { rateLimitTake as rateLimitMemory } from './rate-limit-memory';

/** @type {Redis | null} */
let redisSingleton = null;

function getRedisClient() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return null;
  }
  if (!redisSingleton) {
    redisSingleton = new Redis({ url, token });
  }
  return redisSingleton;
}

/**
 * Map window length to @upstash/ratelimit duration string (current call sites use 1h).
 * @param {number} windowMs
 * @returns {`${number} s` | `${number} m` | `${number} h` | `${number} d`}
 */
function windowMsToDuration(windowMs) {
  if (windowMs >= 86_400_000) {
    return `${Math.round(windowMs / 86_400_000)} d`;
  }
  if (windowMs >= 3_600_000) {
    return `${Math.round(windowMs / 3_600_000)} h`;
  }
  if (windowMs >= 60_000) {
    return `${Math.round(windowMs / 60_000)} m`;
  }
  return `${Math.max(1, Math.round(windowMs / 1000))} s`;
}

const limiterCache = new Map();

/**
 * @param {string} key — bucket id (e.g. ip prefix)
 * @param {number} max — max attempts per window
 * @param {number} windowMs — window length in ms
 * @returns {Promise<boolean>} true if allowed, false if over limit
 */
export async function rateLimitTake(key, max, windowMs) {
  const client = getRedisClient();
  if (!client) {
    return rateLimitMemory(key, max, windowMs);
  }

  const duration = windowMsToDuration(windowMs);
  const cacheKey = `${max}:${duration}`;

  try {
    let limiter = limiterCache.get(cacheKey);
    if (!limiter) {
      limiter = new Ratelimit({
        redis: client,
        limiter: Ratelimit.slidingWindow(max, duration),
        prefix: `ratelimit:${cacheKey}`,
      });
      limiterCache.set(cacheKey, limiter);
    }

    const { success } = await limiter.limit(key);
    return success;
  } catch {
    limiterCache.delete(cacheKey);
    return rateLimitMemory(key, max, windowMs);
  }
}
