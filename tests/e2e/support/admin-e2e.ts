import { loadE2EEnv } from '../load-env';

import { getUserIdByEmail } from './supabase-service';
import { getE2ETestUserEmailForDb } from './test-credentials';

/**
 * Whether the shared dashboard E2E user is an allowlisted admin.
 *
 * The allowlist is env-driven (`ADMIN_USER_IDS`, comma-separated auth UUIDs) and read by the
 * running Next server — it cannot be mutated for a live server from a test. So admin specs
 * resolve the seeded user's id here and skip when it isn't allowlisted, rather than trying to
 * seed a brand-new admin the server wouldn't recognize. Mirrors `src/libs/auth/admin-allowlist`.
 */
export type E2EAdminResolution = { isAdmin: boolean; userId: string | null; reason: string };

function readAdminUserIdSet(): Set<string> {
  const raw = process.env.ADMIN_USER_IDS ?? '';
  return new Set(
    String(raw)
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
  );
}

export async function resolveE2EAdmin(): Promise<E2EAdminResolution> {
  loadE2EEnv();

  const ids = readAdminUserIdSet();
  if (ids.size === 0) {
    return { isAdmin: false, userId: null, reason: 'ADMIN_USER_IDS is not set in the E2E env.' };
  }

  let userId: string | null = null;
  try {
    const email = await getE2ETestUserEmailForDb();
    userId = await getUserIdByEmail(email);
  } catch (e) {
    return { isAdmin: false, userId: null, reason: `Could not resolve E2E user id: ${(e as Error).message}` };
  }

  if (!userId) {
    return { isAdmin: false, userId: null, reason: 'No auth user id resolved for the E2E test user.' };
  }

  return ids.has(userId)
    ? { isAdmin: true, userId, reason: 'admin' }
    : { isAdmin: false, userId, reason: `E2E user ${userId} is not in ADMIN_USER_IDS.` };
}
