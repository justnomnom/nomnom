import type { Metadata } from 'next';

import { localizedPageMetadata } from '@/content-platform/page-metadata';
import { DynamicTitle } from 'src/components/dynamic-title';

import { AboutView } from 'src/sections/about/view';

export async function generateMetadata(): Promise<Metadata> {
  return localizedPageMetadata({
    titleKey: 'pages.about.title',
    descriptionKey: 'pages.about.description',
    path: '/about',
  });
}

/**
 * Company / product story aligned with APP + homepage positioning.
 */
export default function AboutPage() {
  return (
    <>
      <DynamicTitle titleKey="pages.about.title" />
      <AboutView />
    </>
  );
}
