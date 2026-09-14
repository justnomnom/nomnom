import { notFound } from 'next/navigation';

import { getRestaurantBySlug } from '@/content-platform/fs-content';
import { tryParseRestaurantParts } from '@/content-platform/restaurants-path-parse';

export { getRestaurantPageSize, restaurantListPath } from '@/content-platform/restaurant-list-urls';
export { tryParseRestaurantParts } from '@/content-platform/restaurants-path-parse';

export type RestaurantRouteMode =
  { kind: 'list'; page: number; tag?: string } | { kind: 'detail'; slug: string };

/**
 * Parses `[[...parts]]` under `/countries/[country]/[city]/restaurants/`.
 *
 * Async because the detail check now asks the database whether the slug is a
 * curated restaurant — an uncurated (or unknown) slug 404s, which is what keeps
 * hub pages to the curated tier as the ingest scales the catalogue.
 */
export async function parseRestaurantParts(
  parts: string[] | undefined
): Promise<RestaurantRouteMode> {
  const parsed = tryParseRestaurantParts(parts);
  if (!parsed) notFound();

  if (parsed.kind === 'detail' && !(await getRestaurantBySlug(parsed.slug))) notFound();

  return parsed;
}
