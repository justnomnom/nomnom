/**
 * Curated restaurants for the public content hubs, read from Supabase.
 *
 * Replaces `content/data/restaurants.json`. Hub pages are curated-only: a row
 * appears here when it has a `slug` (its URL key) and authored copy under
 * `metadata.editorial`. Ingested restaurants carry a NULL slug and never get a
 * hub page, which keeps every published page worth landing on instead of
 * emitting thousands of thin ones as the catalogue scales.
 *
 * The hub's country/city segments come from `metadata.editorial`, not from the
 * `cities` table: the DB stores the Portuguese municipality name ("Lisboa")
 * while the URL uses the English slug ("lisbon"), and only the authored record
 * knows which hub a restaurant belongs on.
 *
 * Reads use the publishable key with no cookies, because these run at build
 * time inside `generateStaticParams` where there is no request to read.
 */

import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';

import { SUPABASE_API } from 'src/config-global';

/**
 * Deliberately excludes `image_url`: that column exists on production but NOT on
 * dev, so selecting it makes this query fail with PGRST 42703 on one of the two
 * databases. The hero comes from `metadata` instead, which is what the ingest
 * actually writes and is present on both.
 */
const SELECT = `
  id,
  slug,
  name,
  address,
  latitude,
  longitude,
  rating,
  price_level,
  metadata
`;

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
let cachedClient = null;

/**
 * Cookie-less anon client. Safe in `generateStaticParams`, unlike
 * `createSupabaseServerClient`, which awaits `cookies()`.
 */
function contentClient() {
  if (!cachedClient) {
    cachedClient = createClient(SUPABASE_API.url, SUPABASE_API.key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cachedClient;
}

/**
 * @typedef {object} CuratedRestaurant
 * @property {string} id            real `restaurants.id`, usable by app routes
 * @property {string} slug
 * @property {string} name
 * @property {string} country
 * @property {string} city
 * @property {number} rating
 * @property {string[]} categories
 * @property {string[]} influencerSlugs
 * @property {string} shortDescription
 * @property {string | null} heroImage
 * @property {{ lat: number, lng: number }} location
 */

/**
 * Map one `restaurants` row to the hub shape. Exported for unit tests: this is
 * where a malformed or half-curated row gets rejected, and that is worth pinning
 * down without a database round-trip.
 *
 * @param {Record<string, any>} row
 * @returns {CuratedRestaurant | null}
 */
export function mapCuratedRow(row) {
  if (!row || typeof row !== 'object') return null;
  const slug = typeof row.slug === 'string' ? row.slug.trim() : '';
  const name = typeof row.name === 'string' ? row.name.trim() : '';
  if (!slug || !name) return null;

  const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  const ed = meta.editorial && typeof meta.editorial === 'object' ? meta.editorial : {};
  const country = typeof ed.country === 'string' ? ed.country : '';
  const city = typeof ed.city === 'string' ? ed.city : '';
  if (!country || !city) return null;

  const photos = Array.isArray(meta.photos) ? meta.photos.filter((p) => typeof p === 'string') : [];

  return {
    id: String(row.id),
    slug,
    name,
    country,
    city,
    rating: Number.isFinite(row.rating) ? Number(row.rating) : 0,
    categories: Array.isArray(ed.categories) ? ed.categories.filter((c) => typeof c === 'string') : [],
    influencerSlugs: Array.isArray(ed.influencer_slugs)
      ? ed.influencer_slugs.filter((s) => typeof s === 'string')
      : [],
    shortDescription: typeof ed.short_description === 'string' ? ed.short_description : '',
    heroImage:
      typeof meta.image_url === 'string' && meta.image_url ? meta.image_url : (photos[0] ?? null),
    location: {
      lat: Number.isFinite(row.latitude) ? Number(row.latitude) : 0,
      lng: Number.isFinite(row.longitude) ? Number(row.longitude) : 0,
    },
  };
}

/**
 * Every curated restaurant, deduped per render pass.
 *
 * A failure returns `[]` rather than throwing: a hub page that renders without
 * its list is recoverable, a build that dies on a transient network error is
 * not. The error is logged so it does not pass silently.
 *
 * @returns {Promise<CuratedRestaurant[]>}
 */
export const getCuratedRestaurants = cache(async () => {
  if (!SUPABASE_API.url || !SUPABASE_API.key) {
    console.error('[curated-restaurants] Supabase env missing; hubs will render empty');
    return [];
  }
  const { data, error } = await contentClient()
    .from('restaurants')
    .select(SELECT)
    .not('slug', 'is', null)
    .order('name', { ascending: true });

  if (error) {
    console.error('[curated-restaurants]', error);
    return [];
  }
  return (data ?? []).map(mapCuratedRow).filter(Boolean);
});

/**
 * @param {string} slug
 * @returns {Promise<CuratedRestaurant | null>}
 */
export async function getCuratedRestaurantBySlug(slug) {
  if (typeof slug !== 'string' || !slug.trim()) return null;
  const all = await getCuratedRestaurants();
  return all.find((r) => r.slug === slug.trim()) ?? null;
}

/**
 * @param {string} country
 * @param {string} city
 * @param {string} [tag] cuisine/category filter
 * @returns {Promise<CuratedRestaurant[]>}
 */
export async function getCuratedRestaurantsByCity(country, city, tag) {
  const all = await getCuratedRestaurants();
  const inCity = all.filter((r) => r.country === country && r.city === city);
  return tag ? inCity.filter((r) => r.categories.includes(tag)) : inCity;
}

/**
 * @param {string} country
 * @returns {Promise<string[]>}
 */
export async function getCuratedCitySlugs(country) {
  const all = await getCuratedRestaurants();
  return [...new Set(all.filter((r) => r.country === country).map((r) => r.city))].sort();
}

/**
 * @returns {Promise<string[]>}
 */
export async function getCuratedCountrySlugs() {
  const all = await getCuratedRestaurants();
  return [...new Set(all.map((r) => r.country))].sort();
}
