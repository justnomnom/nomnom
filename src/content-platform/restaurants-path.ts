import { notFound } from 'next/navigation';

import { getRestaurantBySlug } from '@/content-platform/fs-content';

export { getRestaurantPageSize, restaurantListPath } from '@/content-platform/restaurant-list-urls';

export type RestaurantRouteMode =
  { kind: 'list'; page: number; tag?: string } | { kind: 'detail'; slug: string };

/**
 * Parses route segments without throwing — for `generateMetadata` only.
 */
export function tryParseRestaurantParts(parts: string[] | undefined): RestaurantRouteMode | null {
  const p = parts ?? [];

  if (p.length === 0) {
    return { kind: 'list', page: 1 };
  }

  if (p[0] === 'page') {
    const n = Number(p[1]);
    if (p.length !== 2 || !Number.isInteger(n) || n < 2) return null;
    return { kind: 'list', page: n };
  }

  if (p[0] === 'tag') {
    const tag = p[1];
    if (!tag) return null;
    if (p.length === 2) {
      return { kind: 'list', page: 1, tag };
    }
    if (p.length === 4 && p[2] === 'page') {
      const n = Number(p[3]);
      if (!Number.isInteger(n) || n < 2) return null;
      return { kind: 'list', page: n, tag };
    }
    return null;
  }

  if (p.length === 1) {
    return { kind: 'detail', slug: p[0] };
  }

  return null;
}

/**
 * Parses `[[...parts]]` under `/countries/[country]/[city]/restaurants/`.
 */
export function parseRestaurantParts(parts: string[] | undefined): RestaurantRouteMode {
  const p = parts ?? [];

  const parsed = tryParseRestaurantParts(parts);
  if (!parsed) notFound();

  if (parsed.kind === 'detail' && !getRestaurantBySlug(parsed.slug)) notFound();

  return parsed;
}
