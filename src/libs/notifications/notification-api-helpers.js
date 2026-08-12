/**
 * Parse `?offset=` for the notifications list API.
 * Invalid / negative / NaN values become 0.
 *
 * @param {string | null | undefined} raw
 * @returns {number}
 */
export function parseNotificationListOffset(raw) {
  return Math.max(0, Number.parseInt(raw ?? '0', 10) || 0);
}

/**
 * Resolve a mark-read / delete request body into a mutation target.
 * `{ all: true }` wins over `id` when both are present.
 *
 * @param {unknown} body
 * @returns
 *   | { mode: 'all' }
 *   | { mode: 'one', id: string }
 *   | { mode: 'error', error: 'missing_target' }
 */
export function resolveNotificationMutationTarget(body) {
  if (body?.all === true) return { mode: 'all' };
  if (typeof body?.id === 'string' && body.id) return { mode: 'one', id: body.id };
  return { mode: 'error', error: 'missing_target' };
}
