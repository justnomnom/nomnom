/**
 * Returns a relative-date string ("Updated 3 days ago") for the paywall value prop
 * if `listUpdatedAt` is within 90 days of now. Returns null otherwise.
 *
 * Extracted from ListPublicView so it can be unit-tested without a React renderer.
 *
 * @param {string | null | undefined} listUpdatedAt  — ISO 8601 timestamp
 * @param {(isoString: string) => string | null} formatRelativeDate  — date formatter
 * @returns {string | null}
 */
export const PAYWALL_RECENCY_DAYS = 90;
const PAYWALL_RECENCY_MS = PAYWALL_RECENCY_DAYS * 24 * 60 * 60 * 1000;

export function getPaywallRelativeDate(listUpdatedAt, formatRelativeDate) {
  if (!listUpdatedAt) return null;
  return Date.now() - new Date(listUpdatedAt).getTime() < PAYWALL_RECENCY_MS
    ? formatRelativeDate(listUpdatedAt)
    : null;
}
