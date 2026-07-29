'use server';

import { isAdminUserId } from 'src/libs/auth/admin-allowlist';
import { getSupabaseAuthUser } from 'src/libs/supabase/supabase-server-client';

// ----------------------------------------------------------------------

/**
 * @returns {Promise<{ id: string }>}
 */
export async function assertAdminUser() {
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user?.id || !isAdminUserId(user.id)) {
    throw new Error('forbidden');
  }
  return user;
}
