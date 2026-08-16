/**
 * Pure payload helpers for Share → Decide server actions.
 */

/** Abuse cap shared by create_night / add_night_place (not a product max of 5). */
export const NIGHT_PLACES_ABUSE_CAP = 200;

/**
 * Normalize RPC error messages into stable app error codes.
 * @param {unknown} message
 * @returns {string}
 */
export function mapDecideError(message) {
  const m = String(message || '');
  if (m.includes('not_authenticated')) return 'unauthorized';
  if (m.includes('only_owner_can_decide')) return 'only_owner';
  if (m.includes('list_not_public')) return 'list_not_public';
  if (m.includes('need_at_least_three_places')) return 'need_three_places';
  if (m.includes('session_not_found')) return 'session_not_found';
  if (m.includes('session_locked')) return 'session_locked';
  if (m.includes('restaurant_not_on_list')) return 'restaurant_not_on_list';
  if (m.includes('invalid_voter_key')) return 'invalid_voter_key';
  if (m.includes('invalid_vote')) return 'invalid_vote';
  if (m.includes('rate_limited')) return 'rate_limited';
  if (m.includes('not_authorized_to_lock')) return 'not_authorized_to_lock';
  if (m.includes('restaurant_not_allowed')) return 'restaurant_not_allowed';
  if (m.includes('night_not_found')) return 'night_not_found';
  if (m.includes('not_joined')) return 'not_joined';
  if (m.includes('invalid_display_name')) return 'invalid_display_name';
  if (m.includes('too_many_places')) return 'too_many_places';
  if (m.includes('invalid_restaurant_id')) return 'invalid_restaurant_id';
  // Hide raw Postgres internals (e.g. missing extension) behind a stable key.
  if (/gen_random_bytes|permission denied|PGRST|postgres/i.test(m)) return 'unknown';
  return m || 'unknown';
}

/**
 * @param {unknown} raw
 * @returns {object | null}
 */
export function parseDecidePayload(raw) {
  if (raw == null) return null;
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Guest vote keys must be 8–128 chars after trim (matches server action).
 * @param {unknown} voterKey
 * @returns {boolean}
 */
export function isValidDecideVoterKey(voterKey) {
  if (typeof voterKey !== 'string') return false;
  const key = voterKey.trim();
  return key.length >= 8 && key.length <= 128;
}
