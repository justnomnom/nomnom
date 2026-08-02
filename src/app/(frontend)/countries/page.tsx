import type { Metadata } from 'next';
import Link from 'next/link';

import { ContentPageShell } from '@/components/content-platform/sections/content-page-shell';
import { contentCountryIndexCardLinkClassName } from 'src/components/content-platform/ui/content-inline-link-classname';
import { getCountrySlugs } from '@/content-platform/fs-content';
import { pageMetadata } from '@/content-platform/page-metadata';

export const revalidate = 60;

export const metadata: Metadata = pageMetadata({
  title: 'Countries | Travel & dining guides',
  description: 'Browse country hubs for cities, restaurants, and local creators.',
  path: '/countries',
});

/**
 * Index of all country hubs with cross-links to global content.
 */
export default function CountriesIndexPage() {
  const countries = getCountrySlugs();
  return (
    <ContentPageShell
      title="Explore by country"
      description="Pick a country to see cities, restaurant directories, and creator guides."
      breadcrumbs={[
        { name: 'Home', href: '/' },
        { name: 'Countries', href: '/countries' },
      ]}
    >
      <ul className="not-prose grid gap-3 sm:grid-cols-2">
        {countries.map((c) => (
          <li key={c}>
            <Link href={`/countries/${c}`} className={contentCountryIndexCardLinkClassName}>
              {c.replace(/-/g, ' ')}
            </Link>
          </li>
        ))}
      </ul>
    </ContentPageShell>
  );
}
