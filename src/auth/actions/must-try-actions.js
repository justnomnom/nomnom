'use server';

import { notifyLiveListSubscribers } from 'src/libs/notifications/list-live-update-notify';
import { matchRestaurantDishTag, fetchDishTagsForRestaurant } from 'src/lib/dish-tag-resolve';
import {
  getSupabaseAuthUser,
  createSupabaseServerClient,
} from 'src/libs/supabase/supabase-server-client';

const MAX_MUST_TRY = 10;

/**
 * @typedef {{ suggestionId: string | null, label: string }} MustTryPickInput
 * `suggestionId` holds a global dish `tags.id` (category dish) when chosen from chips; null for free-text until resolved.
 */

const MAX_AI_DISH_SUGGESTIONS = 8;

/**
 * Dish suggestions for the must-try picker on the save-to-list sheet.
 * Combines:
 *   - Curated dish tags (`tags` + `restaurant_tags`, category dish) — these have a
 *     real `id` (uuid) and get persisted with `tag_id` on pick.
 *   - AI signature dishes from `metadata.review_consensus.signature_dishes` — these
 *     have a synthetic id (`ai:<lowercase-label>`) and are persisted as free-text
 *     picks (suggestionId: null) on pick, same as a user-typed custom dish.
 * AI dishes whose label already matches a curated dish tag are dropped to avoid
 * duplicates in the chip row.
 *
 * @param {string} restaurantId
 * @returns {Promise<{ suggestions: object[], error: string | null }>}
 */
export async function fetchRestaurantDishSuggestions(restaurantId) {
  if (!restaurantId) return { suggestions: [], error: null };
  const supabase = await createSupabaseServerClient();
  try {
    const [tags, metaRes] = await Promise.all([
      fetchDishTagsForRestaurant(supabase, restaurantId),
      supabase.from('restaurants').select('metadata').eq('id', restaurantId).maybeSingle(),
    ]);

    const tagSuggestions = tags.map((t) => ({
      id: t.id,
      label: t.label,
      sort_order: t.sort_order ?? 0,
      locale: 'en',
      source: 'dish_tag',
    }));

    const meta = metaRes?.data?.metadata;
    const aiRaw =
      meta && typeof meta === 'object'
        ? /** @type {Record<string, unknown>} */ (meta).review_consensus
        : null;
    const aiDishesRaw =
      aiRaw && typeof aiRaw === 'object'
        ? /** @type {Record<string, unknown>} */ (aiRaw).signature_dishes
        : null;

    // signature_dishes shape evolved from string[] → [{label, mentions}]; accept both.
    const aiLabels = Array.isArray(aiDishesRaw)
      ? aiDishesRaw
          .map((d) => {
            if (typeof d === 'string') return d.trim();
            if (d && typeof d === 'object' && typeof d.label === 'string') return d.label.trim();
            return '';
          })
          .filter((d) => d.length > 0)
      : [];

    const tagLabelSet = new Set(tagSuggestions.map((t) => t.label.toLowerCase()));
    const aiSuggestions = aiLabels
      .filter((d) => !tagLabelSet.has(d.toLowerCase()))
      .filter((d, i, arr) => arr.findIndex((x) => x.toLowerCase() === d.toLowerCase()) === i)
      .slice(0, MAX_AI_DISH_SUGGESTIONS)
      .map((label, i) => ({
        id: `ai:${label.toLowerCase()}`,
        label,
        sort_order: 1000 + i,
        locale: null,
        source: 'ai_consensus',
      }));

    return { suggestions: [...tagSuggestions, ...aiSuggestions], error: null };
  } catch (e) {
    return { suggestions: [], error: e?.message ?? 'fetch_failed' };
  }
}

/**
 * Distinct global dish tags the user has saved on must-try lists (any restaurant).
 * Used to surface "my dishes" in food preference pickers alongside the full catalog.
 *
 * @returns {Promise<{ tags: Array<{ id: string, slug: string, label: string, category: string, sort_order?: number }>, error: string | null }>}
 */
export async function fetchUserMustTryDishTags() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user?.id) return { tags: [], error: null };

  try {
    const { data: rows, error } = await supabase
      .from('list_items')
      .select(
        `
        list_item_must_try_dishes (
          tag_id,
          tags ( id, slug, label, category, sort_order )
        )
      `
      )
      .eq('added_by', user.id);

    if (error) return { tags: [], error: error.message };

    const byId = new Map();
    (rows ?? []).forEach((row) => {
      const nested = row.list_item_must_try_dishes;
      if (!Array.isArray(nested)) return;
      nested.forEach((dish) => {
        const tag = dish?.tags;
        if (!tag?.id || tag.category !== 'dish') return;
        const id = String(tag.id).trim().toLowerCase();
        if (!id || byId.has(id)) return;
        byId.set(id, tag);
      });
    });

    const tags = [...byId.values()].sort((a, b) => {
      const so = (a.sort_order ?? 0) - (b.sort_order ?? 0);
      if (so !== 0) return so;
      return String(a.label ?? '').localeCompare(String(b.label ?? ''));
    });

    return { tags, error: null };
  } catch (e) {
    return { tags: [], error: e?.message ?? 'fetch_failed' };
  }
}

/**
 * Load current user's must-try picks for this restaurant from any of their list_items.
 * @param {string} restaurantId
 * @returns {Promise<{ picks: MustTryPickInput[], error: string | null }>}
 */
export async function fetchMyMustTryDraftForRestaurant(restaurantId) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user?.id) return { picks: [], error: null };
  if (!restaurantId) return { picks: [], error: null };

  const { data: rows, error } = await supabase
    .from('list_items')
    .select(
      `
      id,
      list_item_must_try_dishes (
        id,
        tag_id,
        label,
        sort_order
      )
    `
    )
    .eq('restaurant_id', restaurantId)
    .eq('added_by', user.id)
    .order('created_at', { ascending: true });

  if (error) return { picks: [], error: error.message };

  const withDishes = (rows ?? []).find(
    (r) => Array.isArray(r.list_item_must_try_dishes) && r.list_item_must_try_dishes.length > 0
  );
  const nested = withDishes?.list_item_must_try_dishes;
  if (!Array.isArray(nested) || nested.length === 0) {
    return { picks: [], error: null };
  }

  const sorted = [...nested].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const picks = sorted.map((d) => ({
    suggestionId: d.tag_id || null,
    label: typeof d.label === 'string' ? d.label : '',
  }));

  return { picks, error: null };
}

/**
 * Replace must-try dishes for this restaurant on each of the given lists.
 *
 * @param {object} args
 * @param {string} args.restaurantId
 * @param {string[]} args.listIds
 * @param {MustTryPickInput[]} args.picks
 * @param {string} [args.labelLocale] app language when typing custom labels (`en` | `pt`)
 * @returns {Promise<{ error: string | null }>}
 */
export async function upsertMustTryDishesForRestaurantLists({
  restaurantId,
  listIds,
  picks,
  labelLocale = 'en',
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user?.id) return { error: 'unauthorized' };
  if (!restaurantId || !Array.isArray(listIds) || listIds.length === 0) {
    return { error: 'invalid' };
  }

  const rawPicks = Array.isArray(picks) ? picks : [];
  if (rawPicks.length > MAX_MUST_TRY) {
    return { error: 'too_many' };
  }

  const locale = typeof labelLocale === 'string' && labelLocale.trim() ? labelLocale.trim() : 'en';

  try {
    const pickRows = await Promise.all(
      rawPicks.map(async (p, i) => {
        const labelRaw = typeof p?.label === 'string' ? p.label.trim() : '';
        if (!labelRaw || labelRaw.length > 300) {
          return { error: 'invalid_label' };
        }
        const sid = p?.suggestionId && typeof p.suggestionId === 'string' ? p.suggestionId : null;
        if (sid) {
          const { data: rt } = await supabase
            .from('restaurant_tags')
            .select('tag_id')
            .eq('restaurant_id', restaurantId)
            .eq('tag_id', sid)
            .maybeSingle();
          if (rt?.tag_id) {
            const { data: tag, error: tagErr } = await supabase
              .from('tags')
              .select('id, label, category')
              .eq('id', sid)
              .maybeSingle();
            if (!tagErr && tag?.category === 'dish') {
              return {
                row: {
                  tag_id: tag.id,
                  label: tag.label,
                  label_locale: 'en',
                  sort_order: i,
                },
              };
            }
          }
          return { error: 'invalid_dish_tag' };
        }
        const matched = await matchRestaurantDishTag(supabase, restaurantId, labelRaw, locale);
        if (matched) {
          return {
            row: {
              tag_id: matched.tagId,
              label: matched.label,
              label_locale: matched.label_locale,
              sort_order: i,
            },
          };
        }
        return {
          row: {
            tag_id: null,
            label: labelRaw,
            label_locale: locale,
            sort_order: i,
          },
        };
      })
    );

    const firstPickErr = pickRows.find((x) => x.error)?.error;
    if (firstPickErr) return { error: firstPickErr };

    /** @type {Array<{ tag_id: string | null, label: string, label_locale: string, sort_order: number }>} */
    const resolved = pickRows.map((x) => x.row);

    const { data: listItemRows, error: liErr } = await supabase
      .from('list_items')
      .select('id, list_id')
      .eq('restaurant_id', restaurantId)
      .in('list_id', listIds)
      .eq('added_by', user.id);

    if (liErr) return { error: liErr.message };
    const items = listItemRows ?? [];
    if (items.length === 0) {
      return { error: 'no_list_items' };
    }

    const listItemIds = items.map((r) => r.id);

    const { error: delErr } = await supabase
      .from('list_item_must_try_dishes')
      .delete()
      .in('list_item_id', listItemIds);
    if (delErr) return { error: delErr.message };

    if (resolved.length === 0) {
      return { error: null };
    }

    const insertRows = items.flatMap((li) =>
      resolved.map((r) => ({
        list_item_id: li.id,
        tag_id: r.tag_id,
        label: r.label,
        label_locale: r.label_locale,
        sort_order: r.sort_order,
      }))
    );

    const { error: insErr } = await supabase.from('list_item_must_try_dishes').insert(insertRows);
    if (insErr) return { error: insErr.message };
    await supabase
      .from('lists')
      .update({ list_updated_at: new Date().toISOString() })
      .in('id', listIds);
    listIds.forEach((id) => {
      notifyLiveListSubscribers(supabase, id).catch(() => {});
    });
    return { error: null };
  } catch (e) {
    return { error: e?.message ?? 'must_try_failed' };
  }
}
