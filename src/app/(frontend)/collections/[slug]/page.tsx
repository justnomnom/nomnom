import { notFound } from 'next/navigation';

import { editorialDocBreadcrumbs } from '@/content-platform/content-breadcrumbs';
import { allMdxForRelated, readMdxFilesInDir } from '@/content-platform/fs-content';
import { docMetadata, MdxDocumentView } from '@/content-platform/mdx-doc-page';

export const revalidate = 60;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return readMdxFilesInDir('collections').map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const doc = readMdxFilesInDir('collections').find((d) => d.slug === slug);
  if (!doc) return { title: 'Collection' };
  return docMetadata(doc, `/collections/${slug}`);
}

/**
 * Global SEO collection (MDX + optional Tina GraphQL).
 */
export default async function GlobalCollectionPage({ params }: PageProps) {
  const { slug } = await params;
  const doc = readMdxFilesInDir('collections').find((d) => d.slug === slug);
  if (!doc) notFound();

  const pool = allMdxForRelated();

  return (
    <MdxDocumentView
      doc={doc}
      canonicalPath={`/collections/${slug}`}
      relatedPool={pool}
      tina={{ kind: 'seo_collection', relativePath: `${slug}.mdx` }}
      breadcrumbs={editorialDocBreadcrumbs('collections', slug, doc.frontmatter.title)}
    />
  );
}
