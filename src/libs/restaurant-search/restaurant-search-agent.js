import { z } from 'zod';
import { generateObject } from 'ai';

import { qwenJsonChat } from 'src/libs/restaurant-ingest/qwen-json-chat';
import { attachOpeningStatusToRows } from 'src/libs/restaurant/opening-hours';
import { runTieredTagSearch } from 'src/libs/restaurant-search/restaurant-search-tiers';
import { scoreRow, filterSlugs } from 'src/libs/restaurant-search/restaurant-search-scoring';
import { slimRestaurantRowsMetadata } from 'src/libs/restaurant/slim-restaurant-card-metadata';
import { promoteExactQueryTags } from 'src/libs/restaurant-search/restaurant-search-promote-tags';
import {
  resolveRestaurantSearchProvider,
  getRestaurantSearchLanguageModel,
} from 'src/libs/restaurant-search/restaurant-search-llm';

export { scoreRow, filterSlugs, ratingFromRow } from 'src/libs/restaurant-search/restaurant-search-scoring';

const FETCH_LIMIT = 120;

const vibeKeySchema = z.enum(['date', 'friends', 'cheap', 'corporate']).nullable();
const categoryKeySchema = z.enum(['daily', 'coffee', 'hidden', 'datecat']).nullable();

/** Zod schema for LLM structured output (also used for typing). */
export const restaurantSearchPlanSchema = z.object({
  mustTagSlugs: z
    .array(z.string())
    .describe('Highest-priority tag slugs from the catalog only; empty if none apply'),
  shouldTagSlugs: z
    .array(z.string())
    .describe('Secondary tag slugs from the catalog; used when must is empty or to boost ranking'),
  matchAllMust: z
    .boolean()
    .describe(
      'If true and multiple must tags, restaurant must have all must tags; if false, any must tag matches'
    ),
  freeTextSearch: z
    .string()
    .nullable()
    .describe('Short substring for name/address/metadata search, or null'),
  minRating: z.number().min(0).max(5).nullable().describe('Minimum rating 0-5, or null'),
  openNow: z
    .boolean()
    .nullable()
    .describe(
      'True only when the query asks for somewhere open right now ("open now", "still open", ' +
        '"somewhere open near X"). Null for any query that does not mention being open — a ' +
        'general search must not be silently narrowed to whatever happens to be open.'
    ),
  vibeKey: vibeKeySchema.describe('Discover vibe stripe key, or null'),
  categoryKey: categoryKeySchema.describe(
    'Discover category chip key; use daily for no category filter'
  ),
  reasoning: z.string().optional().describe('Brief note for debugging'),
});

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string[]} restaurantIds
 * @returns {Promise<Map<string, string[]>>}
 */
async function fetchTagSlugsByRestaurantIds(supabase, restaurantIds) {
  const map = new Map();
  if (!restaurantIds.length) return map;
  const { data, error } = await supabase
    .from('restaurant_tags')
    .select('restaurant_id, tags(slug)')
    .in('restaurant_id', restaurantIds);
  if (error) {
    console.warn('[restaurant-search-agent] fetchTagSlugsByRestaurantIds', error);
    return map;
  }
  (data ?? []).forEach((row) => {
    const id = row.restaurant_id != null ? String(row.restaurant_id) : null;
    const slug =
      row.tags && typeof row.tags === 'object' && 'slug' in row.tags ? String(row.tags.slug) : null;
    if (id && slug) {
      const list = map.get(id) ?? [];
      list.push(slug);
      map.set(id, list);
    }
  });
  return map;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} localityId — viewer home locality (`users.home_locality_id`)
 * @param {object} p
 * @param {string[] | null} p.tagSlugs
 * @param {boolean} p.matchAll
 * @param {string | null} p.search
 * @param {number | null} p.minRating
 * @param {string | null} p.vibeKey
 * @param {string | null} p.categoryKey
 * @param {boolean | null} [p.openNow]
 * @param {number} [p.limit]
 * @param {number | null} [p.refLat]
 * @param {number | null} [p.refLng]
 */
async function rpcHomeLocality(supabase, localityId, p) {
  const { data, error } = await supabase.rpc('restaurants_for_municipality', {
    p_home_locality_id: localityId,
    p_limit: p.limit ?? FETCH_LIMIT,
    p_tag_slugs: p.tagSlugs?.length ? p.tagSlugs : null,
    p_match_all: Boolean(p.matchAll),
    p_search: p.search && p.search.trim() ? p.search.trim() : null,
    p_min_rating:
      p.minRating != null && typeof p.minRating === 'number' && Number.isFinite(p.minRating)
        ? p.minRating
        : null,
    p_vibe_key: p.vibeKey && p.vibeKey.trim() ? p.vibeKey.trim() : null,
    p_category_key:
      !p.categoryKey || p.categoryKey === 'daily' ? null : String(p.categoryKey).trim(),
    p_ref_lat:
      p.refLat != null && typeof p.refLat === 'number' && Number.isFinite(p.refLat)
        ? p.refLat
        : null,
    p_ref_lng:
      p.refLng != null && typeof p.refLng === 'number' && Number.isFinite(p.refLng)
        ? p.refLng
        : null,
    // Only ever narrows when the plan explicitly asked for it. `false` and `null` are both
    // sent as null so a plan that omitted openNow cannot accidentally filter.
    p_open_now: p.openNow === true ? true : null,
  });
  if (error) throw new Error(error.message);
  return /** @type {Array<Record<string, unknown>>} */ (
    slimRestaurantRowsMetadata(attachOpeningStatusToRows(data))
  );
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {object} bbox
 * @param {object} p
 */
/** ~10–13 km padding around the user for home-locality scoped distance fallback */
const LAST_RESORT_BBOX_PAD_DEG = 0.12;

async function rpcBbox(supabase, bbox, p) {
  const { data, error } = await supabase.rpc('restaurants_in_bbox', {
    west: bbox.west,
    south: bbox.south,
    east: bbox.east,
    north: bbox.north,
    p_home_locality_id: bbox.homeLocalityId ?? null,
    p_limit: p.limit ?? 200,
    p_tag_slugs: p.tagSlugs?.length ? p.tagSlugs : null,
    p_match_all: Boolean(p.matchAll),
    p_search: p.search && p.search.trim() ? p.search.trim() : null,
    p_min_rating:
      p.minRating != null && typeof p.minRating === 'number' && Number.isFinite(p.minRating)
        ? p.minRating
        : null,
    p_sort: p.sort ?? 'relevance',
    p_ref_lat: p.refLat ?? null,
    p_ref_lng: p.refLng ?? null,
    p_open_now: p.openNow === true ? true : null,
  });
  if (error) throw new Error(error.message);
  return /** @type {Array<Record<string, unknown>>} */ (
    slimRestaurantRowsMetadata(attachOpeningStatusToRows(data))
  );
}

/**
 * Broad, unfiltered results: by distance from the user when lat/lng are known, otherwise default home-locality feed.
 *
 * @param {object} args
 * @param {import('@supabase/supabase-js').SupabaseClient} args.supabase
 * @param {{ type: 'locality', localityId: string } | { type: 'bbox', west: number, south: number, east: number, north: number, homeLocalityId?: string | null }} args.scope
 * @param {number | null | undefined} args.userLat
 * @param {number | null | undefined} args.userLng
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function fetchLastResortRestaurants({ supabase, scope, userLat, userLng }) {
  const hasPos =
    typeof userLat === 'number' &&
    typeof userLng === 'number' &&
    Number.isFinite(userLat) &&
    Number.isFinite(userLng);

  if (scope.type === 'bbox') {
    const cx = (scope.west + scope.east) / 2;
    const cy = (scope.south + scope.north) / 2;
    const refLat = hasPos ? userLat : cy;
    const refLng = hasPos ? userLng : cx;
    return rpcBbox(
      supabase,
      {
        west: scope.west,
        south: scope.south,
        east: scope.east,
        north: scope.north,
        homeLocalityId: scope.homeLocalityId ?? null,
      },
      {
        tagSlugs: null,
        matchAll: false,
        search: null,
        minRating: null,
        sort: 'distance',
        refLat,
        refLng,
        limit: 200,
      }
    );
  }

  if (hasPos) {
    const rows = await rpcBbox(
      supabase,
      {
        west: userLng - LAST_RESORT_BBOX_PAD_DEG,
        south: userLat - LAST_RESORT_BBOX_PAD_DEG,
        east: userLng + LAST_RESORT_BBOX_PAD_DEG,
        north: userLat + LAST_RESORT_BBOX_PAD_DEG,
        homeLocalityId: scope.localityId,
      },
      {
        tagSlugs: null,
        matchAll: false,
        search: null,
        minRating: null,
        sort: 'distance',
        refLat: userLat,
        refLng: userLng,
        limit: FETCH_LIMIT,
      }
    );
    if (rows.length) return rows;
  }

  return rpcHomeLocality(supabase, scope.localityId, {
    tagSlugs: null,
    matchAll: false,
    search: null,
    minRating: null,
    vibeKey: null,
    categoryKey: null,
    limit: FETCH_LIMIT,
    refLat: hasPos ? userLat : null,
    refLng: hasPos ? userLng : null,
  });
}

/**
 * Tiered home-locality fetch + re-rank.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} localityId — viewer home locality (`users.home_locality_id`)
 * @param {z.infer<typeof restaurantSearchPlanSchema>} plan
 * @param {Set<string>} allowedSlugs
 * @param {boolean} useVibeCategory
 */
async function executeHomeLocalityPlan(supabase, localityId, plan, allowedSlugs, useVibeCategory) {
  const must = filterSlugs(plan.mustTagSlugs, allowedSlugs);
  const should = filterSlugs(plan.shouldTagSlugs, allowedSlugs);
  const search =
    plan.freeTextSearch && String(plan.freeTextSearch).trim()
      ? String(plan.freeTextSearch).trim()
      : null;
  const minRating =
    plan.minRating != null && typeof plan.minRating === 'number' && Number.isFinite(plan.minRating)
      ? plan.minRating
      : null;

  const vibeKey =
    useVibeCategory &&
    plan.vibeKey &&
    ['date', 'friends', 'cheap', 'corporate'].includes(plan.vibeKey)
      ? plan.vibeKey
      : null;
  const categoryKey =
    useVibeCategory &&
    plan.categoryKey &&
    ['daily', 'coffee', 'hidden', 'datecat'].includes(plan.categoryKey)
      ? plan.categoryKey
      : null;

  const run = async (tagSlugs, ma, mr) =>
    rpcHomeLocality(supabase, localityId, {
      tagSlugs: tagSlugs?.length ? tagSlugs : null,
      matchAll: ma,
      search,
      minRating: mr,
      vibeKey,
      categoryKey,
      openNow: plan.openNow === true,
      limit: FETCH_LIMIT,
    });

  const rows = await runTieredTagSearch({
    must,
    should,
    minRating,
    matchAllMust: plan.matchAllMust,
    run,
  });

  const ids = rows.map((r) => (r.id != null ? String(r.id) : '')).filter(Boolean);
  const slugMap = await fetchTagSlugsByRestaurantIds(supabase, ids);
  const sorted = [...rows].sort(
    (a, b) => scoreRow(b, must, should, slugMap) - scoreRow(a, must, should, slugMap)
  );
  return sorted;
}

/**
 * Tiered bbox fetch + re-rank (no vibe/category RPC params).
 */
async function executeBboxPlan(supabase, bbox, plan, allowedSlugs, sortOpts) {
  const must = filterSlugs(plan.mustTagSlugs, allowedSlugs);
  const should = filterSlugs(plan.shouldTagSlugs, allowedSlugs);
  const search =
    plan.freeTextSearch && String(plan.freeTextSearch).trim()
      ? String(plan.freeTextSearch).trim()
      : null;
  const minRating =
    plan.minRating != null && typeof plan.minRating === 'number' && Number.isFinite(plan.minRating)
      ? plan.minRating
      : null;

  let sort = 'relevance';
  if (search) {
    sort = 'relevance';
  } else if (sortOpts?.sort === 'distance') {
    sort = 'distance';
  }

  const run = async (tagSlugs, ma, mr) =>
    rpcBbox(supabase, bbox, {
      tagSlugs: tagSlugs?.length ? tagSlugs : null,
      matchAll: ma,
      search,
      minRating: mr,
      sort,
      refLat: sort === 'distance' ? (sortOpts?.refLat ?? null) : null,
      refLng: sort === 'distance' ? (sortOpts?.refLng ?? null) : null,
      openNow: plan.openNow === true,
      limit: 200,
    });

  const rows = await runTieredTagSearch({
    must,
    should,
    minRating,
    matchAllMust: plan.matchAllMust,
    run,
  });

  const ids = rows.map((r) => (r.id != null ? String(r.id) : '')).filter(Boolean);
  const slugMap = await fetchTagSlugsByRestaurantIds(supabase, ids);
  const sorted = [...rows].sort(
    (a, b) => scoreRow(b, must, should, slugMap) - scoreRow(a, must, should, slugMap)
  );
  return sorted;
}

const VIBE_KEYS = ['date', 'friends', 'cheap', 'corporate'];
const CATEGORY_KEYS = ['daily', 'coffee', 'hidden', 'datecat'];

/**
 * Coerce a raw JSON object (from a non-AI-SDK path that can't enforce the zod schema) into the
 * exact `restaurantSearchPlanSchema` shape. Downstream execution guards types again, but this keeps
 * the plan well-formed regardless of what the model returned.
 *
 * @param {unknown} raw
 * @returns {z.infer<typeof restaurantSearchPlanSchema>}
 */
function normalizeRawSearchPlan(raw) {
  const obj = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {};
  const toSlugArray = (v) =>
    Array.isArray(v) ? [...new Set(v.map((s) => String(s).trim()).filter(Boolean))] : [];
  const ft =
    typeof obj.freeTextSearch === 'string' && obj.freeTextSearch.trim()
      ? obj.freeTextSearch.trim()
      : null;
  const minRating =
    typeof obj.minRating === 'number' && Number.isFinite(obj.minRating)
      ? Math.max(0, Math.min(5, obj.minRating))
      : null;
  return {
    mustTagSlugs: toSlugArray(obj.mustTagSlugs),
    shouldTagSlugs: toSlugArray(obj.shouldTagSlugs),
    matchAllMust: Boolean(obj.matchAllMust),
    freeTextSearch: ft,
    minRating,
    // Only a literal `true` narrows the search. Anything else — absent, null, the string
    // "false", a model that misunderstood the field — must leave the result set alone.
    openNow: obj.openNow === true ? true : null,
    vibeKey: VIBE_KEYS.includes(/** @type {string} */ (obj.vibeKey))
      ? /** @type {any} */ (obj.vibeKey)
      : null,
    categoryKey: CATEGORY_KEYS.includes(/** @type {string} */ (obj.categoryKey))
      ? /** @type {any} */ (obj.categoryKey)
      : 'daily',
  };
}

/**
 * Qwen (DashScope / OpenRouter) plan generation via the same raw `response_format: json_object`
 * helper restaurant ingest uses — see the note on `getRestaurantSearchLanguageModel`. Model falls
 * back to `RESTAURANT_SEARCH_QWEN_MODEL` → `QWEN_MODEL` (the ingest model).
 *
 * @param {{ system: string, prompt: string }} args
 * @returns {Promise<z.infer<typeof restaurantSearchPlanSchema>>}
 */
async function generateSearchPlanWithQwen({ system, prompt }) {
  const jsonSystem = `${system}

Respond with ONLY a JSON object (no prose, no markdown) with exactly these keys:
{"mustTagSlugs": string[], "shouldTagSlugs": string[], "matchAllMust": boolean, "freeTextSearch": string|null, "minRating": number|null, "openNow": boolean|null, "vibeKey": "date"|"friends"|"cheap"|"corporate"|null, "categoryKey": "daily"|"coffee"|"hidden"|"datecat"}`;

  const raw = await qwenJsonChat({
    system: jsonSystem,
    user: prompt,
    model: process.env.RESTAURANT_SEARCH_QWEN_MODEL || undefined,
    temperature: 0.1,
    maxTokens: 512,
    logTag: 'restaurant-search-agent:qwen',
  });
  if (!raw) throw new Error('Qwen returned no search plan');
  return normalizeRawSearchPlan(raw);
}

/**
 * @param {object} args
 * @param {string} args.userMessage
 * @param {Array<{ slug: string, label: string, category: string }>} args.tagsCatalog
 * @param {string | null | undefined} args.providerOverride
 */
export async function mapUserQueryToSearchPlan({ userMessage, tagsCatalog, providerOverride }) {
  const provider = resolveRestaurantSearchProvider(providerOverride ?? null);
  const catalog = tagsCatalog ?? [];
  const catalogLines = catalog.map((t) => `${t.slug} (${t.label}) [${t.category}]`);
  const system = `You map the user's restaurant search request to a structured search plan for Portugal.
Use ONLY tag slugs that appear in the catalog lines below. If unsure, use fewer tags rather than inventing slugs.
mustTagSlugs: what the user clearly requires. If a word in the request exactly matches a catalog tag label or slug (e.g. a cuisine like "ramen", "sushi", "japanese"), you MUST put that slug in mustTagSlugs rather than freeTextSearch. shouldTagSlugs: optional boosts. matchAllMust: true if multiple must tags should all apply.
freeTextSearch: short phrase for substring match on names/metadata, or null.
minRating: only if user asks for highly rated places (e.g. 4+).
openNow: true ONLY when the request is about being open right now ("open now", "still open", "somewhere open near Cais do Sodré", "anywhere open at this hour"). Otherwise null. Do not infer it from "tonight" or "for dinner" — a general search must not be narrowed to whatever happens to be open.
vibeKey: date|friends|cheap|corporate when the user clearly matches that Discover vibe, else null.
categoryKey: daily (default/no filter), coffee, hidden, or datecat when clearly matching those Discover categories, else daily.
Return valid JSON matching the schema.`;

  const prompt = `Catalog (slug (label) [category]):\n${catalogLines.join('\n')}\n\nUser request:\n${userMessage}`;

  let object;
  if (provider === 'qwen') {
    object = await generateSearchPlanWithQwen({ system, prompt });
  } else {
    const model = getRestaurantSearchLanguageModel({ providerOverride });
    ({ object } = await generateObject({
      model,
      schema: restaurantSearchPlanSchema,
      system,
      prompt,
      experimental_telemetry: {
        isEnabled: true,
        functionId: 'restaurant_search_plan',
        recordInputs: true,
        recordOutputs: true,
      },
    }));
  }

  // Deterministically rescue exact cuisine/dish mentions the LLM left out of the tag fields, so
  // the Map filter UI reliably reflects what was searched (e.g. "ramen" → the `ramen` tag chip).
  return promoteExactQueryTags(userMessage, object, catalog);
}

/**
 * @param {object} args
 * @param {object} args.plan — structured plan from `mapUserQueryToSearchPlan`
 * @param {import('@supabase/supabase-js').SupabaseClient} args.supabase
 * @param {{ type: 'locality', localityId: string } | { type: 'bbox', west: number, south: number, east: number, north: number, homeLocalityId?: string | null }} args.scope
 * @param {Set<string>} args.allowedSlugs
 * @param {{ sort?: 'relevance' | 'distance', refLat?: number | null, refLng?: number | null }} [args.bboxSort]
 */
export async function executeSearchPlan({ plan, supabase, scope, allowedSlugs, bboxSort }) {
  if (scope.type === 'locality') {
    return executeHomeLocalityPlan(supabase, scope.localityId, plan, allowedSlugs, true);
  }
  return executeBboxPlan(
    supabase,
    {
      west: scope.west,
      south: scope.south,
      east: scope.east,
      north: scope.north,
      homeLocalityId: scope.homeLocalityId ?? null,
    },
    plan,
    allowedSlugs,
    bboxSort
  );
}
