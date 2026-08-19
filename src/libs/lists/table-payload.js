/**
 * Pure payload helpers for Table server actions.
 */

/** Abuse cap shared by start_table / add_table_place (not a product max). */
export const TABLE_PLACES_ABUSE_CAP = 200;

/**
 * Normalize RPC error messages into stable app error codes.
 * @param {unknown} message
 * @returns {string}
 */
export function mapTableError(message) {
  const m = String(message || '');
  if (m.includes('not_authenticated')) return 'unauthorized';
  if (m.includes('only_owner_can_decide')) return 'only_owner';
  if (m.includes('list_not_public')) return 'list_not_public';
  if (m.includes('need_at_least_three_places')) return 'need_three_places';
  if (m.includes('table_not_found')) return 'table_not_found';
  if (m.includes('session_locked')) return 'table_locked';
  if (m.includes('invalid_voter_key')) return 'invalid_voter_key';
  if (m.includes('invalid_vote')) return 'invalid_vote';
  if (m.includes('rate_limited')) return 'rate_limited';
  if (m.includes('not_authorized_to_lock')) return 'not_authorized_to_lock';
  if (m.includes('restaurant_not_allowed')) return 'restaurant_not_allowed';
  if (m.includes('invalid_display_name')) return 'invalid_display_name';
  if (m.includes('not_joined')) return 'not_joined';
  if (m.includes('too_many_places')) return 'too_many_places';
  if (m.includes('invalid_restaurant_id')) return 'invalid_restaurant_id';
  // Hide raw Postgres internals (e.g. missing extension) behind a stable key.
  if (/gen_random_bytes|permission denied|PGRST|postgres/i.test(m)) return 'unknown';
  return m || 'unknown';
}

/**
 * Accept an ISO timestamptz (must include Z or an offset). Timezone-less
 * `datetime-local` strings are rejected so a UTC server cannot shift dinner time.
 * @param {unknown} raw
 * @returns {string | null}
 */
export function normalizeStartsAt(raw) {
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : raw.toISOString();
  }
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value) return null;
  if (!/(Z|[+-]\d{2}:\d{2})$/i.test(value)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * @param {unknown} raw
 * @returns {object | null}
 */
export function parseTablePayload(raw) {
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
 * Guest keys must be 8–128 chars after trim (matches the RPC check).
 * @param {unknown} guestKey
 * @returns {boolean}
 */
export function isValidGuestKey(guestKey) {
  if (typeof guestKey !== 'string') return false;
  const key = guestKey.trim();
  return key.length >= 8 && key.length <= 128;
}
