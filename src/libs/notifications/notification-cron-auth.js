/**
 * Cron auth for notification digest / housekeeping routes.
 * Missing secret must never authorize (fail closed).
 *
 * @param {string | null | undefined} authorizationHeader
 * @param {string | null | undefined} cronSecret
 * @returns {boolean}
 */
export function isAuthorizedCronRequest(authorizationHeader, cronSecret) {
  if (!cronSecret) return false;
  return authorizationHeader === `Bearer ${cronSecret}`;
}
