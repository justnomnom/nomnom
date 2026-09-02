import type { Metadata } from 'next';

import { pageMetadata } from '@/content-platform/page-metadata';

import { PricingView } from 'src/sections/pricing/view';

export const revalidate = 60;

export const metadata: Metadata = pageMetadata({
  title: 'Pricing',
  description:
    'NomNom is free to use. Some creator lists are paid — buy a Snapshot for one-time permanent access to one list, or subscribe monthly to a creator to unlock all their paid lists.',
  path: '/pricing',
});

/**
 * Consumer pricing story: platform is free; paid lists work per-creator
 * (Snapshot = one-time, one list; Subscription = monthly, all that creator's paid lists).
 */
export default function PricingPage() {
  return <PricingView />;
}
