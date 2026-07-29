import { notFound } from 'next/navigation';

import {
  allMdxForRelated,
  getCountrySlugs,
  readMdxFilesInDir,
} from '@/content-platform/fs-content';
import { docMetadata, MdxDocumentView } from '@/content-platform/mdx-doc-page';

export const revalidate = 60;

type PageProps = { params: Promise<{ country: string; slug: string }> };

export async function generateStaticParams() {
  const out: { country: string; slug: string }[] = [];
  for (const doc of readMdxFilesInDir('influencers')) {
    const c = doc.frontmatter.country;
    if (c) out.push({ country: c, slug: doc.slug });
  }
  return out;
}

export async function generateMetadata({ params }: PageProps) {
  const { country, slug } = await params;
  const doc = readMdxFilesInDir('influencers').find(
    (d) => d.slug === slug && d.frontmatter.country === country
  );
  if (!doc) return { title: 'Creator' };
  return docMetadata(doc, `/countries/${country}/influencers/${slug}`);
}

/**
 * Influencer profile (MDX + Tina influencer collection).
 */
export default async function InfluencerPage({ params }: PageProps) {
  const { country, slug } = await params;
  if (!getCountrySlugs().includes(country)) notFound();

  const doc = readMdxFilesInDir('influencers').find(
    (d) => d.slug === slug && d.frontmatter.country === country
  );
  if (!doc) notFound();

  return (
    <MdxDocumentView
      doc={doc}
      canonicalPath={`/countries/${country}/influencers/${slug}`}
      relatedPool={allMdxForRelated()}
      countryContext={{ country }}
      tina={{ kind: 'influencer', relativePath: `${slug}.mdx` }}
      breadcrumbs={[
        { name: 'Home', href: '/' },
        { name: 'Countries', href: '/countries' },
        { name: country.replace(/-/g, ' '), href: `/countries/${country}` },
        { name: 'Creators', href: `/countries/${country}/influencers` },
        { name: doc.frontmatter.title, href: `/countries/${country}/influencers/${slug}` },
      ]}
    />
  );
}
