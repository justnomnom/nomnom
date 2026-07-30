import { randomUUID } from 'crypto';

import { PostHog } from 'posthog-node';

import { POSTHOG_API, INTEGRATION_FLAGS } from 'src/config-global';

/** Shared literals that must never become a PostHog person `distinct_id`. */
const POOLED_DISTINCT_IDS = new Set(['server', 'stripe_webhook', 'anonymous', 'user', 'anon']);

/** Reused across route handlers in the same isolate. */
let posthogNodeClient = null;

function getPostHogNodeClient(key, host) {
  if (!posthogNodeClient) {
    posthogNodeClient = new PostHog(key, {
      host,
      // Short-lived serverless handlers: flush immediately.
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return posthogNodeClient;
}

/**
 * Pick a stable PostHog `distinct_id` from common server property shapes.
 * Prefers authenticated user ids only — never resource ids (list_id) or shared
 * literals that would merge unrelated people.
 *
 * @param {Record<string, unknown>} [properties]
 * @param {string} [fallbackDistinctId]
 * @returns {{ distinctId: string; processPersonProfile: boolean }}
 */
export function resolveServerAnalyticsDistinctId(properties = {}, fallbackDistinctId) {
  const candidates = [
    properties.subscriber_user_id,
    properties.buyer_user_id,
    properties.user_id,
    fallbackDistinctId,
  ];

  for (const value of candidates) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed || POOLED_DISTINCT_IDS.has(trimmed)) continue;
    return { distinctId: trimmed, processPersonProfile: true };
  }

  // No known user: unique anon id so events are not pooled onto one person.
  return {
    distinctId: `anon_${randomUUID()}`,
    processPersonProfile: false,
  };
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

  const { distinctId, processPersonProfile } = resolveServerAnalyticsDistinctId(
    properties,
    options.distinctId
  );
  const source =
    typeof options.source === 'string' && options.source.trim()
      ? options.source.trim()
      : typeof properties.source === 'string' && properties.source.trim()
        ? properties.source.trim()
        : 'server';

  try {
    const client = getPostHogNodeClient(String(key), String(host).replace(/\/+$/, ''));
    client.capture({
      distinctId,
      event: eventName.trim(),
      properties: {
        ...properties,
        source,
        ...(processPersonProfile ? {} : { $process_person_profile: false }),
      },
    });
    await client.flush();
    return true;
  } catch {
    return false;
  }
}
