import { readFileSync } from 'fs';
import path from 'path';

import { getSiteUrl } from '@/content-platform/site-url';

type PathEntry = { path: string; lastModified?: string };

let cachedEntries: PathEntry[] | null = null;

function parseLastModifiedIso(raw: string | undefined): Date | undefined {
  if (!raw) return undefined;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * Loads sitemap path list from `scripts/generate-content-sitemap-urls.mjs` (runs on `prebuild`).
 * Supports legacy `string[]` or `{ path, lastModified? }[]`.
 */
function loadSitemapEntries(): PathEntry[] {
  if (cachedEntries) return cachedEntries;
  const file = path.join(process.cwd(), 'src/content-platform/generated/sitemap-paths.json');
  try {
    const raw = readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
      cachedEntries = (parsed as string[]).map((p) => ({ path: p }));
      return cachedEntries;
    }
    cachedEntries = parsed as PathEntry[];
    return cachedEntries;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to read or parse sitemap paths (src/content-platform/generated/sitemap-paths.json, cwd: ${process.cwd()}): ${message}`
    );
  }
}

export type ContentSitemapEntry = {
  path: string;
  url: string;
  lastModified?: Date;
};

/**
 * Builds absolute URLs for sitemap generation.
 */
export function getContentSitemapEntries(): ContentSitemapEntry[] {
  const base = getSiteUrl();
  return loadSitemapEntries().map((e) => ({
    path: e.path,
    url: `${base}${e.path}`,
    lastModified: parseLastModifiedIso(e.lastModified),
  }));
}
