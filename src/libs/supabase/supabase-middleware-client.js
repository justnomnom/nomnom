import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

import { SUPABASE_API } from 'src/config-global';

import { getSupabaseAuthCookiePrefix } from './supabase-cookie-helpers';

function nextWithRequest(request) {
  return NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
}

/**
 * Clear Supabase session cookies (chunked auth token, code verifier, etc.)
 * @param {import('next/server').NextRequest} request
 */
function clearSupabaseAuthCookies(request) {
  const prefix = getSupabaseAuthCookiePrefix(SUPABASE_API.url);
  const response = nextWithRequest(request);
  request.cookies.getAll().forEach(({ name }) => {
    if (name.startsWith(prefix)) {
      response.cookies.set(name, '', {
        path: '/',
        sameSite: 'lax',
        maxAge: 0,
      });
    }
  });
  return response;
}

/**
 * Lightweight `auth.getUser()` for middleware/proxy: reads the request cookies
 * (no response mutation) so callers can decide whether to redirect before any
 * rendering starts. Returns `null` when no session is present.
 *
 * @param {import('next/server').NextRequest} request
 * @returns {Promise<import('@supabase/supabase-js').User | null>}
 */
export async function getMiddlewareAuthUser(request) {
  if (!SUPABASE_API.url || !SUPABASE_API.key) return null;

  const supabase = createServerClient(SUPABASE_API.url, SUPABASE_API.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {},
    },
  });

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user ?? null;
  } catch {
    return null;
  }
}

export async function updateSession(request) {
  let supabaseResponse = nextWithRequest(request);

  // Check if Supabase configuration is available
  if (!SUPABASE_API.url || !SUPABASE_API.key) {
    console.error('[middleware] Missing Supabase configuration');
    return supabaseResponse;
  }

  const supabase = createServerClient(SUPABASE_API.url, SUPABASE_API.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = nextWithRequest(request);
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  try {
    const { error } = await supabase.auth.getUser();

    if (error) {
      // Only clear cookies for actual token errors, not missing sessions
      if (
        error.message?.includes('Invalid Refresh Token') ||
        error.message?.includes('JWT expired') ||
        error.code === 'invalid_jwt'
      ) {
        return clearSupabaseAuthCookies(request);
      }
      // For missing sessions, just continue without clearing cookies
      return supabaseResponse;
    }
  } catch (error) {
    console.error('[middleware] Unexpected auth error:', error.message);
  }

  return supabaseResponse;
}
