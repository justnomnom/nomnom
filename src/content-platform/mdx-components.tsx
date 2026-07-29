import type { MDXComponents } from 'mdx/types';

import { ImageGallery } from '@/components/content-platform/cards/image-gallery';
import { InfluencerQuote } from '@/components/content-platform/cards/influencer-quote';
import { MapEmbed } from '@/components/content-platform/cards/map-embed';
import { RestaurantCard } from '@/components/content-platform/cards/restaurant-card';

/**
 * MDX component map for next-mdx-remote (RSC) and optional native MDX imports.
 */
export function getMdxComponents(): MDXComponents {
  return {
    RestaurantCard,
    Map: MapEmbed,
    InfluencerQuote,
    ImageGallery,
  };
}
