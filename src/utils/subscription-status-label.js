/**
 * Maps Stripe subscription status codes to British, sentence-case labels.
 * Falls back to a spaced status code if a locale key is missing.
 * @param {string | null | undefined} status
 * @param {(key: string) => string} t
 * @returns {string}
 */
export function subscriptionStatusLabel(status, t) {
  if (!status) return '';
  const key = `common.subscription_status.${status}`;
  const label = t(key);
  if (label && label !== key) return label;
  return String(status).replaceAll('_', ' ');
}
