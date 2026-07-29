/**
 * Extracts community-consensus signals from a restaurant's user reviews using
 * Qwen via DashScope (shared `qwenJsonChat` helper). ~3x cheaper than gpt-4o-mini
 * for this input-heavy summarization workload.
 *
 * Idempotent across re-ingests: hashes the review payload and short-circuits
 * (returns null, route preserves prior consensus via metadata spread) when the
 * input hash matches the last successful run. On re-ingest with a changed sample,
 * also skips when fewer than RESTAURANT_INGEST_MIN_NEW_REVIEWS_FOR_AI new reviews
 * appear (compared to the prior sample, or via Google review_count delta).
 *
 * Fails open: returns null when the API key is missing, no reviews are present,
 * the request errors or times out, or the response is unparseable.
 */

import { createHash } from 'crypto';

import { RESTAURANT_INGEST_MIN_NEW_REVIEWS_FOR_AI } from 'src/config-global';

import { qwenJsonChat } from './qwen-json-chat';
import { countNewReviewsSincePrior } from './review-sample-diff';

const MAX_REVIEWS_USED = 25;
const MAX_REVIEW_CHARS = 600;
const MAX_BULLETS = 6;
const MAX_BULLET_CHARS = 140;

/**
 * @param {unknown} v
 * @returns {string | null}
 */
function trimToNull(v, max = MAX_BULLET_CHARS) {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max) : t;
}

/**
 * @param {unknown} arr
 * @returns {string[]}
 */
function normalizeBulletArray(arr) {
  if (!Array.isArray(arr)) return [];
  const seen = new Set();
  return arr.reduce((out, item) => {
    if (out.length >= MAX_BULLETS) return out;
    const s = trimToNull(item);
    if (!s) return out;
    const key = s.toLowerCase();
    if (seen.has(key)) return out;
    seen.add(key);
    return [...out, s];
  }, /** @type {string[]} */ ([]));
}

/**
 * @param {Array<{ text: string | null, rating: number | null }>} reviews
 * @returns {string}
 */
function formatReviewsForPrompt(reviews) {
  return reviews
    .map((r, i) => {
      const rating = r.rating != null ? `[${r.rating}★] ` : '';
      const text = (r.text || '').replace(/\s+/g, ' ').slice(0, MAX_REVIEW_CHARS);
      return `${i + 1}. ${rating}${text}`;
    })
    .join('\n');
}

/**
 * Stable, content-only hash. Used to detect whether reviews changed between
 * ingests so we can skip the (paid) LLM call when they didn't. Includes the
 * mentioned_in_reviews aggregate when present — changes there should bust the
 * cache (different dish list → different output even if reviews unchanged).
 * @param {Array<{ text: string | null, rating: number | null }>} reviews
 * @param {Array<{ label: string, mentions: number }> | null} mentionedInReviews
 * @returns {string}
 */
function hashReviews(reviews, mentionedInReviews) {
  const canonical = JSON.stringify({
    // Prompt-contract version: bump to force a recompute for already-ingested
    // places (v2 = mention labels are classified into dishes vs venue topics).
    v: 2,
    reviews: reviews.map((r) => ({ text: r.text || '', rating: r.rating ?? null })),
    mentioned: Array.isArray(mentionedInReviews)
      ? mentionedInReviews.map((m) => [m.label, m.mentions])
      : null,
  });
  return createHash('sha1').update(canonical).digest('hex');
}

/**
 * @typedef {{
 *   summary: string | null,
 *   strengths: string[],
 *   weaknesses: string[],
 *   signature_dishes: Array<{ label: string, mentions: number }>,
 *   topic_labels: Array<{ label: string, mentions: number }>,
 *   reviews_analyzed: number,
 *   model: string,
 *   generated_at: string,
 *   input_hash: string,
 * }} ReviewConsensus
 */

const MAX_SIGNATURE_DISHES = 10;

/**
 * @param {unknown} arr
 * @param {number} reviewsCount
 * @returns {Array<{ label: string, mentions: number }>}
 */
function normalizeSignatureDishes(arr, reviewsCount) {
  if (!Array.isArray(arr)) return [];
  const seen = new Set();
  /** @type {Array<{ label: string, mentions: number }>} */
  const out = [];
  arr.forEach((item) => {
    if (out.length >= MAX_SIGNATURE_DISHES) return;
    /** @type {{ label?: string, mentions?: unknown } | null} */
    let entry = null;
    if (typeof item === 'string') {
      entry = { label: item, mentions: 1 };
    } else if (item && typeof item === 'object') {
      const o = /** @type {Record<string, unknown>} */ (item);
      entry = {
        label: typeof o.label === 'string' ? o.label : '',
        mentions: o.mentions,
      };
    }
    if (!entry) return;
    const label = trimToNull(entry.label, 80);
    if (!label) return;
    const key = label.toLowerCase();
    if (seen.has(key)) return;
    const rawCount =
      typeof entry.mentions === 'number'
        ? entry.mentions
        : parseInt(String(entry.mentions ?? ''), 10);
    const safeMax = Math.max(1, reviewsCount || 1);
    const mentions =
      Number.isFinite(rawCount) && rawCount > 0 ? Math.min(Math.floor(rawCount), safeMax) : 1;
    seen.add(key);
    out.push({ label, mentions });
  });
  // Sort by mentions desc, then by original insertion order (stable).
  out.sort((a, b) => b.mentions - a.mentions);
  return out;
}

/**
 * @param {{
 *   name: string,
 *   reviews: Array<{ text: string | null, rating: number | null }>,
 *   rating?: number | null,
 *   primaryCategory?: string | null,
 *   priorConsensus?: { input_hash?: unknown } | null,
 *   priorReviews?: Array<{ text?: string | null, rating?: number | null }> | null,
 *   currentReviewCount?: number | null,
 *   priorReviewCount?: number | null,
 *   mentionedInReviews?: Array<{ label: string, mentions: number }> | null,
 * }} input
 * @returns {Promise<ReviewConsensus | null>}
 */
export async function extractReviewConsensus(input) {
  const usableReviews = (input.reviews || [])
    .filter((r) => r && typeof r.text === 'string' && r.text.trim().length >= 10)
    .slice(0, MAX_REVIEWS_USED);

  if (usableReviews.length < 3) return null;

  // Google's mentioned_in_reviews is aggregated across ALL reviews (not just
  // our 25-review sample), so its counts are authoritative — but its labels are
  // review TOPICS, not dishes: ambience/service/value chips ("cozy space",
  // "live music") sit next to real dishes. Ask the LLM (same call) which labels
  // are actual dishes; the rest are surfaced as topic_labels for the tag layer.
  const realMentions = Array.isArray(input.mentionedInReviews) ? input.mentionedInReviews : null;
  const haveRealMentions = !!(realMentions && realMentions.length);

  const inputHash = hashReviews(usableReviews, realMentions);
  const priorHash =
    input.priorConsensus && typeof input.priorConsensus.input_hash === 'string'
      ? input.priorConsensus.input_hash
      : null;
  // Reviews unchanged since last successful run → skip the LLM call. The
  // ingest route preserves the prior consensus via `{ ...priorMeta }` spread.
  if (priorHash && priorHash === inputHash) return null;

  // Re-ingest with a changed sample but too few new reviews → keep prior consensus
  // and skip the paid LLM call (see RESTAURANT_INGEST_MIN_NEW_REVIEWS_FOR_AI).
  if (input.priorConsensus) {
    const newReviews = countNewReviewsSincePrior(
      usableReviews,
      input.priorReviews,
      input.currentReviewCount,
      input.priorReviewCount
    );
    if (newReviews < RESTAURANT_INGEST_MIN_NEW_REVIEWS_FOR_AI) return null;
  }

  const systemLines = [
    'You analyze restaurant reviews and surface the community consensus — what reviewers REPEATEDLY agree on.',
    'Respond with ONLY valid JSON in this exact shape:',
    haveRealMentions
      ? '{"summary": string, "strengths": string[], "weaknesses": string[], "dish_labels": string[]}'
      : '{"summary": string, "strengths": string[], "weaknesses": string[], "signature_dishes": {"label": string, "mentions": number}[]}',
    'Rules:',
    '- Summary: ONE sentence (≤180 chars) describing what locals/visitors collectively say about this place.',
    `- strengths/weaknesses: at most ${MAX_BULLETS} short bullets (≤${MAX_BULLET_CHARS} chars each).`,
    '- ONLY include points mentioned by MULTIPLE reviewers — ignore one-off complaints/praise.',
    '- strengths/weaknesses: what is consistently praised/criticized (food quality, service, vibe, value, wait times, noise).',
  ];
  if (haveRealMentions) {
    systemLines.push(
      '- dish_labels: from the provided mention_labels list, return ONLY the labels that are actual food or drink items (dishes, drinks, desserts). EXCLUDE venue/ambience/service/value topics (e.g. "cozy space", "environment", "live music", "stars", "prices", "service"). Meal names like "lunch"/"almoço" are not dishes. Copy each kept label verbatim from mention_labels. Return [] if none are dishes.'
    );
  } else {
    systemLines.push(
      '- signature_dishes: specific dishes named by AT LEAST ONE reviewer. For each dish, `mentions` = exact count of how many of the provided reviews explicitly named it (1 if only one review mentioned it). Sort by mentions descending. Cap at 10 dishes. Use the dish name only (e.g. "Biryani", not "delicious biryani").'
    );
  }
  systemLines.push(
    '- Write in the same language the majority of reviews use. Do not translate.',
    '- Be neutral and concrete. No marketing language. No emojis.',
    '- If reviews are too sparse or contradictory to form a consensus, return empty arrays and a brief summary saying so.'
  );
  const system = systemLines.join('\n');

  const parsed = await qwenJsonChat({
    system,
    user: {
      restaurant_name: input.name,
      primary_category: input.primaryCategory || null,
      aggregate_rating: input.rating ?? null,
      reviews_count: usableReviews.length,
      ...(haveRealMentions ? { mention_labels: realMentions.map((m) => m.label) } : {}),
      reviews: formatReviewsForPrompt(usableReviews),
    },
    // Slightly smaller output when dishes come from mention classification
    // (a label subset) instead of free-form extraction.
    maxTokens: haveRealMentions ? 800 : 1024,
    logTag: 'extractReviewConsensus',
  });

  if (!parsed) return null;

  const summary = trimToNull(parsed.summary, 240);
  const strengths = normalizeBulletArray(parsed.strengths);
  const weaknesses = normalizeBulletArray(parsed.weaknesses);

  // Prefer real aggregated counts when present; fall back to LLM-derived counts.
  /** @type {Array<{ label: string, mentions: number }>} */
  let signatureDishes;
  /** @type {Array<{ label: string, mentions: number }>} */
  let topicLabels = [];
  if (haveRealMentions) {
    if (Array.isArray(parsed.dish_labels)) {
      const dishKeys = new Set(
        parsed.dish_labels
          .filter((s) => typeof s === 'string')
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
      );
      const isDish = (m) => dishKeys.has(m.label.trim().toLowerCase());
      signatureDishes = normalizeSignatureDishes(
        realMentions.filter(isDish),
        Number.MAX_SAFE_INTEGER
      );
      topicLabels = normalizeSignatureDishes(
        realMentions.filter((m) => !isDish(m)),
        Number.MAX_SAFE_INTEGER
      );
    } else {
      // Model ignored the classification ask — keep the pre-v2 behavior rather
      // than guessing which labels are food.
      signatureDishes = normalizeSignatureDishes(realMentions, Number.MAX_SAFE_INTEGER);
    }
  } else {
    signatureDishes = normalizeSignatureDishes(parsed.signature_dishes, usableReviews.length);
  }

  if (!summary && !strengths.length && !weaknesses.length) return null;

  // Model name lives in env; surface what actually answered for auditability.
  const model = process.env.QWEN_MODEL?.trim() || 'qwen-turbo';

  return {
    summary,
    strengths,
    weaknesses,
    signature_dishes: signatureDishes,
    topic_labels: topicLabels,
    reviews_analyzed: usableReviews.length,
    model,
    generated_at: new Date().toISOString(),
    input_hash: inputHash,
  };
}
