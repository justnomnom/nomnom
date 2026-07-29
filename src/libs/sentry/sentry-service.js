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
