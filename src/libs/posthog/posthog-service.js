import { POSTHOG_API, INTEGRATION_FLAGS } from 'src/config-global';

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
  typeof window !== 'undefined' && INTEGRATION_FLAGS.posthog && Boolean(POSTHOG_API.key);

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

// Acquires the posthog-js singleton initialized via instrumentation-client.js (Next.js 15.3+).
// Does NOT call posthog.init() — initialization is handled once in instrumentation-client.js.
export const initPostHog = () => {
  if (!posthogEnabled() || loadPromise) {
    return loadPromise ?? undefined;
  }
  loadPromise = import('posthog-js')
    .then(({ default: ph }) => {
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

export const getFeatureFlag = (flagKey, defaultValue = false) => {
  if (posthogClient) {
    return posthogClient.isFeatureEnabled(flagKey, defaultValue);
  }
  return defaultValue;
};

/** Raw client accessor for advanced usage (null until loaded). */
export const getPostHogClient = () => posthogClient;
