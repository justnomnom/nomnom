import type { Metadata } from 'next';
import Link from 'next/link';

import { ContentPageShell } from '@/components/content-platform/sections/content-page-shell';
import { contentUseCaseStoryRowLinkClassName } from 'src/components/content-platform/ui/content-inline-link-classname';
import { readMdxFilesInDir } from '@/content-platform/fs-content';
import { localizedPageMetadata } from '@/content-platform/page-metadata';
import { getServerViewerLang } from 'src/libs/i18n-server';
import { getTranslation } from 'src/locales/default-translations';

const SLUG_ORDER = ['feed', 'lists', 'map', 'roulette', 'table'];

export async function generateMetadata(): Promise<Metadata> {
  return localizedPageMetadata({
    titleKey: 'pages.featuresHub.metaTitle',
    descriptionKey: 'pages.featuresHub.metaDescription',
    path: '/features',
  });
}

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
export default async function FeaturesIndexPage() {
  const lang = await getServerViewerLang();
  const t = (key: string) => getTranslation(lang, `pages.featuresHub.${key}`);
  const docs = sortFeatureDocs(readMdxFilesInDir('features'));

  return (
    <ContentPageShell
      title={t('title')}
      description={t('description')}
      breadcrumbs={[
        { name: t('breadcrumb_home'), href: '/' },
        { name: t('title'), href: '/features' },
      ]}
    >
      <p>{t('intro')}</p>

      <nav aria-label={t('nav_aria')} className="not-prose">
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
                {t('read')}
                <span aria-hidden="true">→</span>
              </span>
            </Link>
          ))}
        </div>
      </nav>
    </ContentPageShell>
  );
}
