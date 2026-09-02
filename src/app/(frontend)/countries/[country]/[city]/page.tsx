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
import { contentHubT, displaySlug } from '@/content-platform/content-hub-t';
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
  const cityTitle = displaySlug(city);
  const countryTitle = displaySlug(country);
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

  const t = await contentHubT();
  const cityName = displaySlug(city);
  const countryName = displaySlug(country);
  const restaurants = getRestaurantsByCity(country, city);
  const cityCols = collectionSlugsForCity(country, city);
  const globalCols = sampleGlobalCollectionSlugs(2);

  const categories = [...new Set(restaurants.flatMap((r) => r.categories ?? []))].sort();

  const site = getSiteUrl();
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: t('home'), item: `${site}` },
      { '@type': 'ListItem', position: 2, name: t('countries'), item: `${site}/countries` },
      {
        '@type': 'ListItem',
        position: 3,
        name: countryName,
        item: `${site}/countries/${country}`,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: cityName,
        item: `${site}/countries/${country}/${city}`,
      },
    ],
  };

  return (
    <>
      <JsonLd data={breadcrumbLd} />
      <ContentPageShell
        title={cityName}
        description={t('city_description', { city: cityName, country: countryName })}
        breadcrumbs={[
          { name: t('home'), href: '/' },
          { name: t('countries'), href: '/countries' },
          { name: countryName, href: `/countries/${country}` },
          { name: cityName, href: `/countries/${country}/${city}` },
        ]}
      >
        <section className="not-prose mb-8">
          <h2 className="text-xl font-semibold">{t('restaurants')}</h2>
          <p className="mt-2 text-muted-foreground">
            <Link
              href={`/countries/${country}/${city}/restaurants`}
              className={contentInlineLinkSemiboldUnderlineClassName}
            >
              {t('browse_directory')}
            </Link>{' '}
            {t('listings_or_vibe', { count: restaurants.length })}
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {categories.map((tag) => (
              <li key={tag}>
                <Link
                  href={`/countries/${country}/${city}/restaurants/tag/${encodeURIComponent(tag)}`}
                  className={contentTagPillLinkClassName}
                >
                  {displaySlug(tag)}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <RelatedLinksSection
          title={t('city_context')}
          links={[
            ...cityCols.map((slug) => ({
              href: `/countries/${country}/${city}/collections/${slug}`,
              label: t('collection_label', { name: displaySlug(slug) }),
            })),
            ...globalCols.map((slug) => ({
              href: `/collections/${slug}`,
              label: t('guide_label', { name: displaySlug(slug) }),
            })),
            {
              href: `/countries/${country}/influencers`,
              label: t('creators_in', { country: countryName }),
            },
            { href: `/countries/${country}`, label: t('back_to', { country: countryName }) },
          ]}
        />
      </ContentPageShell>
    </>
  );
}
