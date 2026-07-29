import { POSTHOG_API, INTEGRATION_FLAGS } from 'src/config-global';

/**
 * Pick a stable PostHog `distinct_id` from common server property shapes.
 * Prefers authenticated user ids over list/resource ids.
 *
 * @param {Record<string, unknown>} [properties]
 * @param {string} [fallbackDistinctId]
 * @returns {string}
 */
export function resolveServerAnalyticsDistinctId(properties = {}, fallbackDistinctId) {
  const candidates = [
    properties.subscriber_user_id,
    properties.buyer_user_id,
    properties.user_id,
    properties.list_id,
    fallbackDistinctId,
  ];

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return 'server';
}

/**
 * Best-effort PostHog capture for Next.js route handlers / webhooks.
 * Gated by `INTEGRATION_FLAGS.posthog` so server events stay aligned with the client kill switch.
 * Never throws — analytics must not break Stripe or auth paths.
 *
 * @param {string} eventName
 * @param {Record<string, unknown>} [properties]
 * @param {{ distinctId?: string; source?: string }} [options]
 * @returns {Promise<boolean>} true when a capture request was attempted
 */
export async function captureServerEvent(eventName, properties = {}, options = {}) {
  if (!INTEGRATION_FLAGS.posthog) return false;
  if (typeof eventName !== 'string' || !eventName.trim()) return false;

  const key = POSTHOG_API.key || process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = POSTHOG_API.host || process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!key || !host) return false;

  const distinctId = resolveServerAnalyticsDistinctId(properties, options.distinctId);
  const source =
    typeof options.source === 'string' && options.source.trim()
      ? options.source.trim()
      : typeof properties.source === 'string' && properties.source.trim()
        ? properties.source.trim()
        : 'server';

  try {
    await fetch(`${String(host).replace(/\/+$/, '')}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: key,
        event: eventName.trim(),
        distinct_id: distinctId,
        properties: {
          ...properties,
          source,
        },
      }),
    });
    return true;
  } catch {
    return false;
  }
}
