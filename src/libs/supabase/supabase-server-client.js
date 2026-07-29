import { cache } from 'react';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

import { SUPABASE_API } from 'src/config-global';

async function createSupabaseServerClientImpl() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_API.url, SUPABASE_API.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}

/**
 * One Supabase server client per React server request (RSC / Server Actions).
 * Pairs with {@link getSupabaseAuthUser} so `getUser()` is not repeated.
 */
export const createSupabaseServerClient = cache(createSupabaseServerClientImpl);

/**
 * Deduplicates `auth.getUser()` within a single server request.
 * @returns {Promise<import('@supabase/supabase-js').UserResponse>}
 */
export const getSupabaseAuthUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  return supabase.auth.getUser();
});

/**
 * Deduplicates the common onboarding flag read within one request (nested layouts + pages).
 * @param {string | undefined} userId
 */
export const getUserOnboardingRow = cache(async (userId) => {
  if (!userId) {
    return { data: null, error: null };
  }
  const supabase = await createSupabaseServerClient();
  return supabase.from('users').select('onboarding_completed_at').eq('id', userId).maybeSingle();
});
