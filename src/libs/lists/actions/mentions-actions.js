'use server';

import {
  getSupabaseAuthUser,
  createSupabaseServerClient,
} from 'src/libs/supabase/supabase-server-client';

import {
  normUuid,
  enrichListItemsWithReviewsAndMustTry,
} from 'src/libs/lists/actions/_shared';

async function filterListItemsToViewerLists(supabase, userId, items) {
  const raw = items ?? [];
  if (!userId || raw.length === 0) return [];
  const listIds = [...new Set(raw.map((i) => normUuid(i.list_id)).filter(Boolean))];
  if (listIds.length === 0) return [];

  const [
    { data: ownedRows, error: oErr },
    { data: memberRows, error: mErr },
    { data: listsMeta, error: lmErr },
    { data: subRows, error: sErr },
  ] = await Promise.all([
    supabase.from('lists').select('id').eq('user_id', userId).in('id', listIds),
    supabase
      .from('list_members')
      .select('list_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .in('list_id', listIds),
    supabase.from('lists').select('id, user_id, paid_access_enabled').in('id', listIds),
    supabase
      .from('list_subscriptions')
      .select('list_id')
      .eq('subscriber_user_id', userId)
      .in('status', ['active', 'trialing']),
  ]);
  if (oErr || mErr || lmErr || sErr) {
    return [];
  }

  const subListIds = [...new Set((subRows ?? []).map((r) => normUuid(r.list_id)).filter(Boolean))];
  let ownersWithPaidBundleSub = new Set();
  if (subListIds.length) {
    const { data: subbedLists, error: slErr } = await supabase
      .from('lists')
      .select('user_id, paid_access_enabled')
      .in('id', subListIds);
    if (!slErr && subbedLists?.length) {
      ownersWithPaidBundleSub = new Set(
        subbedLists.filter((l) => Boolean(l.paid_access_enabled)).map((l) => normUuid(l.user_id))
      );
    }
  }

  const allowed = new Set([
    ...(ownedRows ?? []).map((r) => normUuid(r.id)),
    ...(memberRows ?? []).map((r) => normUuid(r.list_id)),
  ]);
  (listsMeta ?? []).forEach((lm) => {
    const lid = normUuid(lm.id);
    if (lid && lm.paid_access_enabled && ownersWithPaidBundleSub.has(normUuid(lm.user_id))) {
      allowed.add(lid);
    }
  });
  return raw.filter((row) => {
    const lid = normUuid(row.list_id);
    return Boolean(lid) && allowed.has(lid);
  });
}

/**
 * List rows for this restaurant on lists the viewer owns, collaborates on, or subscribes to,
 * with linked `restaurant_reviews` blurbs for each contributor. Excludes arbitrary public lists.
 *
 * @param {string} restaurantId
 * @returns {Promise<{ items: object[], error: string | null }>}
 */
const LIST_ITEMS_MENTION_SELECT = `
      id,
      list_id,
      restaurant_id,
      added_by,
      created_at,
      list_item_must_try_dishes (
        id,
        tag_id,
        label,
        label_locale,
        sort_order,
        tags ( id, label, slug )
      ),
      lists (
        id,
        name
      )
    `;

export async function fetchRestaurantListMentions(restaurantId, opts = {}) {
  if (!restaurantId || typeof restaurantId !== 'string') {
    return { items: [], error: null };
  }
  const viewerLang = opts.viewerLang === 'pt' ? 'pt' : 'en';
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) {
    return { items: [], error: null };
  }

  const { data: idRows, error: rpcError } = await supabase.rpc(
    'restaurant_list_mention_item_ids_for_viewer',
    { p_restaurant_id: restaurantId }
  );

  /** @type {object[] | null} */
  let data = null;

  if (!rpcError && Array.isArray(idRows)) {
    const ids = idRows.map((id) => normUuid(id)).filter(Boolean);
    if (ids.length === 0) {
      return { items: [], error: null };
    }
    const { data: rows, error: qErr } = await supabase
      .from('list_items')
      .select(LIST_ITEMS_MENTION_SELECT)
      .in('id', ids)
      .order('created_at', { ascending: false });
    if (qErr) {
      return { items: [], error: qErr.message };
    }
    data = rows ?? [];
  } else {
    const { data: rows, error: qErr } = await supabase
      .from('list_items')
      .select(LIST_ITEMS_MENTION_SELECT)
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });
    if (qErr) {
      return { items: [], error: qErr.message };
    }
    data = await filterListItemsToViewerLists(supabase, user.id, rows ?? []);
  }

  const itemsWithMustTry = await enrichListItemsWithReviewsAndMustTry(
    supabase,
    data ?? [],
    viewerLang
  );
  return { items: itemsWithMustTry, error: null };
}

/**
 * Fetches list items from *public* lists for a restaurant, used to supplement
 * review cards with "Referenced on:" data for reviewers who aren't on
 * viewer-accessible lists. Does not attach contributor_review or must_try
 * processing — the caller is responsible for that enrichment.
 *
 * @param {string} restaurantId
 * @returns {Promise<object[]>}
 */
export async function fetchPublicListItemsForRestaurant(restaurantId) {
  if (!restaurantId || typeof restaurantId !== 'string') return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('list_items')
    .select(
      `
      id,
      list_id,
      restaurant_id,
      added_by,
      created_at,
      list_item_must_try_dishes (
        id,
        tag_id,
        label,
        label_locale,
        sort_order,
        tags ( id, label, slug )
      ),
      lists!inner ( id, name, visibility )
    `
    )
    .eq('restaurant_id', restaurantId)
    .eq('lists.visibility', 'public');
  if (error) return [];
  // JS-side guard: only emit rows whose joined list is confirmed public.
  return (data ?? []).filter((row) => {
    const L = row?.lists;
    const listObj = Array.isArray(L) ? L[0] : L;
    return listObj?.visibility === 'public';
  });
}

/**
 * Returns a Set of user IDs that the currently authenticated viewer follows.
 * @returns {Promise<Set<string>>}
 */
export async function fetchViewerFollowingIds() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) return new Set();
  const { data } = await supabase
    .from('user_follows')
    .select('following_id')
    .eq('follower_id', user.id);
  return new Set((data ?? []).map((r) => normUuid(r.following_id)).filter(Boolean));
}
