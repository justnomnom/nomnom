import type { Metadata } from 'next';

import { pageMetadata } from '@/content-platform/page-metadata';

import { AboutView } from 'src/sections/about/view';

export const revalidate = 60;

export const metadata: Metadata = pageMetadata({
  title: 'About',
  description:
    'NomNom helps you find restaurants through creators and locals you trust — real opinions and shortlists, not generic rankings.',
  path: '/about',
});

/**
 * Company / product story aligned with APP + homepage positioning.
 */
export default function AboutPage() {
  return <AboutView />;
}
