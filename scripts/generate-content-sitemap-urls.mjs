/**
 * Generates `src/content-platform/generated/sitemap-paths.json` from `/content`.
 * Run via `npm run content:sitemap-urls` or `prebuild`.
 *
 * Output: array of `{ path, lastModified? }` (ISO 8601). `lastModified` is derived from source
 * file mtimes where applicable, otherwise the generation time.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

import {
  getRestaurantPageSize,
  restaurantListPath,
} from '../src/content-platform/restaurant-list-urls.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const contentDir = path.join(root, 'content');
const outFile = path.join(root, 'src', 'content-platform', 'generated', 'sitemap-paths.json');

function listSubdirNames(relativeDir) {
  const abs = path.join(contentDir, relativeDir);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

function readMdxSlugsInDir(relativeDir) {
  const abs = path.join(contentDir, relativeDir);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs)
    .filter((f) => f.endsWith('.mdx'))
    .map((filename) => {
      const raw = fs.readFileSync(path.join(abs, filename), 'utf8');
      const { data } = matter(raw);
      if (data.draft) return null;
      return filename.replace(/\.mdx$/, '');
    })
    .filter(Boolean);
}

function allRestaurants() {
  const p = path.join(contentDir, 'data', 'restaurants.json');
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

/** Collection URLs use `[slug]` only — skip nested paths and reserved segments. */
function isFlatCollectionSlug(slug) {
  if (!slug || slug.includes('/')) return false;
  const reserved = new Set(['restaurants', 'influencers', 'collections', 'page', 'tag']);
  return !reserved.has(slug);
}

function walkMdxSlugs(relativeRoot) {
  const rootPath = path.join(contentDir, relativeRoot);
  if (!fs.existsSync(rootPath)) return [];

  const slugs = [];

  function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith('.mdx')) {
        const raw = fs.readFileSync(full, 'utf8');
        const { data } = matter(raw);
        if (data.draft) continue;
        const rel = path.relative(path.join(contentDir, relativeRoot), full);
        const slug = rel.replace(/\\/g, '/').replace(/\.mdx$/, '');
        if (slug) slugs.push(slug);
      }
    }
  }

  walk(rootPath);
  return slugs;
}

function countrySlugs() {
  const fromFs = listSubdirNames('countries');
  const fromData = [...new Set(allRestaurants().map((r) => r.country))];
  return [...new Set([...fromFs, ...fromData])].sort();
}

const RESERVED_COUNTRY_DIR = new Set(['collections', 'data']);

function citySlugsForCountry(country) {
  const fromFs = listSubdirNames(path.join('countries', country)).filter((n) => !RESERVED_COUNTRY_DIR.has(n));
  const fromData = [
    ...new Set(allRestaurants().filter((r) => r.country === country).map((r) => r.city)),
  ];
  return [...new Set([...fromFs, ...fromData])].sort();
}

function statMtimeMs(filePath, fallbackMs) {
  try {
    if (!fs.existsSync(filePath)) return fallbackMs;
    return fs.statSync(filePath).mtimeMs;
  } catch {
    return fallbackMs;
  }
}

function main() {
  const buildMs = Date.now();
  /** @type {Map<string, number>} */
  const mtimes = new Map();

  function bump(urlPath, ms) {
    const prev = mtimes.get(urlPath);
    mtimes.set(urlPath, prev === undefined ? ms : Math.max(prev, ms));
  }

  function addStatic(urlPath) {
    bump(urlPath, buildMs);
  }

  const restaurantsJsonPath = path.join(contentDir, 'data', 'restaurants.json');
  const restaurantsMtime = statMtimeMs(restaurantsJsonPath, buildMs);

  addStatic('/');
  addStatic('/countries');
  addStatic('/pricing');
  addStatic('/about');
  addStatic('/contact-us');
  addStatic('/faqs');
  addStatic('/privacy');
  addStatic('/terms');
  addStatic('/use-cases');
  addStatic('/resources');
  addStatic('/features');
  addStatic('/roleta/lisboa');

  for (const slug of readMdxSlugsInDir('collections')) {
    const fp = path.join(contentDir, 'collections', `${slug}.mdx`);
    bump(`/collections/${slug}`, statMtimeMs(fp, buildMs));
  }
  for (const slug of readMdxSlugsInDir('resources')) {
    const fp = path.join(contentDir, 'resources', `${slug}.mdx`);
    bump(`/resources/${slug}`, statMtimeMs(fp, buildMs));
  }
  for (const slug of readMdxSlugsInDir('features')) {
    const fp = path.join(contentDir, 'features', `${slug}.mdx`);
    bump(`/features/${slug}`, statMtimeMs(fp, buildMs));
  }
  for (const slug of readMdxSlugsInDir('use-cases')) {
    const fp = path.join(contentDir, 'use-cases', `${slug}.mdx`);
    bump(`/use-cases/${slug}`, statMtimeMs(fp, buildMs));
  }

  const influencerFiles = fs.existsSync(path.join(contentDir, 'influencers'))
    ? fs.readdirSync(path.join(contentDir, 'influencers')).filter((f) => f.endsWith('.mdx'))
    : [];

  const influencerBySlug = {};
  for (const f of influencerFiles) {
    const slug = f.replace(/\.mdx$/, '');
    const raw = fs.readFileSync(path.join(contentDir, 'influencers', f), 'utf8');
    const { data } = matter(raw);
    if (!data.draft) influencerBySlug[slug] = data.country;
  }

  for (const country of countrySlugs()) {
    bump(`/countries/${country}`, buildMs);
    bump(`/countries/${country}/influencers`, buildMs);

    for (const [slug, c] of Object.entries(influencerBySlug)) {
      if (c === country) {
        const fp = path.join(contentDir, 'influencers', `${slug}.mdx`);
        bump(`/countries/${country}/influencers/${slug}`, statMtimeMs(fp, buildMs));
      }
    }

    for (const slug of walkMdxSlugs(path.join('countries', country, 'collections'))) {
      if (isFlatCollectionSlug(slug)) {
        const fp = path.join(contentDir, 'countries', country, 'collections', `${slug}.mdx`);
        bump(`/countries/${country}/collections/${slug}`, statMtimeMs(fp, buildMs));
      }
    }

    for (const city of citySlugsForCountry(country)) {
      bump(`/countries/${country}/${city}`, restaurantsMtime);
      bump(`/countries/${country}/${city}/restaurants`, restaurantsMtime);

      const count = allRestaurants().filter((r) => r.country === country && r.city === city).length;
      const pages = Math.max(1, Math.ceil(count / getRestaurantPageSize()));
      for (let page = 2; page <= pages; page += 1) {
        bump(restaurantListPath(country, city, page), restaurantsMtime);
      }

      const restaurants = allRestaurants().filter((r) => r.country === country && r.city === city);
      const tags = [...new Set(restaurants.flatMap((r) => r.categories || []))];
      for (const tag of tags) {
        const filtered = restaurants.filter((r) => (r.categories || []).includes(tag));
        const tagPages = Math.max(1, Math.ceil(filtered.length / getRestaurantPageSize()));
        bump(restaurantListPath(country, city, 1, tag), restaurantsMtime);
        for (let page = 2; page <= tagPages; page += 1) {
          bump(restaurantListPath(country, city, page, tag), restaurantsMtime);
        }
      }

      for (const slug of walkMdxSlugs(path.join('countries', country, city, 'collections'))) {
        if (isFlatCollectionSlug(slug)) {
          const fp = path.join(contentDir, 'countries', country, city, 'collections', `${slug}.mdx`);
          bump(`/countries/${country}/${city}/collections/${slug}`, statMtimeMs(fp, buildMs));
        }
      }
    }
  }

  for (const r of allRestaurants()) {
    bump(`/countries/${r.country}/${r.city}/restaurants/${r.slug}`, restaurantsMtime);
  }

  const entries = [...mtimes.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([urlPath, ms]) => ({
      path: urlPath,
      lastModified: new Date(ms).toISOString(),
    }));

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, `${JSON.stringify(entries, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${entries.length} paths to ${path.relative(root, outFile)}`);
}

main();
