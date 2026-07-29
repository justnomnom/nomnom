import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { RelatedLinksSection } from '@/components/content-platform/sections/related-links';
import { ContentPageShell } from '@/components/content-platform/sections/content-page-shell';
import {
  contentInlineLinkSemiboldUnderlineClassName,
  contentTagPillLinkClassName,
} from 'src/components/content-platform/ui/content-inline-link-classname';
import { JsonLd } from '@/components/content-platform/seo/json-ld';
import {
  getCitySlugsForCountry,
  getCountrySlugs,
  getRestaurantsByCity,
} from '@/content-platform/fs-content';
import {
  collectionSlugsForCity,
  sampleGlobalCollectionSlugs,
} from '@/content-platform/internal-graph';
import { getSiteUrl } from '@/content-platform/site-url';

export const revalidate = 60;

/** Slug or space-separated segment → Title Case for metadata and display. */
function slugToTitle(slug: string): string {
  return slug
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

type PageProps = { params: Promise<{ country: string; city: string }> };

export async function generateStaticParams() {
  const out: { country: string; city: string }[] = [];
  for (const country of getCountrySlugs()) {
    for (const city of getCitySlugsForCountry(country)) {
      out.push({ country, city });
    }
  }
  return out;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { country, city } = await params;
  const cityTitle = slugToTitle(city);
  const countryTitle = slugToTitle(country);
  const title = `${cityTitle}, ${countryTitle} — restaurants & guides`;
  const description = `Restaurants, collections, and maps for ${cityTitle} in ${countryTitle}.`;
  const canonical = `${getSiteUrl()}/countries/${country}/${city}`;
  return { title, description, alternates: { canonical } };
}

/**
 * City hub with restaurant directory, local collections, and country context.
 */
export default async function CityPage({ params }: PageProps) {
  const { country, city } = await params;
  if (!getCountrySlugs().includes(country) || !getCitySlugsForCountry(country).includes(city)) {
    notFound();
  }

  const restaurants = getRestaurantsByCity(country, city);
  const cityCols = collectionSlugsForCity(country, city);
  const globalCols = sampleGlobalCollectionSlugs(2);

  const categories = [...new Set(restaurants.flatMap((r) => r.categories ?? []))].sort();

  const site = getSiteUrl();
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${site}` },
      { '@type': 'ListItem', position: 2, name: 'Countries', item: `${site}/countries` },
      {
        '@type': 'ListItem',
        position: 3,
        name: country.replace(/-/g, ' '),
        item: `${site}/countries/${country}`,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: city.replace(/-/g, ' '),
        item: `${site}/countries/${country}/${city}`,
      },
    ],
  };

  return (
    <>
      <JsonLd data={breadcrumbLd} />
      <ContentPageShell
        title={`${city.replace(/-/g, ' ')}`}
        description={`Dining in ${city.replace(/-/g, ' ')}, ${country.replace(/-/g, ' ')} — curated lists, maps, and editorial deep dives.`}
        breadcrumbs={[
          { name: 'Home', href: '/' },
          { name: 'Countries', href: '/countries' },
          { name: country.replace(/-/g, ' '), href: `/countries/${country}` },
          { name: city.replace(/-/g, ' '), href: `/countries/${country}/${city}` },
        ]}
      >
        <section className="not-prose mb-8">
          <h2 className="text-xl font-semibold">Restaurants</h2>
          <p className="mt-2 text-muted-foreground">
            <Link
              href={`/countries/${country}/${city}/restaurants`}
              className={contentInlineLinkSemiboldUnderlineClassName}
            >
              Browse the full directory
            </Link>{' '}
            ({restaurants.length} listings) or filter by vibe:
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {categories.map((tag) => (
              <li key={tag}>
                <Link
                  href={`/countries/${country}/${city}/restaurants/tag/${encodeURIComponent(tag)}`}
                  className={contentTagPillLinkClassName}
                >
                  {tag.replace(/-/g, ' ')}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <RelatedLinksSection
          title="City & country context"
          links={[
            ...cityCols.map((slug) => ({
              href: `/countries/${country}/${city}/collections/${slug}`,
              label: `Collection: ${slug.replace(/-/g, ' ')}`,
            })),
            ...globalCols.map((slug) => ({
              href: `/collections/${slug}`,
              label: `Guide: ${slug.replace(/-/g, ' ')}`,
            })),
            {
              href: `/countries/${country}/influencers`,
              label: `Creators in ${country.replace(/-/g, ' ')}`,
            },
            { href: `/countries/${country}`, label: `Back to ${country.replace(/-/g, ' ')}` },
          ]}
        />
      </ContentPageShell>
    </>
  );
}
