import type { Metadata } from 'next';
import Link from 'next/link';

import { ContentPageShell } from '@/components/content-platform/sections/content-page-shell';
import { contentUseCaseStoryRowLinkClassName } from 'src/components/content-platform/ui/content-inline-link-classname';
import { readMdxFilesInDir } from '@/content-platform/fs-content';
import { pageMetadata } from '@/content-platform/page-metadata';

export const revalidate = 60;

const SLUG_ORDER = ['feed', 'lists', 'map', 'roulette', 'table'];

export const metadata: Metadata = pageMetadata({
  title: 'Features — feed, lists, map, NomNom Roulette, and Table',
  description:
    'How NomNom works: a feed from people you follow, lists you can import and share, a map of those pins, NomNom Roulette when you cannot choose, and Table so a group can vote without the app.',
  path: '/features',
});

function sortFeatureDocs<T extends { slug: string }>(docs: T[]): T[] {
  return [...docs].sort((a, b) => {
    const ia = SLUG_ORDER.indexOf(a.slug);
    const ib = SLUG_ORDER.indexOf(b.slug);
    if (ia === -1 && ib === -1) return a.slug.localeCompare(b.slug);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

/**
 * Index of product feature narratives (MDX).
 */
export default function FeaturesIndexPage() {
  const docs = sortFeatureDocs(readMdxFilesInDir('features'));

  return (
    <ContentPageShell
      title="Features"
      description="Follow people you trust, save lists, map the pins, spin NomNom Roulette, and vote on a Table — even without the app."
      breadcrumbs={[
        { name: 'Home', href: '/' },
        { name: 'Features', href: '/features' },
      ]}
    >
      <p>
        Restaurant picks from people you trust. Named sources, lists you can follow, a map of those
        pins, NomNom Roulette on your pool, and Table votes that do not require the app.
      </p>

      <nav aria-label="Feature guides" className="not-prose">
        <div className="divide-y divide-border border-y border-border">
          {docs.map((doc) => (
            <Link
              key={doc.slug}
              href={`/features/${doc.slug}`}
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
