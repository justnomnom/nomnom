import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

import { paths } from 'src/routes/paths';

import { isValidAuthReturnPath } from 'src/utils/auth-return-path';

import { SUPABASE_API } from 'src/config-global';

/**
 * Sanitizes and validates a returnTo path, returning a safe default if invalid
 * @param {string} returnTo - The returnTo path from query string
 * @returns {string} A safe relative path
 */
function sanitizeReturnTo(returnTo) {
  if (!returnTo) {
    return '/';
  }

  if (isValidAuthReturnPath(returnTo)) {
    return returnTo;
  }

  // If invalid, return safe default
  return '/';
}

const AUTH_RETURN_TO_COOKIE = 'auth_return_to';

/**
 * Supabase OAuth callback handler (Next.js App Router).
 * Exchanges the `code` for a session and sets auth cookies, then redirects.
 * returnTo is taken from query or from cookie (cookie is set before OAuth so it survives redirects that drop query params).
 * @param {Request} request - Next.js request
 * @returns {Promise<NextResponse>} redirect response
 */
export async function GET(request) {
  const url = new URL(request.url);
  const { origin } = url;

  const code = url.searchParams.get('code');
  let returnToParam = url.searchParams.get('returnTo');
  const cookieStore = await cookies();

  // OAuth providers (e.g. Google) often redirect to the base redirect_uri without query params, so returnTo can be lost.
  // Use cookie set by client before starting OAuth when returnTo is missing or default.
  if (!returnToParam || returnToParam === '/') {
    const stored = cookieStore.get(AUTH_RETURN_TO_COOKIE);
    if (stored?.value) {
      try {
        returnToParam = decodeURIComponent(stored.value);
      } catch {
        returnToParam = null;
      }
    }
  }

  const returnTo = sanitizeReturnTo(returnToParam);

  if (!code) {
    const res = NextResponse.redirect(new URL(returnTo, origin));
    res.cookies.set(AUTH_RETURN_TO_COOKIE, '', { maxAge: 0, path: '/' });
    return res;
  }

  if (!SUPABASE_API.url || !SUPABASE_API.key) {
    console.error(
      '[auth/callback] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
    );
    const errorUrl = new URL(paths.auth.supabase.login, origin);
    errorUrl.searchParams.set('auth_error', '1');
    errorUrl.searchParams.set('error', 'configuration');
    const res = NextResponse.redirect(errorUrl);
    res.cookies.set(AUTH_RETURN_TO_COOKIE, '', { maxAge: 0, path: '/' });
    return res;
  }

  const supabase = createServerClient(SUPABASE_API.url, SUPABASE_API.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      },
    },
  });

  // Exchange code for session with proper error handling
  try {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('Error exchanging code for session:', exchangeError);
      const errorUrl = new URL(paths.auth.supabase.login, origin);
      errorUrl.searchParams.set('auth_error', '1');
      errorUrl.searchParams.set('error', 'exchange_failed');
      errorUrl.searchParams.set('error_code', 'oauth_session');
      const res = NextResponse.redirect(errorUrl);
      res.cookies.set(AUTH_RETURN_TO_COOKIE, '', { maxAge: 0, path: '/' });
      return res;
    }
  } catch (error) {
    console.error('Exception during code exchange:', error);
    const errorUrl = new URL(paths.auth.supabase.login, origin);
    errorUrl.searchParams.set('auth_error', '1');
    errorUrl.searchParams.set('error', 'exchange_failed');
    errorUrl.searchParams.set('error_code', 'oauth_unexpected');
    const res = NextResponse.redirect(errorUrl);
    res.cookies.set(AUTH_RETURN_TO_COOKIE, '', { maxAge: 0, path: '/' });
    return res;
  }

  let destination = returnTo;
  const {
    data: { user: sessionUser },
  } = await supabase.auth.getUser();
  if (sessionUser) {
    const { data: profile } = await supabase
      .from('users')
      .select('onboarding_completed_at')
      .eq('id', sessionUser.id)
      .maybeSingle();
    const needsOnboarding = !profile?.onboarding_completed_at;
    const returnToIsOnboarding =
      returnTo === paths.onboarding || returnTo.startsWith(`${paths.onboarding}/`);
    if (needsOnboarding && !returnToIsOnboarding) {
      destination = paths.onboarding;
    }
  }

  const res = NextResponse.redirect(new URL(destination, origin));
  res.cookies.set(AUTH_RETURN_TO_COOKIE, '', { maxAge: 0, path: '/' });
  return res;
}
