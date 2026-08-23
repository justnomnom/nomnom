/**
 * PostgREST name recall for article matching. No unaccent() SQL.
 */

import { normalizeName } from './pick-restaurant-match';

const RECALL_LIMIT = 25;
const NAME_CONCURRENCY = 5;
const SELECT = 'id, name, address, home_city:cities!restaurants_municipality_id_fkey ( name )';

/**
 * Escape `%` and `_` so they are literals in ilike patterns.
 * @param {string} value
 */
export function escapeIlike(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * @param {unknown} row
 */
function toCandidate(row) {
  if (!row?.id || !row?.name) return null;
  return {
    id: row.id,
    name: row.name,
    address: typeof row.address === 'string' ? row.address : '',
    city: row.home_city?.name || '',
  };
}

/**
 * @param {{ from: Function }} supabase
 * @param {string} columnFilter
 */
async function ilikeName(supabase, columnFilter) {
  const { data, error } = await supabase
    .from('restaurants')
    .select(SELECT)
    .ilike('name', columnFilter)
    .limit(RECALL_LIMIT);
  if (error) throw new Error(error.message);
  return Array.isArray(data) ? data : [];
}

/**
 * Two ilike queries (raw + normalizeName), merge by id, cap 25.
 * @param {{ from: Function }} supabase
 * @param {string} name
 */
export async function recallRestaurantsByName(supabase, name) {
  const raw = typeof name === 'string' ? name.trim() : '';
  if (!raw) return [];
  const stripped = normalizeName(raw);
  const patterns = [`%${escapeIlike(raw)}%`];
  if (stripped && stripped !== raw.toLowerCase()) {
    patterns.push(`%${escapeIlike(stripped)}%`);
  }

  const batches = await Promise.all(patterns.map((pattern) => ilikeName(supabase, pattern)));
  const byId = new Map();
  batches.flat().forEach((row) => {
    const candidate = toCandidate(row);
    if (candidate && !byId.has(candidate.id)) byId.set(candidate.id, candidate);
  });
  return [...byId.values()].slice(0, RECALL_LIMIT);
}

/**
 * Run an async mapper over `items`, at most `limit` in flight at once.
 * @template T, R
 * @param {T[]} items
 * @param {number} limit
 * @param {(item: T, index: number) => Promise<R>} fn
 * @returns {Promise<R[]>}
 */
export async function mapPool(items, limit, fn) {
  const list = Array.isArray(items) ? items : [];
  const batchSize = Math.max(1, limit);
  const out = [];
  for (let start = 0; start < list.length; start += batchSize) {
    const batch = list.slice(start, start + batchSize);
    // eslint-disable-next-line no-await-in-loop -- intentional: cap concurrency
    const results = await Promise.all(batch.map((item, j) => fn(item, start + j)));
    out.push(...results);
  }
  return out;
}

export const ARTICLE_LIST_NAME_CONCURRENCY = NAME_CONCURRENCY;
