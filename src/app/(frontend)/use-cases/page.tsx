import type { Metadata } from 'next';
import Link from 'next/link';

import { ContentPageShell } from '@/components/content-platform/sections/content-page-shell';
import { contentUseCaseStoryRowLinkClassName } from 'src/components/content-platform/ui/content-inline-link-classname';
import { readMdxFilesInDir } from '@/content-platform/fs-content';
import { localizedPageMetadata } from '@/content-platform/page-metadata';
import { getServerViewerLang } from 'src/libs/i18n-server';
import { getTranslation } from 'src/locales/default-translations';

const SLUG_ORDER = ['foodies', 'creators', 'hosts', 'restaurants'];
const TITLE_SEP = ' — ';

export async function generateMetadata(): Promise<Metadata> {
  return localizedPageMetadata({
    titleKey: 'pages.useCasesHub.metaTitle',
    descriptionKey: 'pages.useCasesHub.metaDescription',
    path: '/use-cases',
  });
}

function sortUseCaseDocs<T extends { slug: string }>(docs: T[]): T[] {
  return [...docs].sort((a, b) => {
    const ia = SLUG_ORDER.indexOf(a.slug);
    const ib = SLUG_ORDER.indexOf(b.slug);
    if (ia === -1 && ib === -1) return a.slug.localeCompare(b.slug);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

/** Split "Audience — headline" frontmatter titles into label + story line. */
function splitUseCaseTitle(title: string): { label: string; headline: string } {
  const sepIndex = title.indexOf(TITLE_SEP);
  if (sepIndex === -1) {
    return { label: title, headline: title };
  }

  const label = title.slice(0, sepIndex).trim();
  const rest = title.slice(sepIndex + TITLE_SEP.length).trim();
  const headline = rest ? rest.charAt(0).toUpperCase() + rest.slice(1) : title;

  return { label, headline };
}

/**
 * Index of use-case stories (MDX) — resolves `/use-cases` for nav `paths.site.useCasesRoot`.
 */
export default async function UseCasesIndexPage() {
  const lang = await getServerViewerLang();
  const t = (key: string) => getTranslation(lang, `pages.useCasesHub.${key}`);
  const docs = sortUseCaseDocs(readMdxFilesInDir('use-cases'));

  return (
    <ContentPageShell
      title={t('title')}
      description={t('description')}
      breadcrumbs={[
        { name: t('breadcrumb_home'), href: '/' },
        { name: t('title'), href: '/use-cases' },
      ]}
    >
      <p>{t('intro')}</p>

      <h2>{t('how_heading')}</h2>
      <ul>
        <li>
          <strong>{t('circle_name')}</strong>
          {t('circle')}
        </li>
        <li>
          <strong>{t('roulette_name')}</strong>
          {t('roulette')}
        </li>
        <li>
          <strong>{t('lists_name')}</strong>
          {t('lists')}
        </li>
        <li>
          <strong>{t('table_name')}</strong>
          {t('table')}
        </li>
        <li>
          <strong>{t('map_name')}</strong>
          {t('map')}
        </li>
      </ul>

      <h2>{t('creators_heading')}</h2>
      <p>{t('creators_body')}</p>

      <h2>{t('pick_heading')}</h2>
      <nav aria-label={t('nav_aria')} className="not-prose">
        <div className="divide-y divide-border border-y border-border">
          {docs.map((doc) => {
            const { label, headline } = splitUseCaseTitle(doc.frontmatter.title);

            return (
              <Link
                key={doc.slug}
                href={`/use-cases/${doc.slug}`}
                className={contentUseCaseStoryRowLinkClassName}
              >
                <span className="block text-[0.75rem] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  {label}
                </span>
                <span className="mt-2 block text-xl font-bold leading-snug tracking-tight text-foreground transition-colors duration-200 group-hover:text-primary-readable">
                  {headline}
                </span>
                {doc.frontmatter.description ? (
                  <span className="mt-2 block max-w-[65ch] text-[0.9375rem] font-normal leading-relaxed text-muted-foreground">
                    {doc.frontmatter.description}
                  </span>
                ) : null}
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-readable underline-offset-4 transition-all duration-200 group-hover:gap-2.5 group-hover:underline">
                  {t('read_story')}
                  <span aria-hidden="true">→</span>
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </ContentPageShell>
  );
}
