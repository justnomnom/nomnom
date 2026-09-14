/**
 * Restaurant data for the content hubs.
 *
 * Previously read `content/data/restaurants.json`. The database is now the single
 * source of truth: hub restaurants are rows with a `slug` (their URL key) and
 * authored copy under `metadata.editorial`. See `curated-restaurants.js`.
 *
 * The function names are unchanged from the JSON era so callers only had to add
 * `await` — but they ARE all async now, including the two slug helpers, because
 * both blend filesystem directories with restaurant data.
 *
 * Country/city *directories* still come from the filesystem: collections,
 * influencers and guides are MDX files, and a city can have a hub page before
 * any restaurant in it is curated.
 */

import path from 'path';

import { listSubdirNames } from './content-fs-dirs';
import {
  getCuratedCitySlugs,
  getCuratedRestaurants,
  getCuratedCountrySlugs,
  getCuratedRestaurantBySlug,
  getCuratedRestaurantsByCity,
} from './curated-restaurants';

/**
 * Every curated restaurant across all hubs.
 *
 * @returns {Promise<import('./types').Restaurant[]>}
 */
export async function getAllRestaurants() {
  return getCuratedRestaurants();
}

/**
 * @param {string} slug
 * @returns {Promise<import('./types').Restaurant | null>}
 */
export async function getRestaurantBySlug(slug) {
  return getCuratedRestaurantBySlug(slug);
}

/**
 * @param {string} country
 * @param {string} city
 * @returns {Promise<import('./types').Restaurant[]>}
 */
export async function getRestaurantsByCity(country, city) {
  return getCuratedRestaurantsByCity(country, city);
}

/**
 * @param {string} country
 * @param {string} city
 * @param {string} [tag]
 * @returns {Promise<import('./types').Restaurant[]>}
 */
export async function getRestaurantsByCityFiltered(country, city, tag) {
  return getCuratedRestaurantsByCity(country, city, tag);
}

/**
 * @param {string} country
 * @returns {Promise<import('./types').Restaurant[]>}
 */
export async function getRestaurantsByCountry(country) {
  const all = await getCuratedRestaurants();
  return all.filter((r) => r.country === country);
}

const RESERVED_COUNTRY_CHILD_DIRS = new Set(['collections', 'data']);

/**
 * City slugs for a country — MDX hub directories plus any city with curated
 * restaurants.
 *
 * @param {string} country
 * @returns {Promise<string[]>}
 */
export async function getCitySlugsForCountry(country) {
  const fromFs = listSubdirNames(path.join('countries', country)).filter(
    (n) => !RESERVED_COUNTRY_CHILD_DIRS.has(n)
  );
  const fromData = await getCuratedCitySlugs(country);
  return [...new Set([...fromFs, ...fromData])].sort();
}

/**
 * Country slugs with MDX content or curated restaurants.
 *
 * @returns {Promise<string[]>}
 */
export async function getCountrySlugs() {
  const fromFs = listSubdirNames('countries');
  const fromData = await getCuratedCountrySlugs();
  return [...new Set([...fromFs, ...fromData])].sort();
}
