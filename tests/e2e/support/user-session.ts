import { createServerClient } from '@supabase/ssr';

import { loadE2EEnv } from '../load-env';

/**
 * A minimal Playwright storage-state object (cookies + origins) that can be passed to
 * `browser.newContext({ storageState })`.
 */
export type StorageState = {
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'Lax' | 'Strict' | 'None';
  }>;
  origins: never[];
};

/**
 * Sign a *specific* user in via Supabase (email/password) and materialize their SSR auth
 * cookies as a Playwright storage state — the same shape `global-setup.ts` writes for the
 * shared test user, but for an arbitrary seeded account.
 *
 * Use this for destructive flows (e.g. account deletion) that must run as a throwaway user
 * in their own browser context, never the shared dashboard user. Cookies stay `httpOnly:false`
 * so the browser Supabase client can read the session from `document.cookie` (matching real
 * users and the shared-user harness — see the global-setup notes).
 */
export async function buildUserStorageState(email: string, password: string): Promise<StorageState> {
  loadE2EEnv();

  const url = process.env.E2E_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey =
    process.env.E2E_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
  if (!url || !anonKey) {
    throw new Error('buildUserStorageState: missing Supabase URL or anon key in E2E env');
  }

  const cookieJar: { name: string; value: string }[] = [];

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieJar.map((c) => ({ name: c.name, value: c.value }));
      },
      setAll(cookiesToSet) {
        cookieJar.length = 0;
        cookiesToSet.forEach(({ name, value }) => {
          cookieJar.push({ name, value });
        });
      },
    },
  });

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(`buildUserStorageState: signInWithPassword failed for ${email}: ${error.message}`);
  }

  const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:3032';
  const hostname = new URL(baseUrl).hostname;

  return {
    cookies: cookieJar.map(({ name, value }) => ({
      name,
      value,
      domain: hostname,
      path: '/',
      expires: -1,
      httpOnly: false,
      secure: baseUrl.startsWith('https:'),
      sameSite: 'Lax' as const,
    })),
    origins: [],
  };
}
