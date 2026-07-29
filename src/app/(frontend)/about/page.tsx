import type { Metadata } from 'next';

import { getSiteUrl } from '@/content-platform/site-url';

import { AboutView } from 'src/sections/about/view';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'About',
  description:
    'NomNom helps you find restaurants through creators and locals you trust—real opinions and shortlists, not generic rankings.',
  alternates: { canonical: `${getSiteUrl()}/about` },
};

/**
 * Company / product story aligned with APP + homepage positioning.
 */
export default function AboutPage() {
  return <AboutView />;
}
