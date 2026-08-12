/**
 * Shared helpers for list server actions (not client-callable actions).
 */

import { attachMustTryDisplayToListItems } from 'src/libs/ugc/ugc-translate';

/** @param {unknown} id */
export function normUuid(id) {
  if (id == null) return '';
  return String(id);
}

async function attachContributorReviewsToItems(supabase, items) {
  const raw = items ?? [];
  if (raw.length === 0) return [];
  const rids = [...new Set(raw.map((r) => r.restaurant_id).filter(Boolean))];
  const uids = [...new Set(raw.map((r) => r.added_by).filter(Boolean))];
  if (rids.length === 0 || uids.length === 0) {
    return raw.map((row) => ({ ...row, contributor_review: null }));
  }
  // Chunk the restaurant-id filter: a list can now hold >1000 items (see fetchListPage), and a
  // single `.in('restaurant_id', rids)` would overflow the request URL and silently cap the
  // result at PostgREST's 1000-row window. `uids` is the contributor set (added_by), which stays
  // small, so it doesn't need chunking.
  const REVIEW_RID_CHUNK = 200;
  const ridChunks = [];
  for (let i = 0; i < rids.length; i += REVIEW_RID_CHUNK) {
    ridChunks.push(rids.slice(i, i + REVIEW_RID_CHUNK));
  }
  /** @type {Map<string, object>} */
  const map = new Map();
  try {
    const chunkResults = await Promise.all(
      ridChunks.map(async (ridChunk) => {
        const { data, error } = await supabase
          .from('restaurant_reviews')
          .select(
            `
            user_id,
            restaurant_id,
            rating,
            body,
            media,
            author_display_name,
            author_username,
            author_avatar_url,
            created_at,
            updated_at
          `
          )
          .in('restaurant_id', ridChunk)
          .in('user_id', uids);
        if (error) {
          throw error;
        }
        return data ?? [];
      })
    );
    chunkResults.forEach((revs) => {
      revs.forEach((rev) => {
        map.set(`${rev.user_id}:${rev.restaurant_id}`, rev);
      });
    });
  } catch {
    return raw.map((row) => ({ ...row, contributor_review: null }));
  }
  return raw.map((row) => ({
    ...row,
    contributor_review: map.get(`${row.added_by}:${row.restaurant_id}`) ?? null,
  }));
}

/**
 * Attach contributor reviews and must-try display labels in parallel, then merge.
 * Both transforms only need the raw item rows (async-parallel).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {Array<object>} items
 * @param {'en' | 'pt'} viewerLang
 */
export async function enrichListItemsWithReviewsAndMustTry(supabase, items, viewerLang) {
  const raw = items ?? [];
  if (raw.length === 0) return [];
  const [withReviews, withMustTry] = await Promise.all([
    attachContributorReviewsToItems(supabase, raw),
    attachMustTryDisplayToListItems(supabase, raw, viewerLang),
  ]);
  return withReviews.map((item, i) => {
    const rest = { ...item };
    delete rest.list_item_must_try_dishes;
    return {
      ...rest,
      must_try_dishes: withMustTry[i]?.must_try_dishes ?? [],
    };
  });
}

/**
 * Resolve viewerLang whether callers pass a string or a Promise (so pages can
 * start getServerViewerLang() without awaiting before fetchListPage).
 * @param {unknown} langInput
 * @returns {Promise<'en' | 'pt'>}
 */
export async function resolveViewerLangInput(langInput) {
  const resolved = await Promise.resolve(langInput);
  return resolved === 'pt' ? 'pt' : 'en';
}

export function itemCountFromListItemsEmbed(listItems) {
  const row = Array.isArray(listItems) ? listItems[0] : null;
  const n = row?.count;
  if (typeof n === 'number' && Number.isFinite(n)) return n;
  if (typeof n === 'string' && n !== '') {
    const parsed = Number(n);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}
