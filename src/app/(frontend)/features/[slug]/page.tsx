import { notFound } from 'next/navigation';

import { editorialDocBreadcrumbs } from '@/content-platform/content-breadcrumbs';
import { allMdxForRelated, readMdxFilesInDir } from '@/content-platform/fs-content';
import { docMetadata, MdxDocumentView } from '@/content-platform/mdx-doc-page';

export const revalidate = 60;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return readMdxFilesInDir('features').map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const doc = readMdxFilesInDir('features').find((d) => d.slug === slug);
  if (!doc) return { title: 'Feature' };
  return docMetadata(doc, `/features/${slug}`);
}

/**
 * Product feature narrative (MDX).
 */
export default async function FeaturePage({ params }: PageProps) {
  const { slug } = await params;
  const doc = readMdxFilesInDir('features').find((d) => d.slug === slug);
  if (!doc) notFound();

  return (
    <MdxDocumentView
      doc={doc}
      canonicalPath={`/features/${slug}`}
      relatedPool={allMdxForRelated()}
      breadcrumbs={editorialDocBreadcrumbs('features', slug, doc.frontmatter.title)}
    />
  );
}
