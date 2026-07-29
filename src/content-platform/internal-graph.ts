import path from 'path';

import {
  getAllRestaurants,
  getCitySlugsForCountry,
  readMdxFilesInDir,
} from '@/content-platform/fs-content';
import type { ParsedMdxDocument } from '@/content-platform/types';

function allMdxDocs(): ParsedMdxDocument[] {
  const dirs = ['collections', 'resources', 'features', 'use-cases', 'influencers'] as const;
  const out: ParsedMdxDocument[] = [];
  for (const d of dirs) {
    out.push(...readMdxFilesInDir(d));
  }
  return out;
}

function cityCollectionDocs(country: string, city: string): ParsedMdxDocument[] {
  return readMdxFilesInDir(path.join('countries', country, city, 'collections'));
}

function countryCollectionDocs(country: string): ParsedMdxDocument[] {
  return readMdxFilesInDir(path.join('countries', country, 'collections'));
}

/**
 * MDX pages that list this restaurant in `relatedRestaurantSlugs`.
 */
export function findDocsLinkingRestaurant(restaurantSlug: string): ParsedMdxDocument[] {
  const seenCityKeys = new Set<string>();
  const cityScoped: ParsedMdxDocument[] = [];
  for (const r of getAllRestaurants()) {
    const key = `${r.country}\0${r.city}`;
    if (seenCityKeys.has(key)) continue;
    seenCityKeys.add(key);
    cityScoped.push(...cityCollectionDocs(r.country, r.city));
  }
  const pool = [...allMdxDocs(), ...cityScoped];

  const unique = new Map<string, ParsedMdxDocument>();
  for (const d of pool) {
    const slugs = d.frontmatter.relatedRestaurantSlugs ?? [];
    if (slugs.includes(restaurantSlug)) {
      unique.set(`${d.filePath}`, d);
    }
  }
  return [...unique.values()];
}

/**
 * Resolves href for an MDX document (global vs country vs city scoped).
 */
export function hrefForMdxDoc(doc: ParsedMdxDocument): string | null {
  const fp = doc.filePath.replace(/\\/g, '/');
  if (fp.startsWith('content/collections/')) {
    return `/collections/${doc.slug}`;
  }
  if (fp.startsWith('content/resources/')) {
    return `/resources/${doc.slug}`;
  }
  if (fp.startsWith('content/features/')) {
    return `/features/${doc.slug}`;
  }
  if (fp.startsWith('content/use-cases/')) {
    return `/use-cases/${doc.slug}`;
  }
  if (fp.startsWith('content/influencers/')) {
    const country = doc.frontmatter.country;
    if (!country) return null;
    return `/countries/${country}/influencers/${doc.slug}`;
  }
  const parts = fp.split('/');
  const idx = parts.indexOf('countries');
  if (idx >= 0 && parts[idx + 1] && parts[idx + 2] && parts[idx + 3] === 'collections') {
    const country = parts[idx + 1];
    const city = parts[idx + 2];
    return `/countries/${country}/${city}/collections/${doc.slug}`;
  }
  if (idx >= 0 && parts[idx + 1] && parts[idx + 2] === 'collections') {
    const country = parts[idx + 1];
    return `/countries/${country}/collections/${doc.slug}`;
  }
  return null;
}

/**
 * Collection MDX slugs for a city (for city hub linking).
 */
export function collectionSlugsForCity(country: string, city: string): string[] {
  return cityCollectionDocs(country, city).map((d) => d.slug);
}

export function collectionSlugsForCountry(country: string): string[] {
  return countryCollectionDocs(country).map((d) => d.slug);
}

export function influencerSlugsForCountry(country: string): string[] {
  return readMdxFilesInDir('influencers')
    .filter((d) => d.frontmatter.country === country)
    .map((d) => d.slug);
}

/**
 * Picks global collection slugs for cross-linking (deterministic).
 */
export function sampleGlobalCollectionSlugs(limit = 3): string[] {
  return readMdxFilesInDir('collections')
    .map((d) => d.slug)
    .sort()
    .slice(0, limit);
}

/**
 * Returns city slugs for the given country (delegates to `getCitySlugsForCountry`).
 */
export function cityNavSlugs(country: string): string[] {
  return getCitySlugsForCountry(country);
}
