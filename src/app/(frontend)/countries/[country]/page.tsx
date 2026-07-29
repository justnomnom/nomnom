import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { RelatedLinksSection } from '@/components/content-platform/sections/related-links';
import { ContentPageShell } from '@/components/content-platform/sections/content-page-shell';
import {
  contentCityHubPillLinkClassName,
  contentInfluencerPillLinkClassName,
  contentViewAllCreatorsLinkClassName,
} from 'src/components/content-platform/ui/content-inline-link-classname';
import { JsonLd } from '@/components/content-platform/seo/json-ld';
import { getCountrySlugs, readMdxFilesInDir } from '@/content-platform/fs-content';
import {
  cityNavSlugs,
  collectionSlugsForCountry,
  influencerSlugsForCountry,
  sampleGlobalCollectionSlugs,
} from '@/content-platform/internal-graph';
import { getSiteUrl } from '@/content-platform/site-url';

export const revalidate = 60;

type PageProps = { params: Promise<{ country: string }> };

export async function generateStaticParams() {
  return getCountrySlugs().map((country) => ({ country }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { country } = await params;
  if (!getCountrySlugs().includes(country)) {
    return { title: 'Country' };
  }
  const title = `${country.replace(/-/g, ' ')} — cities, dining & creators`;
  const description = `Discover cities, restaurant guides, collections, and creators across ${country.replace(/-/g, ' ')}.`;
  const canonical = `${getSiteUrl()}/countries/${country}`;
  return { title, description, alternates: { canonical } };
}

/**
 * Country hub linking cities, influencers, collections, and global guides.
 */
export default async function CountryPage({ params }: PageProps) {
  const { country } = await params;
  if (!getCountrySlugs().includes(country)) notFound();

  const cities = cityNavSlugs(country);
  const infl = influencerSlugsForCountry(country);
  const col = collectionSlugsForCountry(country);
  const globalCol = sampleGlobalCollectionSlugs(4);

  const site = getSiteUrl();
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${site}/` },
      { '@type': 'ListItem', position: 2, name: 'Countries', item: `${site}/countries` },
      {
        '@type': 'ListItem',
        position: 3,
        name: country.replace(/-/g, ' '),
        item: `${site}/countries/${country}`,
      },
    ],
  };

  return (
    <>
      <JsonLd data={breadcrumbLd} />
      <ContentPageShell
        title={country.replace(/-/g, ' ')}
        description="Navigate cities, meet local creators, and open editorial collections without losing context."
        breadcrumbs={[
          { name: 'Home', href: '/' },
          { name: 'Countries', href: '/countries' },
          { name: country.replace(/-/g, ' '), href: `/countries/${country}` },
        ]}
      >
        <section className="not-prose mb-10">
          <h2 className="text-xl font-semibold">Cities</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {cities.map((city) => (
              <li key={city}>
                <Link
                  href={`/countries/${country}/${city}`}
                  className={contentCityHubPillLinkClassName}
                >
                  {city.replace(/-/g, ' ')}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="not-prose mb-10">
          <h2 className="text-xl font-semibold">Creators</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {infl.map((slug) => (
              <li key={slug}>
                <Link
                  href={`/countries/${country}/influencers/${slug}`}
                  className={contentInfluencerPillLinkClassName}
                >
                  {slug.replace(/-/g, ' ')}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href={`/countries/${country}/influencers`}
                className={contentViewAllCreatorsLinkClassName}
              >
                View all creators
              </Link>
            </li>
          </ul>
        </section>

        <RelatedLinksSection
          title="Country collections"
          links={[
            ...col.map((slug) => ({
              href: `/countries/${country}/collections/${slug}`,
              label: slug.replace(/-/g, ' '),
            })),
            ...globalCol.map((slug) => ({
              href: `/collections/${slug}`,
              label: `Global: ${slug.replace(/-/g, ' ')}`,
            })),
          ]}
        />
      </ContentPageShell>
    </>
  );
}
