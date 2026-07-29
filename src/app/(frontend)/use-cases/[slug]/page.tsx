import { notFound } from 'next/navigation';

import { editorialDocBreadcrumbs } from '@/content-platform/content-breadcrumbs';
import { allMdxForRelated, readMdxFilesInDir } from '@/content-platform/fs-content';
import { docMetadata, MdxDocumentView } from '@/content-platform/mdx-doc-page';

export const revalidate = 60;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return readMdxFilesInDir('use-cases').map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const doc = readMdxFilesInDir('use-cases').find((d) => d.slug === slug);
  if (!doc) return { title: 'Use case' };
  return docMetadata(doc, `/use-cases/${slug}`);
}

/**
 * Use-case story (MDX).
 */
export default async function UseCasePage({ params }: PageProps) {
  const { slug } = await params;
  const doc = readMdxFilesInDir('use-cases').find((d) => d.slug === slug);
  if (!doc) notFound();

  return (
    <MdxDocumentView
      doc={doc}
      canonicalPath={`/use-cases/${slug}`}
      relatedPool={allMdxForRelated()}
      breadcrumbs={editorialDocBreadcrumbs('use-cases', slug, doc.frontmatter.title)}
    />
  );
}
