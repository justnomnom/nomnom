'use client';

import PropTypes from 'prop-types';
import { createBrowserClient } from '@supabase/ssr';
import { useRef, useMemo, useState, useEffect, useReducer, useCallback } from 'react';

import { paths } from 'src/routes/paths';

import { clearUserScopedStorageForUser } from 'src/utils/user-scoped-storage';
import {
  isRefreshTokenError,
  getAuthRedirectOrigin,
  handleRefreshTokenError,
} from 'src/utils/auth-utils';

import { SUPABASE_API } from 'src/config-global';
import { setUser } from 'src/libs/sentry/sentry-service';
import { ensureUserRecord } from 'src/auth/actions/auth-actions';
import { isDuplicateSignupUser } from 'src/auth/duplicate-signup';
import { useAnalytics } from 'src/libs/analytics/analytics-provider';
import { setSleekplanUser, shutdownSleekplan } from 'src/libs/sleekplan/sleekplan-service';

import { AuthContext } from './auth-context';

/**
 * Customers row + user record setup via plain fetch. Deliberately NOT the
 * getOrCreateCustomer Server Action: an action POST replays the current route's RSC tree
 * and cancels any in-flight client navigation — it was aborting the GuestGuard
 * login → dashboard redirect and the streamed /onboarding redirect.
 */
async function postSessionSetup({ firstName, lastName }) {
  const res = await fetch('/api/auth/session-setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ firstName, lastName }),
  });
  if (!res.ok) {
    throw new Error(`session-setup failed with status ${res.status}`);
  }
  return res.json();
}

const initialState = {
  user: null,
  loading: true,
  error: null,
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'INITIAL':
      return {
        loading: false,
        user: action.payload.user,
        error: null,
      };
    case 'LOGIN':
      return {
        ...state,
        user: action.payload.user,
        error: null,
      };
    case 'REGISTER':
      return {
        ...state,
        user: action.payload.user,
        error: null,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        error: null,
      };
    case 'ERROR':
      return {
        ...state,
        error: action.payload.error,
      };
    default:
      return state;
  }
};

// ----------------------------------------------------------------------

// Helper function to extract first and last name from display_name
const extractNamesFromDisplayName = (displayName) => {
  if (!displayName) return { firstName: undefined, lastName: undefined };

  const names = displayName.trim().split(' ');
  const firstName = names[0] || undefined;
  const lastName = names.slice(1).join(' ') || undefined;

  return { firstName, lastName };
};

/**
 * Get a stable display name for any auth provider (email/oauth).
 * Google often provides `full_name`/`name` instead of `display_name`.
 * @param {import('@supabase/supabase-js').User} user - Supabase user
 * @returns {string | undefined} display name
 */
const getDisplayNameFromUser = (user) =>
  user?.user_metadata?.display_name ||
  user?.user_metadata?.full_name ||
  user?.user_metadata?.name ||
  user?.email;

/**
 * Resolve the auth method/provider for analytics/integrations.
 * @param {import('@supabase/supabase-js').User} user - Supabase user
 * @returns {string} provider/method string (e.g. 'google', 'email', 'oauth')
 */
const getAuthMethodFromUser = (user) => {
  const provider = user?.app_metadata?.provider;

  if (!provider) return 'oauth';
  if (provider === 'email') return 'email';

  return provider;
};

/**
 * Detect a brand-new account on its first sign-in. Supabase sets `created_at` and
 * `last_sign_in_at` to (effectively) the same instant at account creation; on every
 * subsequent login `last_sign_in_at` advances well past `created_at`.
 * @param {import('@supabase/supabase-js').User} user - Supabase user
 * @returns {boolean}
 */
const isFirstSignIn = (user) => {
  const createdAt = new Date(user?.created_at ?? NaN).getTime();
  const lastSignInAt = new Date(user?.last_sign_in_at ?? NaN).getTime();
  if (!Number.isFinite(createdAt) || !Number.isFinite(lastSignInAt)) return false;
  return Math.abs(lastSignInAt - createdAt) < 5000;
};

/**
 * Set user in all integrations (Sentry, Sleekplan, Analytics)
 * @param {Object} userData - User data object
 * @param {string} userData.id - User ID
 * @param {string} userData.email - User email
 * @param {string} userData.displayName - User display name
 * @param {string} userData.authMethod - Authentication method ('oauth' or 'email')
 * @param {Function} sentrySetUser - Sentry setUser function
 * @param {Function} sleekplanSetUser - Sleekplan setUser function
 * @param {Object} analytics - Analytics object with trackSignIn and setUserProperties methods
 */
const setUserInIntegrations = (userData, sentrySetUser, sleekplanSetUser, analytics) => {
  // Set user in Sentry
  sentrySetUser({
    id: userData.id,
    email: userData.email,
    username: userData.displayName,
  });

  // Track sign in and identify user in PostHog
  analytics.trackSignIn(userData.authMethod, userData.id);
  analytics.identifyUser(userData.id, {
    email: userData.email,
    display_name: userData.displayName,
  });
  analytics.setUserProperties({
    email: userData.email,
    display_name: userData.displayName,
  });

  // Set user in Sleekplan
  sleekplanSetUser({
    id: userData.id,
    email: userData.email,
    displayName: userData.displayName,
  });
};

/**
 * Logout user from all integrations (Sentry, Sleekplan, Analytics)
 * @param {Function} sentrySetUser - Sentry setUser function
 * @param {Function} sleekplanShutdown - Sleekplan shutdown function
 * @param {Object} analytics - Analytics object with trackSignOut method
 */
const logoutUserInIntegrations = (sentrySetUser, sleekplanShutdown, analytics) => {
  sentrySetUser(null);
  analytics.trackSignOut();
  sleekplanShutdown();
};

export function AuthProvider({ children }) {
  // Clear auth error hash params before createBrowserClient runs.
  // Supabase treats any hash containing `error_description` as an implicit-grant
  // callback and tries to process it, which can crash certain WebViews/browsers.
  // Clearing with history.replaceState is synchronous, so by the time the async
  // _initialize() inside the Supabase constructor reads window.location.href the
  // hash is already gone and the normal unauthenticated flow runs instead.
  useState(() => {
    if (typeof window === 'undefined') return;
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    if (hashParams.get('error')) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  });

  const [state, dispatch] = useReducer(reducer, initialState);
  const analytics = useAnalytics();
  const lastSignedInUserIdRef = useRef(null);

  const supabase = createBrowserClient(SUPABASE_API.url, SUPABASE_API.key);

  useEffect(() => {
    if (state.user?.id) {
      lastSignedInUserIdRef.current = state.user.id;
    }
  }, [state.user?.id]);

  const handleError = useCallback(
    (error, context) => {
      console.error(`[auth-provider.js] ${context} error:`, error);

      // Handle refresh token errors specifically
      if (isRefreshTokenError(error) || error?.message?.includes('Auth session missing')) {
        console.warn(`[auth-provider.js] Session error in ${context}, clearing session`);
        handleRefreshTokenError(supabase);

        // Logout user from all integrations
        logoutUserInIntegrations(setUser, shutdownSleekplan, analytics);

        const uid = lastSignedInUserIdRef.current;
        if (uid) {
          clearUserScopedStorageForUser(uid);
          lastSignedInUserIdRef.current = null;
        }

        // Reset state to unauthenticated
        dispatch({
          type: 'LOGOUT',
        });

        return;
      }

      dispatch({
        type: 'ERROR',
        payload: { error },
      });
    },
    [supabase, analytics]
  );

  /**
   * Shared setup for a session: getOrCreateCustomer, setUserInIntegrations, refresh goal chat state.
   * Used by initialize() (reload) and onAuthStateChange(SIGNED_IN) only.
   * @param {import('@supabase/supabase-js').Session} session
   * @param {{ auth_flow: string }} options - auth_flow: 'session_recovery' when restoring session on reload, or the actual auth method (e.g. 'oauth', 'email', 'google') when called from SIGNED_IN
   */
  const runSessionSetup = useCallback(
    async (session, { isFreshSignIn = false } = {}) => {
      const displayName = getDisplayNameFromUser(session.user);
      const { firstName, lastName } = extractNamesFromDisplayName(displayName);
      const authMethod = getAuthMethodFromUser(session.user);
      try {
        await postSessionSetup({ firstName, lastName });
      } catch (customerError) {
        console.error(
          '[auth-provider.js] Failed to get or create customer during session setup:',
          customerError
        );
      }
      setUserInIntegrations(
        {
          id: session.user.id,
          email: session.user.email,
          displayName,
          authMethod,
        },
        setUser,
        setSleekplanUser,
        analytics
      );

      // Fire signup_completed for new OAuth accounts. Email signups already emit it explicitly
      // from signUp(); only a fresh, first-time, non-email sign-in needs it here so OAuth
      // conversion shows up in the signup funnel.
      if (isFreshSignIn && authMethod !== 'email' && isFirstSignIn(session.user)) {
        analytics.trackSignupComplete(authMethod, {
          registration_method: authMethod,
          user_id: session.user.id,
        });
        analytics.trackEvent('signup_session_ready', {
          method: authMethod,
          skipped_verify: true,
        });
      }
    },
    [analytics]
  );

  const initialize = useCallback(async () => {
    // Only used as fallback if getSession() never resolves (e.g. network hang). Do not set user null
    // before getSession() completes, so we avoid redirecting to login right after OAuth callback.
    const INIT_TIMEOUT_MS = 20000;
    let resolved = false;

    const timeoutId = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      dispatch({
        type: 'INITIAL',
        payload: { user: null },
      });
    }, INIT_TIMEOUT_MS);

    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (resolved) return;
      resolved = true;
      clearTimeout(timeoutId);

      if (error) {
        setUser(null);
        dispatch({
          type: 'INITIAL',
          payload: { user: null },
        });
        return;
      }

      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          username: getDisplayNameFromUser(session.user),
        });
        // Show user immediately; run session setup in background (customers row, integrations).
        dispatch({
          type: 'INITIAL',
          payload: {
            user: {
              ...session.user,
              session: {
                access_token: session.access_token,
                expires_at: session.expires_at,
                expires_in: session.expires_in,
                refresh_token: session.refresh_token,
                token_type: session.token_type,
              },
            },
          },
        });
        runSessionSetup(session).catch((err) => {
          console.error('[auth-provider.js] Background session setup failed:', err);
        });
      } else {
        setUser(null);
        dispatch({
          type: 'INITIAL',
          payload: { user: null },
        });
      }
    } catch {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        logoutUserInIntegrations(setUser, shutdownSleekplan, analytics);
        dispatch({
          type: 'INITIAL',
          payload: { user: null },
        });
      }
    }
  }, [supabase, analytics, runSessionSetup]);

  useEffect(() => {
    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Only handle SIGNED_IN (new login/OAuth). Recovered session on reload is handled solely by
      // initialize() to avoid duplicate getOrCreateCustomer, setUserInIntegrations, runSessionSetup.
      if (event === 'SIGNED_IN' && session?.user) {
        // Show user immediately; run session setup in background (customers row, integrations).
        dispatch({
          type: 'LOGIN',
          payload: {
            user: {
              ...session.user,
              session: {
                access_token: session.access_token,
                expires_at: session.expires_at,
                expires_in: session.expires_in,
                refresh_token: session.refresh_token,
                token_type: session.token_type,
              },
            },
          },
        });
        runSessionSetup(session, { isFreshSignIn: true }).catch((error) => {
          console.error('[auth-provider.js] Error during SIGNED_IN session setup:', error);
          handleError(error, 'SIGNED_IN event');
        });
      } else if (event === 'SIGNED_OUT') {
        const uid = lastSignedInUserIdRef.current;
        if (uid) {
          clearUserScopedStorageForUser(uid);
          lastSignedInUserIdRef.current = null;
        }
        // Logout user from all integrations
        logoutUserInIntegrations(setUser, shutdownSleekplan, analytics);
        dispatch({ type: 'LOGOUT' });
      } else if (event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          const displayName = getDisplayNameFromUser(session.user);
          try {
            dispatch({
              type: 'LOGIN',
              payload: {
                user: {
                  ...session.user,
                  session: {
                    access_token: session.access_token,
                    expires_at: session.expires_at,
                    expires_in: session.expires_in,
                    refresh_token: session.refresh_token,
                    token_type: session.token_type,
                  },
                  user_metadata: {
                    ...session.user.user_metadata,
                    display_name: displayName || session.user.user_metadata?.display_name,
                  },
                },
              },
            });
          } catch (error) {
            console.error('[auth-provider.js] Error during TOKEN_REFRESHED:', error);
            handleError(error, 'TOKEN_REFRESHED event');
          }
        }
      } else if (event === 'USER_UPDATED') {
        // Handle user updates if needed
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [initialize, supabase.auth, handleError, analytics, runSessionSetup]);

  // LOGIN
  const login = useCallback(
    async (email, password) => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          handleError(error, 'Login');
          throw error;
        }

        if (!data.session) {
          const err = new Error('Login succeeded but no session was returned');
          handleError(err, 'Login');
          throw err;
        }

        const displayName = getDisplayNameFromUser(data.user);
        const { firstName, lastName } = extractNamesFromDisplayName(displayName);

        // Apply session immediately so the UI can redirect. Do not await server actions first —
        // a slow or stuck getOrCreateCustomer call would leave "Sign in" appearing dead.
        setUserInIntegrations(
          {
            id: data.user.id,
            email: data.user.email,
            displayName,
            authMethod: 'email',
          },
          setUser,
          setSleekplanUser,
          analytics
        );

        dispatch({
          type: 'LOGIN',
          payload: {
            user: {
              ...data.user,
              session: {
                access_token: data.session.access_token,
                expires_at: data.session.expires_at,
                expires_in: data.session.expires_in,
                refresh_token: data.session.refresh_token,
                token_type: data.session.token_type,
              },
            },
          },
        });

        // Session setup runs via fetch (customers row + user record happen inside the route) so the
        // background call cannot cancel the GuestGuard redirect that follows the LOGIN dispatch.
        postSessionSetup({ firstName, lastName }).catch((err) =>
          console.error('[auth-provider.js] Login background setup failed:', err)
        );
      } catch (error) {
        handleError(error, 'Login');
        throw error;
      }
    },
    [supabase, handleError, analytics]
  );

  const safeAuthReturnPath = useCallback((path) => {
    if (!path || typeof path !== 'string') return paths.dashboard.discover;
    if (!path.startsWith('/') || path.startsWith('//')) return paths.dashboard.discover;
    if (path.includes('://')) return paths.dashboard.discover;
    if (/^(javascript|data):/i.test(path)) return paths.dashboard.discover;
    return path;
  }, []);

  // REGISTER
  const register = useCallback(
    async (email, password, returnToAfterConfirm) => {
      try {
        const returnPath = safeAuthReturnPath(returnToAfterConfirm);
        const confirmRedirect = `${getAuthRedirectOrigin()}${paths.auth.supabase.callback}?returnTo=${encodeURIComponent(returnPath)}`;

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: confirmRedirect,
          },
        });

        if (error) {
          handleError(error, 'Registration');
          throw error;
        }

        if (isDuplicateSignupUser(data.user)) {
          const taken = new Error('User already registered');
          taken.code = 'user_already_exists';
          handleError(taken, 'Registration');
          throw taken;
        }

        // Ensure the new user's `users` row exists.
        if (data.user) {
          try {
            await ensureUserRecord({
              id: data.user.id,
              email: data.user.email,
            });
          } catch (recordError) {
            console.error('Failed to ensure user record during registration:', recordError);
            // Continue with registration even if this fails
          }

          // Track registration completion with GTM sign_up event
          analytics.trackSignupComplete('email', {
            registration_method: 'email',
            user_id: data.user.id,
          });
          analytics.identifyUser(data.user.id, {
            email: data.user.email,
          });
        }

        return { user: data.user, session: data.session };
      } catch (error) {
        handleError(error, 'Registration');
        throw error;
      }
    },
    [supabase, handleError, analytics, safeAuthReturnPath]
  );

  // LOGOUT
  const logout = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        handleError(error, 'Logout');
        throw error;
      }

      // Logout user from all integrations
      logoutUserInIntegrations(setUser, shutdownSleekplan, analytics);
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      handleError(error, 'Logout');
      throw error;
    }
  }, [supabase.auth, handleError, analytics]);

  // FORGOT PASSWORD
  const forgotPassword = useCallback(
    async (email) => {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${getAuthRedirectOrigin()}${paths.auth.supabase.newPassword}`,
        });

        if (error) {
          handleError(error, 'Password reset');
          throw error;
        }
      } catch (error) {
        handleError(error, 'Password reset');
        throw error;
      }
    },
    [supabase.auth, handleError]
  );

  // NEW PASSWORD
  const updatePassword = useCallback(
    async (password) => {
      try {
        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
          handleError(error, 'Password update');
          throw error;
        }
      } catch (error) {
        handleError(error, 'Password update');
        throw error;
      }
    },
    [supabase.auth, handleError]
  );

  const checkAuthenticated = state.user ? 'authenticated' : 'unauthenticated';
  const status = state.loading ? 'loading' : checkAuthenticated;

  const memoizedValue = useMemo(
    () => ({
      user: state.user
        ? {
            ...state.user,
            role: 'admin',
            displayName: getDisplayNameFromUser(state.user),
          }
        : null,
      method: 'supabase',
      loading: status === 'loading',
      authenticated: status === 'authenticated',
      unauthenticated: status === 'unauthenticated',
      error: state.error,
      login,
      register,
      logout,
      forgotPassword,
      updatePassword,
      supabase,
    }),
    [
      forgotPassword,
      login,
      logout,
      updatePassword,
      register,
      state.user,
      state.error,
      status,
      supabase,
    ]
  );

  return <AuthContext.Provider value={memoizedValue}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = {
  children: PropTypes.node,
};
