import fs from 'fs';
import path from 'path';

import matter from 'gray-matter';

import { CONTENT_ROOT } from './constants';
import type { MdxFrontmatter, ParsedMdxDocument, Restaurant } from './types';

/** Join repo-root `content/` + segments. `process.cwd()` is ignored for Turbopack file tracing (see Next.js NFT warning). */
function contentPath(...segments: string[]): string {
  return path.join(/*turbopackIgnore: true*/ process.cwd(), CONTENT_ROOT, ...segments);
}

/** Absolute path to the `content` directory at repo root. */
export function getContentDir(): string {
  return contentPath();
}

/** List immediate subdirectory names under a path (for static params). */
export function listSubdirNames(relativeDir: string): string[] {
  const abs = contentPath(relativeDir);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

/** Read and parse every `.mdx` file in a directory (non-recursive). */
export function readMdxFilesInDir(relativeDir: string): ParsedMdxDocument[] {
  const abs = contentPath(relativeDir);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs)
    .filter((f) => f.endsWith('.mdx'))
    .map((filename) => {
      const slug = filename.replace(/\.mdx$/, '');
      const filePath = path.join(abs, /*turbopackIgnore: true*/ filename);
      const raw = fs.readFileSync(filePath, 'utf8');
      const { data, content } = matter(raw);
      return {
        slug,
        frontmatter: data as MdxFrontmatter,
        body: content,
        filePath: path.relative(/*turbopackIgnore: true*/ process.cwd(), filePath),
      };
    })
    .filter((doc) => !doc.frontmatter.draft);
}

export function getMdxBySlug(relativeDir: string, slug: string): ParsedMdxDocument | null {
  const docs = readMdxFilesInDir(relativeDir);
  return docs.find((d) => d.slug === slug) ?? null;
}

/** All restaurants from structured JSON (not MDX). */
export function getAllRestaurants(): Restaurant[] {
  const p = contentPath('data', 'restaurants.json');
  if (!fs.existsSync(p)) return [];
  const raw = fs.readFileSync(p, 'utf8');
  return JSON.parse(raw) as Restaurant[];
}

export function getRestaurantBySlug(slug: string): Restaurant | null {
  return getAllRestaurants().find((r) => r.slug === slug) ?? null;
}

export function getRestaurantsByCity(country: string, city: string): Restaurant[] {
  return getAllRestaurants().filter((r) => r.country === country && r.city === city);
}

export function getRestaurantsByCityFiltered(
  country: string,
  city: string,
  tag?: string
): Restaurant[] {
  const list = getRestaurantsByCity(country, city);
  if (!tag) return list;
  return list.filter((r) => (r.categories ?? []).includes(tag));
}

export function paginateRestaurants<T>(items: T[], page: number, pageSize: number): T[] {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 1;
  const start = (safePage - 1) * safeSize;
  return items.slice(start, start + safeSize);
}

/**
 * Reads every `.mdx` under `/content` for related-content suggestions (recursive).
 */
export function allMdxForRelated(): ParsedMdxDocument[] {
  const root = contentPath();
  const out: ParsedMdxDocument[] = [];

  function walk(dir: string) {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, /*turbopackIgnore: true*/ e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith('.mdx')) {
        const rel = path.relative(root, full);
        const raw = fs.readFileSync(full, 'utf8');
        const { data, content } = matter(raw);
        const slug = e.name.replace(/\.mdx$/, '');
        out.push({
          slug,
          frontmatter: data as MdxFrontmatter,
          body: content,
          filePath: rel.replace(/\\/g, '/'),
        });
      }
    }
  }

  walk(root);
  return out.filter((d) => !d.frontmatter.draft);
}

export function getRestaurantsByCountry(country: string): Restaurant[] {
  return getAllRestaurants().filter((r) => r.country === country);
}

/** City slugs for a country (from filesystem + any city that has restaurants). */
const RESERVED_COUNTRY_CHILD_DIRS = new Set(['collections', 'data']);

export function getCitySlugsForCountry(country: string): string[] {
  const fromFs = listSubdirNames(path.join('countries', country)).filter(
    (n) => !RESERVED_COUNTRY_CHILD_DIRS.has(n)
  );
  const fromData = [...new Set(getRestaurantsByCountry(country).map((r) => r.city))];
  return [...new Set([...fromFs, ...fromData])].sort();
}

/** Country slugs that have content or restaurant data. */
export function getCountrySlugs(): string[] {
  const fromFs = listSubdirNames('countries');
  const fromData = [...new Set(getAllRestaurants().map((r) => r.country))];
  return [...new Set([...fromFs, ...fromData])].sort();
}
