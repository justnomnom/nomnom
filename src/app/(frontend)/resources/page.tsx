import type { Metadata } from 'next';
import Link from 'next/link';

import { ContentPageShell } from '@/components/content-platform/sections/content-page-shell';
import { contentUseCaseStoryRowLinkClassName } from 'src/components/content-platform/ui/content-inline-link-classname';
import { readMdxFilesInDir } from '@/content-platform/fs-content';
import { pageMetadata } from '@/content-platform/page-metadata';

export const revalidate = 60;

export const metadata: Metadata = pageMetadata({
  title: 'Resources — Maps import, group dinners, and trust',
  description:
    'Practical NomNom guides: export Google Maps saved places, decide dinner without the group chat, and why star averages stopped meaning much.',
  path: '/resources',
});

/**
 * Index of long-form resource articles (MDX).
 */
export default function ResourcesIndexPage() {
  const docs = [...readMdxFilesInDir('resources')].sort((a, b) =>
    a.frontmatter.title.localeCompare(b.frontmatter.title)
  );

  return (
    <ContentPageShell
      title="Resources"
      description="Practical guides: import Google Maps saved places, decide dinner without the group chat, and why star averages stopped meaning much."
      breadcrumbs={[
        { name: 'Home', href: '/' },
        { name: 'Resources', href: '/resources' },
      ]}
    >
      <p>
        How-tos and arguments you can actually use — import a Maps list, land a group dinner, or put
        creator recs on a profile instead of in DMs. No invented restaurants, no fake scores.
      </p>

      <nav aria-label="Resource articles" className="not-prose">
        <div className="divide-y divide-border border-y border-border">
          {docs.map((doc) => (
            <Link
              key={doc.slug}
              href={`/resources/${doc.slug}`}
              className={contentUseCaseStoryRowLinkClassName}
            >
              <span className="mt-2 block text-xl font-bold leading-snug tracking-tight text-foreground transition-colors duration-200 group-hover:text-primary-readable">
                {doc.frontmatter.title}
              </span>
              {doc.frontmatter.description ? (
                <span className="mt-2 block max-w-[65ch] text-[0.9375rem] font-normal leading-relaxed text-muted-foreground">
                  {doc.frontmatter.description}
                </span>
              ) : null}
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-readable underline-offset-4 transition-all duration-200 group-hover:gap-2.5 group-hover:underline">
                Read
                <span aria-hidden="true">→</span>
              </span>
            </Link>
          ))}
        </div>
      </nav>
    </ContentPageShell>
  );
}
