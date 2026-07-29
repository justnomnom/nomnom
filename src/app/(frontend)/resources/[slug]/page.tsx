import { notFound } from 'next/navigation';

import { editorialDocBreadcrumbs } from '@/content-platform/content-breadcrumbs';
import { allMdxForRelated, readMdxFilesInDir } from '@/content-platform/fs-content';
import { docMetadata, MdxDocumentView } from '@/content-platform/mdx-doc-page';

export const revalidate = 60;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return readMdxFilesInDir('resources').map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const doc = readMdxFilesInDir('resources').find((d) => d.slug === slug);
  if (!doc) return { title: 'Resource' };
  return docMetadata(doc, `/resources/${slug}`);
}

/**
 * Long-form resource article (MDX on disk).
 */
export default async function ResourcePage({ params }: PageProps) {
  const { slug } = await params;
  const doc = readMdxFilesInDir('resources').find((d) => d.slug === slug);
  if (!doc) notFound();

  return (
    <MdxDocumentView
      doc={doc}
      canonicalPath={`/resources/${slug}`}
      relatedPool={allMdxForRelated()}
      breadcrumbs={editorialDocBreadcrumbs('resources', slug, doc.frontmatter.title)}
    />
  );
}
