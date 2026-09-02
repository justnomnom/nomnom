import { readMdxFilesInDir } from '@/content-platform/fs-content';
import {
  collectionSlugsForCity,
  collectionSlugsForCountry,
} from '@/content-platform/internal-graph';
import { formatSlugLabel, siblingHubHref } from '@/content-platform/content-breadcrumbs-links';

export type BreadcrumbLink = { name: string; href: string };

const EDITORIAL_SECTION_LABEL = {
  resources: 'Resources',
  features: 'Features',
  'use-cases': 'Use cases',
  collections: 'Collections',
} as const;

export type EditorialSection = keyof typeof EDITORIAL_SECTION_LABEL;

const HUB_INDEX_SECTIONS = new Set(['resources', 'features', 'use-cases']);

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
  const hubHref = HUB_INDEX_SECTIONS.has(section)
    ? prefix
    : siblingHubHref(slugs, slug, hrefForSlug);

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
