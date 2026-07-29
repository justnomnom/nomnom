import path from 'path';
import { notFound } from 'next/navigation';

import { cityCollectionDocBreadcrumbs } from '@/content-platform/content-breadcrumbs';
import {
  allMdxForRelated,
  getCitySlugsForCountry,
  getCountrySlugs,
  readMdxFilesInDir,
} from '@/content-platform/fs-content';
import { collectionSlugsForCity } from '@/content-platform/internal-graph';
import { docMetadata, MdxDocumentView } from '@/content-platform/mdx-doc-page';

export const revalidate = 60;

type PageProps = { params: Promise<{ country: string; city: string; slug: string }> };

export async function generateStaticParams() {
  const out: { country: string; city: string; slug: string }[] = [];
  for (const country of getCountrySlugs()) {
    for (const city of getCitySlugsForCountry(country)) {
      for (const slug of collectionSlugsForCity(country, city)) {
        out.push({ country, city, slug });
      }
    }
  }
  return out;
}

export async function generateMetadata({ params }: PageProps) {
  const { country, city, slug } = await params;
  const doc = readMdxFilesInDir(path.join('countries', country, city, 'collections')).find(
    (d) => d.slug === slug
  );
  if (!doc) return { title: 'Collection' };
  return docMetadata(doc, `/countries/${country}/${city}/collections/${slug}`);
}

/**
 * City-scoped collection MDX.
 */
export default async function CityCollectionPage({ params }: PageProps) {
  const { country, city, slug } = await params;
  if (!getCountrySlugs().includes(country) || !getCitySlugsForCountry(country).includes(city)) {
    notFound();
  }

  const doc = readMdxFilesInDir(path.join('countries', country, city, 'collections')).find(
    (d) => d.slug === slug
  );
  if (!doc) notFound();

  return (
    <MdxDocumentView
      doc={doc}
      canonicalPath={`/countries/${country}/${city}/collections/${slug}`}
      relatedPool={allMdxForRelated()}
      cityContext={{ country, city }}
      countryContext={{ country }}
      breadcrumbs={cityCollectionDocBreadcrumbs(country, city, slug, doc.frontmatter.title)}
    />
  );
}
