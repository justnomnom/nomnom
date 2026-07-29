import { PostHog } from 'posthog-node';

/**
 * Returns a per-request PostHog Node.js client configured for short-lived serverless handlers.
 * flushAt=1 / flushInterval=0 ensures events are sent before the handler returns.
 * Call `await client.shutdown()` after capturing to flush synchronously.
 *
 * Returns null when PostHog is not configured (missing env vars).
 */
export function getPostHogNodeClient() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (!key || !host) {
    if (process.env.NODE_ENV === 'development') {
      console.error(
        'NEXT_PUBLIC_POSTHOG_KEY variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_KEY is configured'
      );
    }
    return null;
  }

  return new PostHog(key, { host, flushAt: 1, flushInterval: 0 });
}
