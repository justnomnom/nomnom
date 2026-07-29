import { readMdxFilesInDir } from '@/content-platform/fs-content';
import {
  collectionSlugsForCity,
  collectionSlugsForCountry,
} from '@/content-platform/internal-graph';

export type BreadcrumbLink = { name: string; href: string };

const EDITORIAL_SECTION_LABEL = {
  resources: 'Resources',
  features: 'Features',
  'use-cases': 'Use cases',
  collections: 'Collections',
} as const;

export type EditorialSection = keyof typeof EDITORIAL_SECTION_LABEL;

function formatSlugLabel(slug: string): string {
  return slug.replace(/-/g, ' ');
}

/** When multiple siblings exist, link the section label to another doc in the same folder (never the current page). */
function siblingHubHref(
  slugs: string[],
  currentSlug: string,
  hrefForSlug: (s: string) => string
): string | null {
  const sorted = [...new Set(slugs)].sort();
  if (sorted.length <= 1) return null;
  const other = sorted.find((s) => s !== currentSlug);
  return hrefForSlug(other ?? sorted[0]);
}

/**
 * Breadcrumbs for top-level MDX hubs: /resources, /features, /use-cases, /collections.
 */
export function editorialDocBreadcrumbs(
  section: EditorialSection,
  slug: string,
  title: string
): BreadcrumbLink[] {
  const slugs = readMdxFilesInDir(section).map((d) => d.slug);
  const prefix = `/${section}`;
  const hrefForSlug = (s: string) => `${prefix}/${s}`;
  const hubHref = siblingHubHref(slugs, slug, hrefForSlug);

  const crumbs: BreadcrumbLink[] = [{ name: 'Home', href: '/' }];
  if (hubHref) {
    crumbs.push({ name: EDITORIAL_SECTION_LABEL[section], href: hubHref });
  }
  crumbs.push({ name: title, href: hrefForSlug(slug) });
  return crumbs;
}

/**
 * Breadcrumbs for /countries/{country}/collections/{slug}.
 */
export function countryCollectionDocBreadcrumbs(
  country: string,
  slug: string,
  title: string
): BreadcrumbLink[] {
  const slugs = collectionSlugsForCountry(country);
  const hrefForSlug = (s: string) => `/countries/${country}/collections/${s}`;
  const hubHref = siblingHubHref(slugs, slug, hrefForSlug);

  const crumbs: BreadcrumbLink[] = [
    { name: 'Home', href: '/' },
    { name: 'Countries', href: '/countries' },
    { name: formatSlugLabel(country), href: `/countries/${country}` },
  ];
  if (hubHref) {
    crumbs.push({ name: 'Collections', href: hubHref });
  }
  crumbs.push({ name: title, href: hrefForSlug(slug) });
  return crumbs;
}

/**
 * Breadcrumbs for /countries/{country}/{city}/collections/{slug}.
 */
export function cityCollectionDocBreadcrumbs(
  country: string,
  city: string,
  slug: string,
  title: string
): BreadcrumbLink[] {
  const slugs = collectionSlugsForCity(country, city);
  const hrefForSlug = (s: string) => `/countries/${country}/${city}/collections/${s}`;
  const hubHref = siblingHubHref(slugs, slug, hrefForSlug);

  const crumbs: BreadcrumbLink[] = [
    { name: 'Home', href: '/' },
    { name: 'Countries', href: '/countries' },
    { name: formatSlugLabel(country), href: `/countries/${country}` },
    { name: formatSlugLabel(city), href: `/countries/${country}/${city}` },
  ];
  if (hubHref) {
    crumbs.push({ name: 'Collections', href: hubHref });
  }
  crumbs.push({ name: title, href: hrefForSlug(slug) });
  return crumbs;
}
