import * as Sentry from '@sentry/nextjs';

import { SENTRY_API, INTEGRATION_FLAGS } from 'src/config-global';

const sentryActive = () => INTEGRATION_FLAGS.sentry && !!SENTRY_API.dsn;

/**
 * Capture and report errors to Sentry
 * @param {Error} error - The error to capture
 * @param {Object} context - Additional context for the error
 */
export const captureError = (error, context = {}) => {
  if (sentryActive()) {
    Sentry.captureException(error, {
      extra: context,
    });
  } else {
    console.warn('Sentry DSN not configured, error not captured:', error);
  }
};

/**
 * Capture and report messages to Sentry
 * @param {string} message - The message to capture
 * @param {string} level - The level of the message (info, warning, error)
 * @param {Object} context - Additional context for the message
 */
export const captureMessage = (message, level = 'info', context = {}) => {
  if (sentryActive()) {
    Sentry.captureMessage(message, {
      level,
      extra: context,
    });
  } else {
    console.warn('Sentry DSN not configured, message not captured:', message);
  }
};

/**
 * Set user context for Sentry
 * @param {Object} user - User information
 */
export const setUser = (user) => {
  if (sentryActive()) {
    Sentry.setUser(user);
  }
};

/**
 * Group related LLM / agent spans into one conversation thread.
 * Pass `null` to clear.
 * @param {string | null} conversationId
 */
export const setConversationId = (conversationId) => {
  if (sentryActive() && typeof Sentry.setConversationId === 'function') {
    Sentry.setConversationId(conversationId);
  }
};

/**
 * Set additional context for Sentry
 * @param {string} name - Context name
 * @param {Object} data - Context data
 */
export const setContext = (name, data) => {
  if (sentryActive()) {
    Sentry.setContext(name, data);
  }
};

/**
 * Set tags for Sentry
 * @param {Object} tags - Tags to set
 */
export const setTags = (tags) => {
  if (sentryActive()) {
    Sentry.setTags(tags);
  }
};

/**
 * Add breadcrumb for Sentry
 * @param {Object} breadcrumb - Breadcrumb data
 */
export const addBreadcrumb = (breadcrumb) => {
  if (sentryActive()) {
    Sentry.addBreadcrumb(breadcrumb);
  }
};

/**
 * Configure Sentry scope with user and context
 * @param {Object} user - User information
 * @param {Object} context - Additional context
 */
export const configureScope = (user = null, context = {}) => {
  if (user) {
    setUser(user);
  }

  Object.entries(context).forEach(([key, value]) => {
    setContext(key, value);
  });
};

/**
 * Keep only Sentry-accepted log attribute types (string | number | boolean).
 * @param {Record<string, unknown>} [attributes]
 * @returns {Record<string, string | number | boolean> | undefined}
 */
function sanitizeLogAttributes(attributes) {
  if (!attributes) return undefined;
  const out = Object.entries(attributes).reduce((acc, [key, value]) => {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      acc[key] = value;
    }
    return acc;
  }, /** @type {Record<string, string | number | boolean>} */ ({}));
  return Object.keys(out).length ? out : undefined;
}

/**
 * Attach per-request attributes (server isolation scope — safe under concurrency).
 * @param {Record<string, string | number | boolean>} attributes
 */
export const setIsolationAttributes = (attributes) => {
  if (!sentryActive()) return;
  const sanitized = sanitizeLogAttributes(attributes);
  if (sanitized) {
    Sentry.getIsolationScope().setAttributes(sanitized);
  }
};

/**
 * Structured info log (wide events preferred over fragmented logs).
 * @param {string} message
 * @param {Record<string, unknown>} [attributes]
 */
export const logInfo = (message, attributes) => {
  if (!sentryActive()) return;
  Sentry.logger.info(message, sanitizeLogAttributes(attributes));
};

/**
 * Structured warn log for degraded / recoverable states.
 * @param {string} message
 * @param {Record<string, unknown>} [attributes]
 */
export const logWarn = (message, attributes) => {
  if (!sentryActive()) return;
  Sentry.logger.warn(message, sanitizeLogAttributes(attributes));
};

/**
 * Structured error log for handled failures (still use captureError for issues).
 * @param {string} message
 * @param {Record<string, unknown>} [attributes]
 */
export const logError = (message, attributes) => {
  if (!sentryActive()) return;
  Sentry.logger.error(message, sanitizeLogAttributes(attributes));
};

/**
 * Parameterized message — interpolations become searchable `message.parameter.N`.
 * Use as: logFmt`User ${userId} completed checkout`
 * @param {TemplateStringsArray} strings
 * @param {...unknown} values
 */
export const logFmt = (strings, ...values) => Sentry.logger.fmt(strings, ...values);

/**
 * Increment a Sentry counter metric
 * @param {string} name - Metric name
 * @param {number} [value=1] - Amount to increment
 * @param {Object} [attributes] - Optional metric attributes
 */
export const metricsCount = (name, value = 1, attributes) => {
  if (sentryActive()) {
    Sentry.metrics.count(name, value, attributes ? { attributes } : undefined);
  }
};

/**
 * Record a Sentry distribution metric (e.g. latency)
 * @param {string} name - Metric name
 * @param {number} value - Observed value
 * @param {Object} [attributes] - Optional metric attributes
 */
export const metricsDistribution = (name, value, attributes) => {
  if (sentryActive()) {
    Sentry.metrics.distribution(name, value, attributes ? { attributes } : undefined);
  }
};

/**
 * Set a Sentry gauge metric
 * @param {string} name - Metric name
 * @param {number} value - Gauge value
 * @param {Object} [attributes] - Optional metric attributes
 */
export const metricsGauge = (name, value, attributes) => {
  if (sentryActive()) {
    Sentry.metrics.gauge(name, value, attributes ? { attributes } : undefined);
  }
};
