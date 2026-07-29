import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { createServerClient } from '@supabase/ssr';

import { loadE2EEnv } from './load-env';
import { E2E_DASHBOARD_AUTH_SETUP_HINT, getE2EGlobalSetupAuth } from './support/test-credentials';

const AUTH_DIR = path.join(process.cwd(), 'tests/e2e/.auth');
const STORAGE_STATE = path.join(AUTH_DIR, 'storage-state.json');
const SKIPPED_MARKER = path.join(AUTH_DIR, 'skipped');

/**
 * Playwright global setup: Supabase email/password session → SSR auth cookies → storage state.
 * Accepts `E2E_TEST_USER_EMAIL` or `E2E_TEST_USER_USERNAME` (resolved to email via service role).
 * If E2E auth env is missing, writes `tests/e2e/.auth/skipped` so dashboard specs can skip.
 */
export default async function globalSetup(): Promise<void> {
  loadE2EEnv();

  mkdirSync(AUTH_DIR, { recursive: true });

  const resolved = await getE2EGlobalSetupAuth();
  if (!resolved.ok) {
    console.warn(
      `[e2e] Dashboard auth not configured (missing: ${resolved.missing.join(', ')}). Dashboard tests will skip; public smoke tests still run.\n${E2E_DASHBOARD_AUTH_SETUP_HINT}`
    );
    writeFileSync(SKIPPED_MARKER, '1', 'utf8');
    writeFileSync(STORAGE_STATE, JSON.stringify({ cookies: [], origins: [] }, null, 2), 'utf8');
    return;
  }

  const auth = resolved;

  rmSync(SKIPPED_MARKER, { force: true });

  const cookieJar: { name: string; value: string }[] = [];

  const supabase = createServerClient(auth.url, auth.anonKey, {
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

  const { error } = await supabase.auth.signInWithPassword({
    email: auth.email,
    password: auth.password,
  });

  if (error) {
    throw new Error(`[e2e] Supabase signInWithPassword failed: ${error.message}`);
  }

  const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:3032';
  const hostname = new URL(baseUrl).hostname;

  const pwCookies = cookieJar.map(({ name, value }) => ({
    name,
    value,
    domain: hostname,
    path: '/',
    expires: -1,
    // Must stay readable from document.cookie: the browser Supabase client
    // (createBrowserClient) reads the session from JS, exactly like real users'
    // cookies set via document.cookie. httpOnly:true makes every dashboard page
    // hydrate into the "Continue with Google" gate.
    httpOnly: false,
    secure: baseUrl.startsWith('https:'),
    sameSite: 'Lax' as const,
  }));

  writeFileSync(STORAGE_STATE, JSON.stringify({ cookies: pwCookies, origins: [] }, null, 2), 'utf8');
  console.info(`[e2e] Wrote storage state (${pwCookies.length} cookies) → ${STORAGE_STATE}`);
}
