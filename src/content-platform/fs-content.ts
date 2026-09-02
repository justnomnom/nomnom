import fs from 'fs';
import path from 'path';

import matter from 'gray-matter';

import { CONTENT_ROOT } from './constants';
import type { MdxFrontmatter, ParsedMdxDocument } from './types';

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

export {
  getAllRestaurants,
  getCitySlugsForCountry,
  getCountrySlugs,
  getRestaurantBySlug,
  getRestaurantsByCity,
  getRestaurantsByCityFiltered,
  getRestaurantsByCountry,
} from './restaurant-catalog.js';

export { paginateRestaurants } from './restaurant-list-urls';

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
