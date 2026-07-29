import path from 'path';
import { notFound } from 'next/navigation';

import { countryCollectionDocBreadcrumbs } from '@/content-platform/content-breadcrumbs';
import {
  allMdxForRelated,
  getCountrySlugs,
  readMdxFilesInDir,
} from '@/content-platform/fs-content';
import { collectionSlugsForCountry } from '@/content-platform/internal-graph';
import { docMetadata, MdxDocumentView } from '@/content-platform/mdx-doc-page';

export const revalidate = 60;

type PageProps = { params: Promise<{ country: string; slug: string }> };

export async function generateStaticParams() {
  const out: { country: string; slug: string }[] = [];
  for (const country of getCountrySlugs()) {
    for (const slug of collectionSlugsForCountry(country)) {
      out.push({ country, slug });
    }
  }
  return out;
}

export async function generateMetadata({ params }: PageProps) {
  const { country, slug } = await params;
  const doc = readMdxFilesInDir(path.join('countries', country, 'collections')).find(
    (d) => d.slug === slug
  );
  if (!doc) return { title: 'Collection' };
  return docMetadata(doc, `/countries/${country}/collections/${slug}`);
}

/**
 * Country-scoped collection MDX.
 */
export default async function CountryCollectionPage({ params }: PageProps) {
  const { country, slug } = await params;
  if (!getCountrySlugs().includes(country)) notFound();

  const doc = readMdxFilesInDir(path.join('countries', country, 'collections')).find(
    (d) => d.slug === slug
  );
  if (!doc) notFound();

  return (
    <MdxDocumentView
      doc={doc}
      canonicalPath={`/countries/${country}/collections/${slug}`}
      relatedPool={allMdxForRelated()}
      countryContext={{ country }}
      breadcrumbs={countryCollectionDocBreadcrumbs(country, slug, doc.frontmatter.title)}
    />
  );
}
