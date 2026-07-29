import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { RelatedLinksSection } from '@/components/content-platform/sections/related-links';
import { ContentPageShell } from '@/components/content-platform/sections/content-page-shell';
import { contentInfluencerDirectoryRowLinkClassName } from 'src/components/content-platform/ui/content-inline-link-classname';
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
  const title = `Creators — ${country.replace(/-/g, ' ')}`;
  return {
    title,
    description: `Food and travel voices covering ${country.replace(/-/g, ' ')}.`,
    alternates: { canonical: `${getSiteUrl()}/countries/${country}/influencers` },
  };
}

/**
 * Country influencer index.
 */
export default async function CountryInfluencersIndex({ params }: PageProps) {
  const { country } = await params;
  if (!getCountrySlugs().includes(country)) notFound();

  const influencers = readMdxFilesInDir('influencers').filter(
    (d) => d.frontmatter.country === country
  );

  return (
    <ContentPageShell
      title={`Creators in ${country.replace(/-/g, ' ')}`}
      description="Authority pages that bridge restaurants, collections, and itinerary planning."
      breadcrumbs={[
        { name: 'Home', href: '/' },
        { name: 'Countries', href: '/countries' },
        { name: country.replace(/-/g, ' '), href: `/countries/${country}` },
        { name: 'Creators', href: `/countries/${country}/influencers` },
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
        title="More to explore"
        links={[
          { href: `/countries/${country}`, label: `${country.replace(/-/g, ' ')} overview` },
          ...influencerSlugsForCountry(country)
            .slice(0, 2)
            .map((slug) => ({
              href: `/countries/${country}/influencers/${slug}`,
              label: `Profile: ${slug.replace(/-/g, ' ')}`,
            })),
          ...sampleGlobalCollectionSlugs(3).map((slug) => ({
            href: `/collections/${slug}`,
            label: `Guide: ${slug.replace(/-/g, ' ')}`,
          })),
        ]}
      />
    </ContentPageShell>
  );
}
