import fs from 'fs';
import path from 'path';

/** Join repo-root `content/` + segments. `process.cwd()` is ignored for Turbopack file tracing. */
function contentPath(...segments) {
  return path.join(/* turbopackIgnore: true */ process.cwd(), 'content', ...segments);
}

/**
 * List immediate subdirectory names under a content-relative path.
 *
 * @param {string} relativeDir
 * @returns {string[]}
 */
function listSubdirNames(relativeDir) {
  const abs = contentPath(relativeDir);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

/**
 * All restaurants from structured JSON (not MDX).
 *
 * @returns {Array<{ slug: string, country: string, city: string, categories?: string[] }>}
 */
export function getAllRestaurants() {
  const p = contentPath('data', 'restaurants.json');
  if (!fs.existsSync(p)) return [];
  const raw = fs.readFileSync(p, 'utf8');
  return JSON.parse(raw);
}

/** @param {string} slug */
export function getRestaurantBySlug(slug) {
  return getAllRestaurants().find((r) => r.slug === slug) ?? null;
}

/**
 * @param {string} country
 * @param {string} city
 */
export function getRestaurantsByCity(country, city) {
  return getAllRestaurants().filter((r) => r.country === country && r.city === city);
}

/**
 * @param {string} country
 * @param {string} city
 * @param {string} [tag]
 */
export function getRestaurantsByCityFiltered(country, city, tag) {
  const list = getRestaurantsByCity(country, city);
  if (!tag) return list;
  return list.filter((r) => (r.categories ?? []).includes(tag));
}

/** @param {string} country */
export function getRestaurantsByCountry(country) {
  return getAllRestaurants().filter((r) => r.country === country);
}

const RESERVED_COUNTRY_CHILD_DIRS = new Set(['collections', 'data']);

/** City slugs for a country (from filesystem + any city that has restaurants). */
export function getCitySlugsForCountry(country) {
  const fromFs = listSubdirNames(path.join('countries', country)).filter(
    (n) => !RESERVED_COUNTRY_CHILD_DIRS.has(n)
  );
  const fromData = [...new Set(getRestaurantsByCountry(country).map((r) => r.city))];
  return [...new Set([...fromFs, ...fromData])].sort();
}

/** Country slugs that have content or restaurant data. */
export function getCountrySlugs() {
  const fromFs = listSubdirNames('countries');
  const fromData = [...new Set(getAllRestaurants().map((r) => r.country))];
  return [...new Set([...fromFs, ...fromData])].sort();
}
