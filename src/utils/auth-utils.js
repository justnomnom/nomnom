import { paths } from 'src/routes/paths';

import { SITE } from 'src/config-global';
import { supabaseBrowserClient } from 'src/libs/supabase/supabase-client';

import { sanitizeAuthReturnPath } from './auth-return-path';

/**
 * Base origin for Supabase OAuth and email-link redirects. Must match a URL listed under
 * Supabase → Authentication → URL Configuration → Redirect URLs (e.g. `http://localhost:3032/auth/callback`).
 *
 * - Set `NEXT_PUBLIC_AUTH_REDIRECT_ORIGIN` when the public origin differs from `window.location`
 *   (tunnel, preview host, or a fixed localhost URL).
 * - In development, `http://127.0.0.1:PORT` is rewritten to `http://localhost:PORT` so Google/Supabase
 *   allowlists that use `localhost` still accept the redirect.
 * @returns {string}
 */
export function getAuthRedirectOrigin() {
  if (typeof window === 'undefined') {
    return '';
  }

  const fromEnv = process.env.NEXT_PUBLIC_AUTH_REDIRECT_ORIGIN?.trim().replace(/\/$/, '');
  if (fromEnv) {
    return fromEnv;
  }

  const { hostname, port } = window.location;
  const isDev = process.env.NODE_ENV === 'development';
  const isLoopback = hostname === 'localhost' || hostname === '127.0.0.1';

  if (isDev && isLoopback && hostname === '127.0.0.1') {
    const devPort = port || new URL(SITE.devFallbackUrl).port;
    return `http://localhost:${devPort}`;
  }

  return window.location.origin;
}

/**
 * Handles authentication redirect
 * @param {import('next/navigation').AppRouterInstance} [router] - Next.js router instance
 */
export const handleAuthRedirect = (router) => {
  if (router) {
    // Use Next.js router if available
    router.push(paths.auth.supabase.login);
  } else {
    // Fallback to window.location if router is not available
    window.location.href = paths.auth.supabase.login;
  }
};

/**
 * Checks if an error is a refresh token error
 * @param {Error} error - The error to check
 * @returns {boolean} True if it's a refresh token error
 */
export const isRefreshTokenError = (error) =>
  Boolean(
    error?.code === 'refresh_token_not_found' ||
    error?.message?.includes('Refresh Token Not Found') ||
    error?.message?.includes('Invalid Refresh Token') ||
    error?.message?.includes('Auth session missing')
  );

/**
 * Handles refresh token errors by clearing the session and redirecting to login
 * @param {Object} supabase - Supabase client instance
 * @param {string} [returnPath] - Optional return path after login
 */
export const handleRefreshTokenError = async (supabase, returnPath) => {
  console.warn('[auth-utils] Refresh token error detected, clearing session');

  try {
    // Clear the session locally
    await supabase.auth.signOut({ scope: 'local' });
  } catch (signOutError) {
    console.error('[auth-utils] Error during signOut:', signOutError);
  }

  // Redirect to login page using the correct path
  if (typeof window !== 'undefined') {
    const searchParams = new URLSearchParams({
      returnTo: sanitizeAuthReturnPath(
        returnPath || window.location.pathname,
        paths.dashboard.discover
      ),
    }).toString();

    window.location.href = `${paths.auth.supabase.login}?${searchParams}`;
  }
};

/**
 * Handles 401 Unauthorized errors by logging out the user and redirecting to login
 * This is called when backend requests return 401 status
 */
export const handle401Unauthorized = async () => {
  console.warn('[auth-utils] 401 Unauthorized detected, logging out and redirecting to login');

  try {
    const { supabase } = supabaseBrowserClient();
    // Sign out completely (not just local scope)
    await supabase.auth.signOut();
  } catch (signOutError) {
    console.error('[auth-utils] Error during signOut:', signOutError);
  }

  // Redirect to login page
  if (typeof window !== 'undefined') {
    const searchParams = new URLSearchParams({
      returnTo: sanitizeAuthReturnPath(window.location.pathname, paths.dashboard.discover),
    }).toString();

    window.location.href = `${paths.auth.supabase.login}?${searchParams}`;
  }
};
