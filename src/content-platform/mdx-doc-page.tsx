import type { Metadata } from 'next';

import Alert from '@mui/material/Alert';

import { RelatedLinksSection } from '@/components/content-platform/sections/related-links';
import { ContentPageShell } from '@/components/content-platform/sections/content-page-shell';
import { JsonLd } from '@/components/content-platform/seo/json-ld';
import { getRestaurantBySlug } from '@/content-platform/fs-content';
import { hrefForMdxDoc } from '@/content-platform/internal-graph';
import { renderMdxBody } from '@/content-platform/render-mdx-body';
import { suggestByTags } from '@/content-platform/related-content';
import type { ParsedMdxDocument } from '@/content-platform/types';
import { fetchTinaInfluencer, fetchTinaSeoCollection } from '@/content-platform/tina-queries';
import { getSiteUrl } from '@/content-platform/site-url';
import { contentHubT, displaySlug } from '@/content-platform/content-hub-t';

import { APP, APP_OG_IMAGE_PATH } from 'src/config-global';

type BuildLinksArgs = {
  doc: ParsedMdxDocument;
  relatedPool: ParsedMdxDocument[];
  cityContext?: { country: string; city: string };
  countryContext?: { country: string };
};

/**
 * Builds internal link set from frontmatter + tag suggestions.
 */
export async function buildStandardDocLinks({
  doc,
  relatedPool,
  cityContext,
  countryContext,
}: BuildLinksArgs) {
  const t = await contentHubT();
  const links: { href: string; label: string }[] = [];

  const add = (href: string | null | undefined, label: string) => {
    if (href) links.push({ href, label });
  };

  for (const slug of doc.frontmatter.relatedCollectionSlugs ?? []) {
    add(`/collections/${slug}`, t('collection_label', { name: displaySlug(slug) }));
  }

  for (const slug of doc.frontmatter.relatedRestaurantSlugs ?? []) {
    const r = getRestaurantBySlug(slug);
    if (r) {
      add(
        `/countries/${r.country}/${r.city}/restaurants/${r.slug}`,
        t('restaurant_label', { name: r.name })
      );
    }
  }

  for (const slug of doc.frontmatter.relatedInfluencerSlugs ?? []) {
    const inf = relatedPool.find((d) => d.slug === slug && d.filePath.includes('/influencers/'));
    const country = inf?.frontmatter.country;
    if (country) {
      add(
        `/countries/${country}/influencers/${slug}`,
        t('creator_label', { name: displaySlug(slug) })
      );
    }
  }

  if (cityContext) {
    add(
      `/countries/${cityContext.country}/${cityContext.city}`,
      t('hub_label', { name: displaySlug(cityContext.city) })
    );
    add(`/countries/${cityContext.country}/${cityContext.city}/restaurants`, t('city_directory'));
  }

  if (countryContext) {
    add(
      `/countries/${countryContext.country}`,
      t('overview', { country: displaySlug(countryContext.country) })
    );
    add(`/countries/${countryContext.country}/influencers`, t('country_creators'));
  }

  for (const r of suggestByTags(doc, relatedPool, 3)) {
    const href = hrefForMdxDoc(r);
    if (href) add(href, r.frontmatter.title);
  }

  const seen = new Set<string>();
  return links.filter((l) => {
    if (seen.has(l.href)) return false;
    seen.add(l.href);
    return true;
  });
}

type DocPageProps = {
  doc: ParsedMdxDocument;
  breadcrumbs: { name: string; href: string }[];
  canonicalPath: string;
  relatedPool: ParsedMdxDocument[];
  cityContext?: { country: string; city: string };
  countryContext?: { country: string };
  /** Optional Tina GraphQL hydration banner (requires cloud env). */
  tina?: { kind: 'seo_collection' | 'influencer'; relativePath: string };
};

/**
 * Renders a markdown document with MDX body, JSON-LD, and related links.
 */
export async function MdxDocumentView({
  doc,
  breadcrumbs,
  canonicalPath,
  relatedPool,
  cityContext,
  countryContext,
  tina,
}: DocPageProps) {
  let tinaHit = false;
  if (tina && process.env.NEXT_PUBLIC_TINA_CLIENT_ID && process.env.TINA_TOKEN) {
    try {
      if (tina.kind === 'seo_collection') {
        tinaHit = !!(await fetchTinaSeoCollection(tina.relativePath));
      } else {
        tinaHit = !!(await fetchTinaInfluencer(tina.relativePath));
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[MdxDocumentView] Tina fetch failed', {
          relativePath: tina.relativePath,
          kind: tina.kind,
          error: err,
        });
      }
      tinaHit = false;
    }
  }
  const tinaNote = tinaHit
    ? 'Tina Cloud returned this document over GraphQL with ISR-friendly caching — filesystem MDX is the static fallback.'
    : null;

  const body = await renderMdxBody(doc.body);

  const site = getSiteUrl();
  const canonicalUrl = `${site}${canonicalPath}`;
  const ogImage = doc.frontmatter.ogImage ?? APP_OG_IMAGE_PATH;

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((b, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: b.name,
      item: `${site}${b.href}`,
    })),
  };

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: doc.frontmatter.title,
    description: doc.frontmatter.description,
    url: canonicalUrl,
    image: ogImage,
    publisher: {
      '@type': 'Organization',
      name: APP.name,
      url: site,
      logo: {
        '@type': 'ImageObject',
        url: `${site}/favicon/android-chrome-512x512.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
  };

  const related = await buildStandardDocLinks({
    doc,
    relatedPool,
    cityContext,
    countryContext,
  });
  const hubT = await contentHubT();
  const continueTitle = hubT('continue_reading');

  return (
    <>
      <JsonLd data={[breadcrumbLd, articleLd]} />
      <ContentPageShell
        title={doc.frontmatter.title}
        description={doc.frontmatter.description}
        breadcrumbs={breadcrumbs}
      >
        {tinaNote ? (
          <Alert
            severity="success"
            variant="outlined"
            role="status"
            sx={{ mb: 0 }}
            className="not-prose"
          >
            {tinaNote}
          </Alert>
        ) : null}
        {body}
        <RelatedLinksSection title={continueTitle} links={related.slice(0, 12)} />
      </ContentPageShell>
    </>
  );
}

export function docMetadata(doc: ParsedMdxDocument, canonicalPath: string): Metadata {
  const title = doc.frontmatter.title;
  const description = doc.frontmatter.description;
  const ogImage = doc.frontmatter.ogImage ?? APP_OG_IMAGE_PATH;
  return {
    title,
    description,
    alternates: { canonical: `${getSiteUrl()}${canonicalPath}` },
    openGraph: {
      type: 'website',
      siteName: APP.name,
      title,
      description,
      url: `${getSiteUrl()}${canonicalPath}`,
      images: [
        {
          url: ogImage,
          width: ogImage === APP_OG_IMAGE_PATH ? 1200 : 512,
          height: ogImage === APP_OG_IMAGE_PATH ? 630 : 512,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}
