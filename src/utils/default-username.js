import { randomBytes } from 'crypto';

function slugAlphaNum(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Shared with `public.handle_new_user`: base segment before "_" + random suffix.
 *
 * @param {{ firstName?: string | null, lastName?: string | null, fullName?: string | null, displayName?: string | null, userId?: string | null }} parts
 * @returns {string}
 */
export function buildDefaultUsernameBase(parts) {
  const { firstName, lastName, fullName, displayName, userId } = parts || {};
  let base = slugAlphaNum(firstName) + slugAlphaNum(lastName);
  if (!base || base.length < 2) {
    base = slugAlphaNum(fullName) || slugAlphaNum(displayName);
  }
  if (!base || base.length < 2) {
    const id = String(userId ?? '').replace(/-/g, '');
    base = `user${id.slice(0, 8)}`;
  }
  if (base.length > 21) {
    return base.slice(0, 21);
  }
  return base;
}

/**
 * Default @handle: `{base}_{8 hex}` (underscore; app rule is a-z, 0-9, underscore, 3–30 chars).
 *
 * @param {{ firstName?: string | null, lastName?: string | null, fullName?: string | null, displayName?: string | null, userId?: string | null }} parts
 * @returns {string}
 */
export function generateDefaultUsername(parts) {
  const base = buildDefaultUsernameBase(parts);
  const suffix = randomBytes(4).toString('hex');
  let username = `${base}_${suffix}`;
  if (username.length > 30) {
    username = username.slice(0, 30);
  }
  return username;
}

/**
 * @param {{ user_metadata?: Record<string, unknown> | null }} user
 * @returns {string | null}
 */
export function displayNameFromAuthMetadata(user) {
  const m = user?.user_metadata ?? {};
  const d = String(m.display_name ?? '').trim();
  if (d) return d;
  const f = String(m.first_name ?? '').trim();
  const l = String(m.last_name ?? '').trim();
  if (f || l) return `${f} ${l}`.trim();
  const n = String(m.full_name ?? m.name ?? '').trim();
  return n || null;
}
