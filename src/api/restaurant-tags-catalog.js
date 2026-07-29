'use client';

import useSWR from 'swr';

import { fetchRestaurantTagsCatalog } from 'src/auth/actions/location-actions';

// ----------------------------------------------------------------------

export const RESTAURANT_TAGS_CATALOG_KEY = 'restaurant-tags-catalog';

/**
 * Shared SWR fetcher for the restaurant tags catalog (cuisine/vibe/dish/…).
 * Dedupes across Discover, Map sheet, and any other mount of the same key.
 */
async function restaurantTagsCatalogFetcher() {
  const { tags, error } = await fetchRestaurantTagsCatalog();
  if (error) {
    throw new Error(error);
  }
  return tags ?? [];
}

/**
 * Restaurant tags catalog with cross-component request deduplication.
 * @returns {{ tags: Array<object>, loaded: boolean, error: Error | undefined }}
 */
export function useRestaurantTagsCatalog() {
  const { data, error, isLoading } = useSWR(
    RESTAURANT_TAGS_CATALOG_KEY,
    restaurantTagsCatalogFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
    }
  );

  return {
    tags: data ?? [],
    // Treat error the same as loaded so UI doesn't spin forever on failure.
    loaded: data != null || error != null || !isLoading,
    error,
  };
}
