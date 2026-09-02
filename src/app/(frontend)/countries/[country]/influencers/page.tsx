import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { RelatedLinksSection } from '@/components/content-platform/sections/related-links';
import { ContentPageShell } from '@/components/content-platform/sections/content-page-shell';
import { contentInfluencerDirectoryRowLinkClassName } from 'src/components/content-platform/ui/content-inline-link-classname';
import { contentHubT, displaySlug } from '@/content-platform/content-hub-t';
import { getCountrySlugs, readMdxFilesInDir } from '@/content-platform/fs-content';
import {
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
  const title = `Creators — ${displaySlug(country)}`;
  return {
    title,
    description: `Food and travel voices covering ${displaySlug(country)}.`,
    alternates: { canonical: `${getSiteUrl()}/countries/${country}/influencers` },
  };
}

/**
 * Country influencer index.
 */
export default async function CountryInfluencersIndex({ params }: PageProps) {
  const { country } = await params;
  if (!getCountrySlugs().includes(country)) notFound();

  const t = await contentHubT();
  const countryName = displaySlug(country);
  const influencers = readMdxFilesInDir('influencers').filter(
    (d) => d.frontmatter.country === country
  );

  return (
    <ContentPageShell
      title={t('creators_title', { country: countryName })}
      description={t('creators_description')}
      breadcrumbs={[
        { name: t('home'), href: '/' },
        { name: t('countries'), href: '/countries' },
        { name: countryName, href: `/countries/${country}` },
        { name: t('creators'), href: `/countries/${country}/influencers` },
      ]}
    >
      <ul className="not-prose space-y-3">
        {influencers.map((d) => (
          <li key={d.slug}>
            <Link
              href={`/countries/${country}/influencers/${d.slug}`}
              className={contentInfluencerDirectoryRowLinkClassName}
            >
              {d.frontmatter.title}
            </Link>
          </li>
        ))}
      </ul>

      <RelatedLinksSection
        title={t('more_to_explore')}
        links={[
          { href: `/countries/${country}`, label: t('overview', { country: countryName }) },
          ...influencerSlugsForCountry(country)
            .slice(0, 2)
            .map((slug) => ({
              href: `/countries/${country}/influencers/${slug}`,
              label: t('profile_label', { name: displaySlug(slug) }),
            })),
          ...sampleGlobalCollectionSlugs(3).map((slug) => ({
            href: `/collections/${slug}`,
            label: t('guide_label', { name: displaySlug(slug) }),
          })),
        ]}
      />
    </ContentPageShell>
  );
}
