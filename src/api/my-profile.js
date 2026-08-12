'use client';

import useSWR from 'swr';

import { useAuthContext } from 'src/auth/hooks';
import { getMyProfile } from 'src/auth/actions/profile-actions';

// ----------------------------------------------------------------------

/**
 * Shared “my profile” fetch keyed by signed-in user id.
 *
 * @param {{
 *   fallbackData?: { profile?: object | null, error?: string },
 *   initialData?: { profile?: object | null, error?: string },
 * } & import('swr').SWRConfiguration} [options]
 */
export function useMyProfile(options = {}) {
  const { user } = useAuthContext();
  const { fallbackData, initialData, ...swrOptions } = options;
  const fallback = fallbackData ?? initialData;

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    user?.id ? ['my-profile', user.id] : null,
    () => getMyProfile(),
    {
      revalidateOnFocus: false,
      dedupingInterval: 30_000,
      ...(fallback != null ? { fallbackData: fallback } : {}),
      ...swrOptions,
    }
  );

  return {
    profile: data?.profile ?? null,
    profileError: data?.error ?? (error ? error.message : null),
    isLoading,
    isValidating,
    mutate,
  };
}
