import type { Metadata } from 'next';

import { localizedPageMetadata } from '@/content-platform/page-metadata';
import { DynamicTitle } from 'src/components/dynamic-title';

import { PricingView } from 'src/sections/pricing/view';

export async function generateMetadata(): Promise<Metadata> {
  return localizedPageMetadata({
    titleKey: 'pages.pricing.title',
    descriptionKey: 'pages.pricing.description',
    path: '/pricing',
  });
}

/**
 * Consumer pricing story: platform is free; paid lists work per-creator
 * (Snapshot = one-time, one list; Subscription = monthly, all that creator's paid lists).
 */
export default function PricingPage() {
  return (
    <>
      <DynamicTitle titleKey="pages.pricing.title" />
      <PricingView />
    </>
  );
}
