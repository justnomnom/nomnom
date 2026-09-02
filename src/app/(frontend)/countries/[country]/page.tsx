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
import { contentHubT, displaySlug } from '@/content-platform/content-hub-t';
import { getCountrySlugs } from '@/content-platform/fs-content';
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
  const title = `${displaySlug(country)} — cities, dining & creators`;
  const description = `Discover cities, restaurant guides, collections, and creators across ${displaySlug(country)}.`;
  const canonical = `${getSiteUrl()}/countries/${country}`;
  return { title, description, alternates: { canonical } };
}

/**
 * Country hub linking cities, influencers, collections, and global guides.
 */
export default async function CountryPage({ params }: PageProps) {
  const { country } = await params;
  if (!getCountrySlugs().includes(country)) notFound();

  const t = await contentHubT();
  const countryName = displaySlug(country);
  const cities = cityNavSlugs(country);
  const infl = influencerSlugsForCountry(country);
  const col = collectionSlugsForCountry(country);
  const globalCol = sampleGlobalCollectionSlugs(4);

  const site = getSiteUrl();
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: t('home'), item: `${site}/` },
      { '@type': 'ListItem', position: 2, name: t('countries'), item: `${site}/countries` },
      {
        '@type': 'ListItem',
        position: 3,
        name: countryName,
        item: `${site}/countries/${country}`,
      },
    ],
  };

  return (
    <>
      <JsonLd data={breadcrumbLd} />
      <ContentPageShell
        title={countryName}
        description={t('country_description')}
        breadcrumbs={[
          { name: t('home'), href: '/' },
          { name: t('countries'), href: '/countries' },
          { name: countryName, href: `/countries/${country}` },
        ]}
      >
        <section className="not-prose mb-10">
          <h2 className="text-xl font-semibold">{t('cities')}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {cities.map((city) => (
              <li key={city}>
                <Link
                  href={`/countries/${country}/${city}`}
                  className={contentCityHubPillLinkClassName}
                >
                  {displaySlug(city)}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="not-prose mb-10">
          <h2 className="text-xl font-semibold">{t('creators')}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {infl.map((slug) => (
              <li key={slug}>
                <Link
                  href={`/countries/${country}/influencers/${slug}`}
                  className={contentInfluencerPillLinkClassName}
                >
                  {displaySlug(slug)}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href={`/countries/${country}/influencers`}
                className={contentViewAllCreatorsLinkClassName}
              >
                {t('view_all_creators')}
              </Link>
            </li>
          </ul>
        </section>

        <RelatedLinksSection
          title={t('collections')}
          links={[
            ...col.map((slug) => ({
              href: `/countries/${country}/collections/${slug}`,
              label: displaySlug(slug),
            })),
            ...globalCol.map((slug) => ({
              href: `/collections/${slug}`,
              label: t('global_label', { name: displaySlug(slug) }),
            })),
          ]}
        />
      </ContentPageShell>
    </>
  );
}
