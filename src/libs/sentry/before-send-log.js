const SENSITIVE_ATTRIBUTE_KEYS = new Set([
  'password',
  'token',
  'apiKey',
  'api_key',
  'authorization',
  'credit_card',
  'creditCard',
]);

/**
 * Drop noisy levels and scrub sensitive attributes before logs leave the process.
 * @param {import('@sentry/core').Log} log
 * @returns {import('@sentry/core').Log | null}
 */
export function beforeSendLog(log) {
  if (log.level === 'debug' || log.level === 'trace') {
    return null;
  }

  if (log.message?.includes('/health') || log.message?.includes('/api/health')) {
    return null;
  }

  if (log.attributes) {
    Object.keys(log.attributes).forEach((key) => {
      if (SENSITIVE_ATTRIBUTE_KEYS.has(key)) {
        log.attributes[key] = '[REDACTED]';
      }
    });
  }

  return log;
}
