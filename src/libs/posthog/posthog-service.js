import { POSTHOG_API, INTEGRATION_FLAGS, POSTHOG_JS_INIT_OPTIONS } from 'src/config-global';

// -----------------------------------------------------------------------------
// PostHog configuration using global config pattern
//
// posthog-js (~55 KB gzip) is dynamically imported so it stays out of the
// critical client bundle — it was previously a static import wrapping the whole
// app, paid on every page's first load (FCP/TBT). Tracking calls made before the
// library finishes loading are queued and replayed once init completes, so no
// events are dropped.
// -----------------------------------------------------------------------------

/** Loaded posthog-js instance (null until the dynamic import + init resolves). */
let posthogClient = null;
/** In-flight load promise so init() is idempotent. */
let loadPromise = null;
/** Calls captured before the client finished loading; flushed on load. */
const pendingOps = [];

const posthogEnabled = () =>
  typeof window !== 'undefined' &&
  INTEGRATION_FLAGS.posthog &&
  Boolean(POSTHOG_API.key) &&
  !POSTHOG_API.disabled;

function flushPending() {
  while (pendingOps.length) {
    const op = pendingOps.shift();
    try {
      op(posthogClient);
    } catch {
      // Analytics must never throw into product code.
    }
  }
}

/** Run `op(client)` now if loaded, otherwise queue it until init resolves. */
function withClient(op) {
  if (!posthogEnabled()) return;
  if (posthogClient) {
    try {
      op(posthogClient);
    } catch {
      // swallow — analytics is best-effort
    }
    return;
  }
  pendingOps.push(op);
}

// Initialize PostHog only on client side (lazy-loads posthog-js).
export const initPostHog = () => {
  if (!posthogEnabled() || loadPromise) {
    return loadPromise ?? undefined;
  }
  loadPromise = import('posthog-js')
    .then(({ default: ph }) => {
      ph.init(POSTHOG_API.key, {
        api_host: POSTHOG_API.host,
        ...POSTHOG_JS_INIT_OPTIONS,
        // Hostname only — links client session/distinct id to same-origin API fetches.
        tracing_headers: [window.location.hostname, 'localhost', '127.0.0.1'],
        loaded: () => {
          // Silent logging - no console output
        },
      });
      posthogClient = ph;
      flushPending();
      return ph;
    })
    .catch(
      () =>
        // Never let a failed analytics load break the app.
        null
    );
  return loadPromise;
};

// Helper functions for common tracking operations
export const trackEvent = (eventName, properties = {}) => {
  withClient((ph) => ph.capture(eventName, properties));
};

export const identifyUser = (userId, userProperties = {}) => {
  withClient((ph) => ph.identify(userId, userProperties));
};

export const resetUser = () => {
  withClient((ph) => ph.reset());
};

export const setUserProperties = (properties) => {
  withClient((ph) => ph.setPersonProperties(properties));
};

/**
 * Associate the current person with a PostHog group (e.g. creator / list).
 * @param {string} groupType
 * @param {string} groupKey
 * @param {Record<string, unknown>} [groupProperties]
 */
export const setGroup = (groupType, groupKey, groupProperties = {}) => {
  if (typeof groupType !== 'string' || !groupType.trim()) return;
  if (typeof groupKey !== 'string' || !groupKey.trim()) return;
  withClient((ph) => ph.group(groupType.trim(), groupKey.trim(), groupProperties));
};

export const getFeatureFlag = (flagKey, defaultValue = false) => {
  if (posthogClient) {
    return posthogClient.isFeatureEnabled(flagKey, defaultValue);
  }
  return defaultValue;
};

/** Capture an exception for PostHog Error Tracking (`$exception`). */
export const captureException = (error, additionalProperties = {}) => {
  withClient((ph) => {
    if (typeof ph.captureException === 'function') {
      ph.captureException(error, additionalProperties);
      return;
    }
    // Older SDKs: fall back to manual $exception shape
    const err = error instanceof Error ? error : new Error(String(error));
    ph.capture('$exception', {
      $exception_message: err.message,
      $exception_type: err.name,
      $exception_stack_trace_raw: err.stack,
      ...additionalProperties,
    });
  });
};

/** Raw client accessor for advanced usage (null until loaded). */
export const getPostHogClient = () => posthogClient;
