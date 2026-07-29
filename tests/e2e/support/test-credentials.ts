import { loadE2EEnv } from '../load-env';

import { getEmailByUsername } from './supabase-service';
import {
  computeE2EGlobalSetupAuth,
  computeE2ELoginIdentifier,
  computeE2ETestUserEmailForDb,
  type E2EGlobalSetupAuth,
} from './test-credentials-resolve';

export type { E2EGlobalSetupAuth };

/**
 * Shown in Playwright skips and global-setup warnings so contributors know both sign-in shapes.
 */
export const E2E_DASHBOARD_AUTH_SETUP_HINT =
  'Configure dashboard E2E: set E2E_TEST_USER_PASSWORD, Supabase URL + anon key, and either E2E_TEST_USER_EMAIL or E2E_TEST_USER_USERNAME. If you use username only, also set E2E_SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY so tests can resolve the email for session bootstrap. See .env.example.';

function readUrl(): string {
  return process.env.E2E_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
}

function readAnonKey(): string {
  return process.env.E2E_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
}

function readPassword(): string {
  return process.env.E2E_TEST_USER_PASSWORD?.trim() || '';
}

function readServiceRole(): string {
  return process.env.E2E_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
}

/**
 * Email or username typed on `/auth/login` when exercising the form (not used by global setup).
 * Note: the current login field uses `type="email"` validation — password UI tests use
 * {@link getE2ETestUserEmailForDb} so username-only env still works.
 */
export function getE2ELoginIdentifierForUi(): string {
  loadE2EEnv();
  return computeE2ELoginIdentifier(
    process.env.E2E_TEST_USER_EMAIL,
    process.env.E2E_TEST_USER_USERNAME
  );
}

/**
 * Resolves the auth user email for Postgres assertions (`getUserIdByEmail`, etc.).
 * Requires service role when only `E2E_TEST_USER_USERNAME` is set.
 */
export async function getE2ETestUserEmailForDb(): Promise<string> {
  loadE2EEnv();
  const emailRaw = process.env.E2E_TEST_USER_EMAIL?.trim();
  const usernameRaw = process.env.E2E_TEST_USER_USERNAME?.trim().replace(/^@/, '');

  let resolved: string | null = null;
  if (!emailRaw && usernameRaw) {
    resolved = await getEmailByUsername(usernameRaw);
  }

  const out = computeE2ETestUserEmailForDb(emailRaw, process.env.E2E_TEST_USER_USERNAME, resolved);
  if (!out.ok) {
    throw new Error(out.error);
  }
  return out.email;
}

/**
 * Credentials for `global-setup.ts`: Supabase password sign-in always uses the real email internally.
 */
export async function getE2EGlobalSetupAuth(): Promise<E2EGlobalSetupAuth> {
  loadE2EEnv();

  const url = readUrl();
  const anonKey = readAnonKey();
  const password = readPassword();
  const emailRaw = process.env.E2E_TEST_USER_EMAIL?.trim();
  const usernameRaw = process.env.E2E_TEST_USER_USERNAME?.trim().replace(/^@/, '');
  const serviceRolePresent = Boolean(readServiceRole().trim());

  let resolvedEmailFromUsername: string | null = null;
  let usernameLookupError: string | null = null;

  if (!emailRaw && usernameRaw && serviceRolePresent) {
    try {
      resolvedEmailFromUsername = await getEmailByUsername(usernameRaw);
    } catch (e) {
      usernameLookupError = (e as Error).message;
    }
  }

  return computeE2EGlobalSetupAuth({
    url,
    anonKey,
    password,
    emailRaw,
    usernameRaw,
    serviceRolePresent,
    resolvedEmailFromUsername,
    usernameLookupError,
  });
}
