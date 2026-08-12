'use client';

import useSWR from 'swr';

import { getMyStripeConnectStatus } from 'src/auth/actions/stripe-list-actions';

// ----------------------------------------------------------------------

export const STRIPE_CONNECT_STATUS_KEY = 'stripe-connect-status';

async function stripeConnectStatusFetcher() {
  return getMyStripeConnectStatus();
}

/**
 * Shared Stripe Connect status for the signed-in user.
 * Dedupes across billing, create-list, subscribers, etc.
 *
 * @param {{
 *   fallbackData?: object,
 *   initialData?: object,
 *   enabled?: boolean,
 * } & import('swr').SWRConfiguration} [options]
 */
export function useMyStripeConnectStatus(options = {}) {
  const { fallbackData, initialData, enabled = true, ...swrOptions } = options;
  const fallback = fallbackData ?? initialData;

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    enabled ? STRIPE_CONNECT_STATUS_KEY : null,
    stripeConnectStatusFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30_000,
      ...(fallback != null ? { fallbackData: fallback } : {}),
      ...swrOptions,
    }
  );

  return {
    status: data,
    chargesEnabled: !data?.error && Boolean(data?.chargesEnabled),
    payoutsEnabled: !data?.error && Boolean(data?.payoutsEnabled),
    isLoading,
    isValidating,
    error: data?.error ?? error,
    mutate,
  };
}
