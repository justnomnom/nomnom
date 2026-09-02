import { notFound } from 'next/navigation';

import { getRestaurantBySlug } from '@/content-platform/fs-content';
import { tryParseRestaurantParts } from '@/content-platform/restaurants-path-parse';

export { getRestaurantPageSize, restaurantListPath } from '@/content-platform/restaurant-list-urls';
export { tryParseRestaurantParts } from '@/content-platform/restaurants-path-parse';

export type RestaurantRouteMode =
  { kind: 'list'; page: number; tag?: string } | { kind: 'detail'; slug: string };

/**
 * Parses `[[...parts]]` under `/countries/[country]/[city]/restaurants/`.
 */
export function parseRestaurantParts(parts: string[] | undefined): RestaurantRouteMode {
  const parsed = tryParseRestaurantParts(parts);
  if (!parsed) notFound();

  if (parsed.kind === 'detail' && !getRestaurantBySlug(parsed.slug)) notFound();

  return parsed;
}
