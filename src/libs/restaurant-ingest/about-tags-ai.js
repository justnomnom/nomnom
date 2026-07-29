/**
 * Maps Google `about` facets to tags via Qwen (cheap) + DB vocabulary.
 * Uses Alibaba's DashScope OpenAI-compatible endpoint — ~3x cheaper than
 * gpt-4o-mini for this input-heavy classification workload.
 *
 * Idempotent across re-ingests: hashes the AI inputs (about facets, categories,
 * description, price tier, classified review topics) and short-circuits with
 * `{ skipped: true }` when the hash matches the prior run. The route preserves
 * prior `ingest_tag_slugs` / `ingest_tag_ai` via the `{ ...priorMeta }` spread
 * and skips the DB write of `restaurant_tags` rows entirely on the skip path.
 * Review topics are venue/ambience chips from `review_consensus.topic_labels`
 * (dishes are excluded upstream).
 * @see plan: Google place ingest API
 */

import { createHash } from 'crypto';

import { qwenJsonChat } from './qwen-json-chat';
import { PRICE_TAG_SLUGS } from './map-google-place-payload';

const TAG_CATEGORIES = /** @type {const} */ (['cuisine', 'vibe', 'award', 'price', 'other']);

const MAX_NEW_TAGS = 5;
const MAX_EXISTING_SLUGS_FROM_AI = 15;

/** @type {Set<string>} */
const PRICE_SLUG_SET = new Set(PRICE_TAG_SLUGS);

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @returns {Promise<Array<{ id: string, slug: string, label: string, category: string }>>}
 */
export async function fetchAllTags(admin) {
  const { data, error } = await admin
    .from('tags')
    .select('id, slug, label, category')
    .order('slug');
  if (error) {
    console.error('[fetchAllTags]', error);
    throw new Error(error.message);
  }
  return Array.isArray(data) ? data : [];
}

/**
 * @param {string} slug
 * @returns {boolean}
 */
export function isValidTagSlug(slug) {
  if (!slug || typeof slug !== 'string') return false;
  if (slug.length > 80) return false;
  return /^[a-z0-9_]+$/.test(slug);
}

/**
 * @param {unknown} c
 * @returns {'cuisine' | 'vibe' | 'award' | 'price' | 'other'}
 */
function normalizeCategory(c) {
  if (typeof c !== 'string') return 'other';
  const t = c.trim().toLowerCase();
  return TAG_CATEGORIES.includes(/** @type {any} */ (t)) ? /** @type {any} */ (t) : 'other';
}

/**
 * Stable content hash of the inputs that actually influence the LLM output.
 * Includes the priceSlug so a Google price-tier change invalidates the cache
 * (the route uses priceSlug to seed `ingest_tag_slugs`).
 * @param {{
 *   flattenedAbout: Array<{ groupId: string, groupName: string, option: string }>,
 *   categories: string[],
 *   description: string | null,
 *   priceSlug: string | null,
 *   reviewTopics: string[],
 * }} input
 * @returns {string}
 */
function hashTagInputs(input) {
  const canonical = JSON.stringify({
    about: input.flattenedAbout.map((x) => ({
      g: x.groupId || x.groupName || '',
      o: x.option,
    })),
    categories: [...(input.categories || [])].sort(),
    description: input.description || '',
    priceSlug: input.priceSlug || '',
    topics: [...(input.reviewTopics || [])].sort(),
  });
  return createHash('sha1').update(canonical).digest('hex');
}

/**
 * @typedef {{
 *   skipped: false,
 *   existing_slugs: string[],
 *   new_tags: Array<{ slug: string, label: string, category: string }>,
 *   input_hash: string | null,
 * } | {
 *   skipped: true,
 *   input_hash: string,
 * }} MapAboutToTagsResult
 */

/**
 * @param {{
 *   flattenedAbout: Array<{ groupId: string, groupName: string, option: string }>,
 *   categories: string[],
 *   description: string | null,
 *   priceSlug: string | null,
 *   reviewTopics?: string[],
 *   tags: Array<{ slug: string, label: string, category: string }>,
 *   priorAi?: { input_hash?: unknown } | null,
 * }} input
 * @returns {Promise<MapAboutToTagsResult>}
 */
export async function mapAboutToTagsWithAi(input) {
  const reviewTopics = Array.isArray(input.reviewTopics)
    ? input.reviewTopics.filter((t) => typeof t === 'string' && t.trim()).map((t) => t.trim())
    : [];
  const inputHash = hashTagInputs({
    flattenedAbout: input.flattenedAbout,
    categories: input.categories,
    description: input.description,
    priceSlug: input.priceSlug,
    reviewTopics,
  });

  const priorHash =
    input.priorAi && typeof input.priorAi.input_hash === 'string' ? input.priorAi.input_hash : null;
  // Inputs unchanged since last successful run → reuse prior tags as-is.
  if (priorHash && priorHash === inputHash) {
    return { skipped: true, input_hash: inputHash };
  }

  const aboutLines = input.flattenedAbout.map(
    (x) => `- [${x.groupId || x.groupName || 'group'}] ${x.option}`
  );
  // Drop `category` from vocab payload — the model doesn't need to know it
  // and it's ~33% of vocab token volume. The new_tags response category is
  // still constrained by the system prompt's allowlist.
  const tagJson = input.tags.map((t) => ({ slug: t.slug, label: t.label }));

  const system = [
    'You map Google Maps business "about" attributes to a fixed tag vocabulary for a restaurant app.',
    'Respond with ONLY valid JSON: {"existing_slugs": string[], "new_tags": {"slug": string, "label": string, "category": string}[]}.',
    'existing_slugs: use ONLY slugs from the provided tag_vocabulary list when semantically equivalent (e.g. Casual -> casual).',
    'Do NOT include price-tier tags (budget, moderate, upscale, fine_dining) — those are set separately.',
    `new_tags: propose at most ${MAX_NEW_TAGS} entries only when no existing tag fits. slug: lowercase_snake_case, a-z0-9_. category must be one of: cuisine, vibe, award, price, other — prefer "other" when unsure; avoid "price" for non-tier facets.`,
    `Cap existing_slugs at ${MAX_EXISTING_SLUGS_FROM_AI} total semantic matches; prefer strongest signals (atmosphere, food, service).`,
    'Ignore accessibility or parking unless they map clearly to an existing tag.',
    'review_topics (when present) are recurring topics aggregated from customer reviews. Map venue/ambience/service topics (e.g. "cozy space" -> cozy, "live music") to tags like any other input; IGNORE topics that are specific food or drink items — dishes are handled elsewhere.',
  ].join('\n');

  const parsed = await qwenJsonChat({
    system,
    user: {
      categories: input.categories,
      description_excerpt: input.description ? input.description.slice(0, 500) : null,
      about_enabled_lines: aboutLines,
      ...(reviewTopics.length ? { review_topics: reviewTopics } : {}),
      tag_vocabulary: tagJson,
    },
    maxTokens: 2048,
    timeoutMs: 28_000,
    logTag: 'mapAboutToTagsWithAi',
  });

  if (!parsed) {
    // API call failed — return without input_hash so the route DOESN'T stamp
    // ingest_tag_ai, letting the next ingest retry. Without this, a transient
    // 5xx / 404 (e.g. model slug typo) would permanently hash-skip the place.
    return { skipped: false, existing_slugs: [], new_tags: [], input_hash: null };
  }

  const slugSet = new Set(input.tags.map((t) => t.slug));
  const existingRaw = Array.isArray(parsed.existing_slugs) ? parsed.existing_slugs : [];

  const normalizedExisting = existingRaw
    .filter((s) => typeof s === 'string')
    .map((s) => s.trim().toLowerCase())
    .filter((sl) => slugSet.has(sl) && !PRICE_SLUG_SET.has(sl));

  const existing_slugs = [...new Set(normalizedExisting)].slice(0, MAX_EXISTING_SLUGS_FROM_AI);

  const newRaw = Array.isArray(parsed.new_tags) ? parsed.new_tags : [];

  const new_tags = newRaw
    .map((nt) => {
      if (!nt || typeof nt !== 'object') return null;
      const o = /** @type {Record<string, unknown>} */ (nt);
      const slug = typeof o.slug === 'string' ? o.slug.trim().toLowerCase() : '';
      const label = typeof o.label === 'string' ? o.label.trim() : '';
      if (!isValidTagSlug(slug) || !label) return null;
      if (slugSet.has(slug) || PRICE_SLUG_SET.has(slug)) return null;
      return {
        slug,
        label: label.slice(0, 120),
        category: normalizeCategory(o.category),
      };
    })
    .filter((x) => x != null)
    .filter((x, i, arr) => arr.findIndex((y) => y?.slug === x?.slug) === i)
    .slice(0, MAX_NEW_TAGS);

  return { skipped: false, existing_slugs, new_tags, input_hash: inputHash };
}

/**
 * Fetches just the rows for the given slugs — used after `insertNewTags` to
 * resolve only the newly inserted IDs (vs re-fetching the full tag vocabulary).
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string[]} slugs
 * @returns {Promise<Array<{ id: string, slug: string }>>}
 */
export async function fetchTagsBySlugs(admin, slugs) {
  if (!slugs.length) return [];
  const { data, error } = await admin.from('tags').select('id, slug').in('slug', slugs);
  if (error) {
    console.error('[fetchTagsBySlugs]', error);
    throw new Error(error.message);
  }
  return Array.isArray(data) ? data : [];
}

/**
 * Inserts missing tags; duplicates (23505) ignored.
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {Array<{ slug: string, label: string, category: string }>} newTags
 */
export async function insertNewTags(admin, newTags) {
  if (!newTags.length) return;
  await Promise.all(
    newTags.map((nt) =>
      admin
        .from('tags')
        .insert({
          slug: nt.slug,
          label: nt.label,
          category: nt.category,
          sort_order: 100,
        })
        .then(({ error }) => {
          if (error && error.code !== '23505') {
            console.error('[insertNewTags]', nt.slug, error);
          }
        })
    )
  );
}

/**
 * @param {Map<string, string>} slugToId
 * @param {string[]} slugs
 * @returns {string[]}
 */
export function resolveTagIds(slugToId, slugs) {
  const seen = new Set();
  return slugs.reduce((ids, s) => {
    const id = slugToId.get(s);
    if (!id || seen.has(id)) return ids;
    seen.add(id);
    return [...ids, id];
  }, []);
}

/**
 * @param {Array<{ id: string, slug: string }>} tags
 * @returns {Map<string, string>}
 */
export function buildSlugToIdMap(tags) {
  return new Map(
    tags
      .filter((t) => t?.slug && t?.id)
      .map((t) => /** @type {[string, string]} */ ([t.slug, t.id]))
  );
}
