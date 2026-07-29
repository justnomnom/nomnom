/**
 * Cancellation reasons.
 *
 * There is no churn data anywhere in the product today — the cancel path is a bare confirm
 * dialog — so the cheapest possible instrumentation is to ask, optionally, on the way out.
 *
 * Deliberately not a database column: the reason is carried on the analytics event and the
 * confirmation email, which needs no migration and no new table. If churn reasons ever
 * warrant real reporting, that is the point to give them storage.
 */

/** Fixed set, so the analytics dimension stays countable. `other` covers free text. */
export const CANCELLATION_REASONS = Object.freeze([
  'too_expensive',
  'not_using',
  'content_quality',
  'found_alternative',
  'temporary',
  'other',
]);

/**
 * Normalise a reason from the client. Anything unrecognised becomes `null` rather than
 * being passed through — an unbounded analytics dimension is worse than no dimension.
 *
 * @param {unknown} value
 * @returns {string | null}
 */
export function normalizeCancellationReason(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return CANCELLATION_REASONS.includes(trimmed) ? trimmed : null;
}
