/**
 * Pure E2E auth resolution — used by `test-credentials.ts` and unit-tested without Supabase.
 */

export type E2EGlobalSetupAuth =
  | { ok: true; url: string; anonKey: string; email: string; password: string }
  | { ok: false; missing: string[] };

export type DbEmailResult =
  | { ok: true; email: string }
  | { ok: false; error: string };

/**
 * Merge env + optional username→email lookup into the shape `global-setup.ts` consumes.
 */
export function computeE2EGlobalSetupAuth(input: {
  url: string;
  anonKey: string;
  password: string;
  emailRaw?: string;
  usernameRaw?: string;
  serviceRolePresent: boolean;
  resolvedEmailFromUsername: string | null;
  usernameLookupError?: string | null;
}): E2EGlobalSetupAuth {
  const missing: string[] = [];

  if (!input.url.trim()) {
    missing.push('E2E_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!input.anonKey.trim()) {
    missing.push('E2E_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  }
  if (!input.password.trim()) {
    missing.push('E2E_TEST_USER_PASSWORD');
  }

  const emailRaw = input.emailRaw?.trim() || '';
  const usernameRaw = input.usernameRaw?.trim().replace(/^@/, '') || '';

  let email: string | null = emailRaw || null;

  if (!email && usernameRaw) {
    if (!input.serviceRolePresent) {
      missing.push(
        'E2E_SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY (required with E2E_TEST_USER_USERNAME to resolve email)'
      );
    } else if (input.usernameLookupError) {
      missing.push(`Username→email lookup failed: ${input.usernameLookupError}`);
    } else if (!input.resolvedEmailFromUsername) {
      missing.push(
        `No public.users row with username="${usernameRaw}" — set E2E_TEST_USER_EMAIL or ensure the handle exists`
      );
    } else {
      email = input.resolvedEmailFromUsername;
    }
  } else if (!email) {
    missing.push('E2E_TEST_USER_EMAIL or E2E_TEST_USER_USERNAME');
  }

  if (missing.length) {
    return { ok: false, missing };
  }

  return {
    ok: true,
    url: input.url.trim(),
    anonKey: input.anonKey.trim(),
    email: email!,
    password: input.password.trim(),
  };
}

export function computeE2ELoginIdentifier(emailRaw?: string, usernameRaw?: string): string {
  const e = emailRaw?.trim();
  if (e) return e;
  const u = usernameRaw?.trim().replace(/^@/, '');
  if (u) return u;
  throw new Error('Set E2E_TEST_USER_EMAIL or E2E_TEST_USER_USERNAME for UI login flows');
}

/**
 * Maps env + resolved username lookup to the email used for `getUserIdByEmail` / Postgres checks.
 */
export function computeE2ETestUserEmailForDb(
  emailRaw: string | undefined,
  usernameRaw: string | undefined,
  resolvedEmailFromUsername: string | null
): DbEmailResult {
  if (emailRaw?.trim()) {
    return { ok: true, email: emailRaw.trim().toLowerCase() };
  }

  const u = usernameRaw?.trim().replace(/^@/, '');
  if (!u) {
    return {
      ok: false,
      error: 'Set E2E_TEST_USER_EMAIL or E2E_TEST_USER_USERNAME for DB assertions',
    };
  }

  if (!resolvedEmailFromUsername) {
    return {
      ok: false,
      error: `No public.users email for E2E_TEST_USER_USERNAME="${u}" — seed the profile or set E2E_TEST_USER_EMAIL`,
    };
  }

  return { ok: true, email: resolvedEmailFromUsername.toLowerCase() };
}
