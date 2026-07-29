import { generateText } from 'ai';

import { ugcContentHash } from 'src/lib/ugc-content-hash';
import { normalizeAppLocale } from 'src/libs/locale-utils';
import { dedupeMustTryDishesByDisplayLabel } from 'src/lib/must-try-dedupe';
import { getRestaurantSearchLanguageModel } from 'src/lib/restaurant-search-llm';

export { ugcContentHash } from 'src/lib/ugc-content-hash';

export {
  mustTryDisplayDedupeKey,
  dedupeMustTryDishesByDisplayLabel,
} from 'src/lib/must-try-dedupe';

/** @typedef {'en' | 'pt'} AppLocale */

const TARGET_NAMES = {
  en: 'English',
  pt: 'Portuguese (Portugal)',
};

const SOURCE_NAMES = {
  en: 'English',
  pt: 'Portuguese',
};

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} contentHash
 * @param {string} targetLocale
 * @returns {Promise<string | null>}
 */
async function lookupTranslationCache(supabase, contentHash, targetLocale) {
  const { data, error } = await supabase
    .from('ugc_translation_cache')
    .select('translated_text')
    .eq('content_hash', contentHash)
    .eq('target_locale', targetLocale)
    .maybeSingle();
  if (error || !data?.translated_text) return null;
  return data.translated_text;
}

/**
 * Writes go through the service-role client, never the caller's.
 *
 * `ugc_translation_cache` is world-readable and its contents are rendered to
 * users as translated dish names, and `upsert_ugc_translation` keys rows by a
 * hash of the source text. Since source texts are public dish names, any caller
 * that can reach the RPC can compute an existing key and overwrite what every
 * user in that locale sees — the hash prevents key forgery, not overwriting. So
 * 20260724122000 revoked EXECUTE from anon and authenticated, leaving this the
 * only write path. Reads stay on the caller's client; the policy allows them.
 *
 * This module is server-only (its sole client-side consumer imports
 * `must-try-dedupe` directly, not through here), so reaching for the admin
 * client does not pull the service-role key into a browser bundle. The import is
 * dynamic because supabase-admin constructs its client at module scope and
 * throws without SUPABASE_SECRET_KEY — a static import would break every unit
 * test that touches this module, none of which write.
 *
 * @param {object} row
 * @param {string} row.source_text
 * @param {string} row.source_locale
 * @param {string} row.target_locale
 * @param {string} row.translated_text
 * @param {string} [row.provider]
 */
async function writeTranslationCache(row) {
  const hash = ugcContentHash(row.source_text, row.source_locale);
  const { supabaseAdminClient } = await import('src/libs/supabase/supabase-admin');
  const { error } = await supabaseAdminClient.rpc('upsert_ugc_translation', {
    p_content_hash: hash,
    p_source_text: row.source_text,
    p_source_locale: row.source_locale,
    p_target_locale: row.target_locale,
    p_translated_text: row.translated_text,
    p_provider: row.provider ?? 'llm',
  });
  if (error) {
    console.warn('[ugc-translate] cache write failed', error.message);
  }
}

/**
 * Machine-translate short UGC (dish names). Falls back to original on failure.
 * Disabled when `UGC_TRANSLATE_ENABLED=false` or no AI key.
 *
 * @param {string} text
 * @param {AppLocale} sourceLocale
 * @param {AppLocale} targetLocale
 */
async function translateWithLlm(text, sourceLocale, targetLocale) {
  if (process.env.UGC_TRANSLATE_ENABLED === 'false') {
    return text;
  }
  try {
    const model = getRestaurantSearchLanguageModel();
    const src = SOURCE_NAMES[sourceLocale] ?? sourceLocale;
    const tgt = TARGET_NAMES[targetLocale] ?? targetLocale;
    const { text: out } = await generateText({
      model,
      prompt: `Translate this restaurant dish or ingredient name from ${src} to ${tgt}. Use the wording diners would see on a menu in the target language (plain name: e.g. rice, bacalhau, nata — not a sentence). Reply with ONLY that name, no quotes or explanation.\n\n${text}`,
      maxOutputTokens: 120,
    });
    const trimmed = (out ?? '').trim();
    return trimmed.length ? trimmed : text;
  } catch (e) {
    console.warn('[ugc-translate] LLM translate failed', e?.message ?? e);
    return text;
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} label
 * @param {string} labelLocale raw locale stored with label
 * @param {AppLocale} viewerLocale
 * @returns {Promise<string>}
 */
export async function resolveUgcDisplayLabel(supabase, label, labelLocale, viewerLocale) {
  const src = normalizeAppLocale(labelLocale);
  const tgt = normalizeAppLocale(viewerLocale);
  if (src === tgt) return label;

  const hash = ugcContentHash(label, src);
  const cached = await lookupTranslationCache(supabase, hash, tgt);
  if (cached) return cached;

  const translated = await translateWithLlm(label, src, tgt);
  if (translated !== label) {
    await writeTranslationCache({
      source_text: label,
      source_locale: src,
      target_locale: tgt,
      translated_text: translated,
      provider: 'llm',
    });
  }
  return translated;
}

/**
 * Normalize a dish name to English for matching / slugging (uses cache + LLM when needed).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} text
 * @param {string} sourceLocale app locale (`en` | `pt` or BCP-like)
 */
export async function toCanonicalEnglishLabel(supabase, text, sourceLocale) {
  const src = normalizeAppLocale(sourceLocale);
  const trimmed = String(text ?? '').trim();
  if (!trimmed) return '';
  if (src === 'en') return trimmed;
  return resolveUgcDisplayLabel(supabase, trimmed, src, 'en');
}

/**
 * Resolve display labels for many UGC strings at once: one batched cache read (chunked to stay
 * under URL limits), then LLM-translate the misses with bounded concurrency. Replaces the per-dish
 * query + LLM fan-out that a large list would otherwise trigger (thousands of concurrent calls).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {Array<{ hash: string, sourceText: string, sourceLocale: AppLocale }>} needs unique cross-locale labels
 * @param {AppLocale} tgt
 * @returns {Promise<Map<string, string>>} content hash → translated text
 */
async function resolveUgcLabelsBatch(supabase, needs, tgt) {
  /** @type {Map<string, string>} */
  const out = new Map();
  if (needs.length === 0) return out;

  // 1. Batched cache read — chunk the content_hash filter so it can't overflow the request URL.
  const CACHE_HASH_CHUNK = 200;
  const hashChunks = [];
  for (let i = 0; i < needs.length; i += CACHE_HASH_CHUNK) {
    hashChunks.push(needs.slice(i, i + CACHE_HASH_CHUNK).map((n) => n.hash));
  }
  const cacheResults = await Promise.all(
    hashChunks.map(async (hashes) => {
      const { data, error } = await supabase
        .from('ugc_translation_cache')
        .select('content_hash, translated_text')
        .in('content_hash', hashes)
        .eq('target_locale', tgt);
      if (error) return [];
      return data ?? [];
    })
  );
  cacheResults.forEach((rows) => {
    rows.forEach((r) => {
      if (r.content_hash && r.translated_text) out.set(r.content_hash, r.translated_text);
    });
  });

  // 2. LLM-translate cache misses in bounded-concurrency batches; write results back to cache.
  const misses = needs.filter((n) => !out.has(n.hash));
  const LLM_CONCURRENCY = 5;
  for (let i = 0; i < misses.length; i += LLM_CONCURRENCY) {
    const batch = misses.slice(i, i + LLM_CONCURRENCY);
    // eslint-disable-next-line no-await-in-loop -- intentional: cap concurrent LLM calls per batch
    await Promise.all(
      batch.map(async (n) => {
        const translated = await translateWithLlm(n.sourceText, n.sourceLocale, tgt);
        out.set(n.hash, translated);
        if (translated !== n.sourceText) {
          await writeTranslationCache({
            source_text: n.sourceText,
            source_locale: n.sourceLocale,
            target_locale: tgt,
            translated_text: translated,
            provider: 'llm',
          });
        }
      })
    );
  }
  return out;
}

/**
 * Adds `must_try_dishes` with `display_label` on each list item; removes raw embed key.
 *
 * Resolves all dish labels through a single batched cache read + bounded LLM concurrency
 * (see {@link resolveUgcLabelsBatch}) instead of a per-dish fan-out, so a large list can't spawn
 * thousands of concurrent translation queries/LLM calls.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {object[]} items
 * @param {AppLocale} viewerLocale
 */
export async function attachMustTryDisplayToListItems(supabase, items, viewerLocale) {
  const raw = items ?? [];
  if (raw.length === 0) return [];
  const tgt = normalizeAppLocale(viewerLocale);

  /** Source text + (normalized) locale for one dish — tag label is canonical English, else raw label. */
  const dishSource = (d) => {
    let tagRow = null;
    if (d.tags && !Array.isArray(d.tags)) {
      tagRow = d.tags;
    } else if (Array.isArray(d.tags) && d.tags.length > 0) {
      tagRow = d.tags[0];
    }
    const useTagLabel = Boolean(d.tag_id && tagRow?.label);
    return {
      sourceText: useTagLabel ? tagRow.label : d.label,
      sourceLocale: normalizeAppLocale(useTagLabel ? 'en' : (d.label_locale ?? 'en')),
    };
  };

  // Pre-sort dishes per item, then collect the unique set of cross-locale labels needing translation.
  const dishesByItem = raw.map((item) =>
    Array.isArray(item.list_item_must_try_dishes)
      ? [...item.list_item_must_try_dishes].sort(
          (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
        )
      : []
  );
  /** @type {Map<string, { hash: string, sourceText: string, sourceLocale: AppLocale }>} */
  const needByHash = new Map();
  dishesByItem.forEach((dishes) => {
    dishes.forEach((d) => {
      const { sourceText, sourceLocale } = dishSource(d);
      if (!sourceText || sourceLocale === tgt) return;
      const hash = ugcContentHash(sourceText, sourceLocale);
      if (!needByHash.has(hash)) needByHash.set(hash, { hash, sourceText, sourceLocale });
    });
  });

  const translatedByHash = await resolveUgcLabelsBatch(supabase, [...needByHash.values()], tgt);

  return raw.map((item, idx) => {
    const mustTry = dishesByItem[idx].map((d) => {
      const { sourceText, sourceLocale } = dishSource(d);
      let display_label = sourceText;
      if (sourceText && sourceLocale !== tgt) {
        display_label =
          translatedByHash.get(ugcContentHash(sourceText, sourceLocale)) ?? sourceText;
      }
      return {
        id: d.id,
        tag_id: d.tag_id ?? null,
        label: d.label,
        label_locale: d.label_locale,
        sort_order: d.sort_order,
        display_label,
      };
    });

    const mustTryDeduped = dedupeMustTryDishesByDisplayLabel(mustTry);
    const rest = { ...item };
    delete rest.list_item_must_try_dishes;
    return { ...rest, must_try_dishes: mustTryDeduped };
  });
}
