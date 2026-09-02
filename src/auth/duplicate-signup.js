/**
 * Supabase `signUp` often returns 200 with a fake user and empty `identities`
 * when the email is already taken (anti-enumeration). Treat that as registered.
 *
 * @param {unknown} user
 * @returns {boolean}
 */
export function isDuplicateSignupUser(user) {
  if (!user || typeof user !== 'object') return false;
  const { identities } = /** @type {{ identities?: unknown }} */ (user);
  return Array.isArray(identities) && identities.length === 0;
}
