import type { Restaurant } from './types';

import { orderRestaurantTagsForDetail } from 'src/utils/restaurant-tag-groups';

function prettifySlug(slug: string): string {
  return slug.replace(/-/g, ' ');
}

/**
 * Shape expected by `RestaurantDetailView` — mirrors Supabase `restaurants` rows used on the map sheet.
 */
export function contentRestaurantToDetailViewModel(
  r: Restaurant,
  countrySlug: string,
  citySlug: string
): {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  metadata: Record<string, unknown>;
  home_city: { name: string; states: { name: string } };
  tags: Array<{ id: string; slug: string; label: string; category: string; sort_order: number }>;
} {
  const cityLabel = prettifySlug(citySlug);
  const countryLabel = prettifySlug(countrySlug);
  const hero = (r.heroImage && r.heroImage.trim()) || '/assets/content-placeholder.svg';

  const tagRows = (r.categories ?? []).map((c, i) => ({
    id: `content-hub:${r.slug}:cat:${i}:${c}`,
    slug: c,
    label: prettifySlug(c),
    category: 'cuisine',
    sort_order: i,
  }));

  return {
    id: `content-hub:${r.country}:${r.city}:${r.slug}`,
    name: r.name,
    address: `${cityLabel}, ${countryLabel}`,
    latitude: r.location.lat,
    longitude: r.location.lng,
    metadata: {
      rating: r.rating,
      photos: [hero],
      mention_count: r.influencerSlugs?.length ?? 0,
    },
    home_city: {
      name: cityLabel,
      states: { name: countryLabel },
    },
    tags: orderRestaurantTagsForDetail(tagRows),
  };
}
