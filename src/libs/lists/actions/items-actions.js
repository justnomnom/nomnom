'use server';

import { notifyListFollowers } from 'src/libs/notifications/notify-list-followers';
import { notifyLiveListSubscribers } from 'src/libs/notifications/list-live-update-notify';
import { groupListItemsByRestaurant } from 'src/libs/lists/group-list-items-by-restaurant';
import { listIdsNewlyReceivingRestaurant } from 'src/libs/notifications/list-update-notify-helpers';
import {
  getSupabaseAuthUser,
  createSupabaseServerClient,
} from 'src/libs/supabase/supabase-server-client';
import {
  fetchAllSupabasePages,
  SUPABASE_DEFAULT_PAGE_SIZE,
} from 'src/libs/supabase/supabase-fetch-all-pages';

export async function listIdsByRestaurantIdsForUser(restaurantIds) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user || !restaurantIds?.length) {
    return { map: {}, error: null };
  }

  const ids = [...new Set(restaurantIds.filter(Boolean))];
  if (ids.length === 0) {
    return { map: {}, error: null };
  }

  const [ownedResult, memResult] = await Promise.all([
    supabase.from('lists').select('id').eq('user_id', user.id),
    supabase.from('list_members').select('list_id').eq('user_id', user.id).eq('status', 'active'),
  ]);
  const { data: myLists, error: lErr } = ownedResult;
  if (lErr) return { map: {}, error: lErr.message };
  const { data: mem, error: mErr } = memResult;
  if (mErr) return { map: {}, error: mErr.message };

  const listIdSet = new Set((myLists ?? []).map((r) => r.id));
  (mem ?? []).forEach((r) => listIdSet.add(r.list_id));
  const allListIds = [...listIdSet];
  if (allListIds.length === 0) {
    return { map: {}, error: null };
  }

  // Page past PostgREST's 1000-row window: a wide `places` slice on several lists each can exceed
  // it, and an unpaged read would silently drop memberships (a spot would render un-saved).
  try {
    const items = await fetchAllSupabasePages(async (from, pageSize) => {
      const { data, error } = await supabase
        .from('list_items')
        .select('list_id, restaurant_id')
        .in('list_id', allListIds)
        .in('restaurant_id', ids)
        .range(from, from + pageSize - 1);
      if (error) throw error;
      return data ?? [];
    }, SUPABASE_DEFAULT_PAGE_SIZE);

    return { map: groupListItemsByRestaurant(items), error: null };
  } catch (e) {
    return { map: {}, error: e?.message ?? 'unknown' };
  }
}

/**
 * Complete saved-list membership map for the viewer — every restaurant on any list they own or
 * collaborate on, keyed restaurant id → list ids. Unlike {@link listIdsByRestaurantIdsForUser}
 * (which filters to a passed-in id set, i.e. only the bounded map detail slice), this returns the
 * whole set so the map can color *every* saved pin and the detail card resolves a tapped pin that
 * sits outside the bounded list. Viewport-independent: one lean query (two uuids per row, paged
 * past the PostgREST 1000-row window) instead of a per-pan lookup over thousands of pins.
 *
 * @returns {Promise<{ map: Record<string, string[]>, complete: boolean, error: string | null }>}
 */
export async function fetchViewerSavedListMap() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) {
    return { map: {}, complete: false, error: null };
  }

  const [ownedResult, memResult] = await Promise.all([
    supabase.from('lists').select('id').eq('user_id', user.id),
    supabase.from('list_members').select('list_id').eq('user_id', user.id).eq('status', 'active'),
  ]);
  const { data: myLists, error: lErr } = ownedResult;
  if (lErr) return { map: {}, complete: false, error: lErr.message };
  const { data: mem, error: mErr } = memResult;
  if (mErr) return { map: {}, complete: false, error: mErr.message };

  const listIdSet = new Set((myLists ?? []).map((r) => r.id));
  (mem ?? []).forEach((r) => listIdSet.add(r.list_id));
  const allListIds = [...listIdSet];
  if (allListIds.length === 0) {
    // No lists at all — a complete (empty) answer: nothing is saved.
    return { map: {}, complete: true, error: null };
  }

  try {
    const items = await fetchAllSupabasePages(async (from, pageSize) => {
      const { data, error } = await supabase
        .from('list_items')
        .select('list_id, restaurant_id')
        .in('list_id', allListIds)
        .range(from, from + pageSize - 1);
      if (error) throw error;
      return data ?? [];
    }, SUPABASE_DEFAULT_PAGE_SIZE);

    return { map: groupListItemsByRestaurant(items), complete: true, error: null };
  } catch (e) {
    return { map: {}, complete: false, error: e?.message ?? 'unknown' };
  }
}

export async function addRestaurantToLists(restaurantId, listIds) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user?.id) return { error: 'unauthorized' };
  if (!restaurantId || !listIds?.length) return { error: 'invalid' };
  const [minRowsResult, existingRowsResult] = await Promise.all([
    supabase
      .from('list_items')
      .select('list_id, sort_order')
      .in('list_id', listIds)
      .order('sort_order', { ascending: true }),
    supabase
      .from('list_items')
      .select('list_id')
      .eq('restaurant_id', restaurantId)
      .in('list_id', listIds),
  ]);
  const { data: minRows } = minRowsResult;
  const minByList = new Map();
  (minRows ?? []).forEach((r) => {
    if (!minByList.has(r.list_id)) minByList.set(r.list_id, r.sort_order);
  });
  // Which lists already contain this restaurant? Re-adding is a no-op upsert and
  // must NOT re-notify followers — only the newly added lists should.
  const { data: existingRows } = existingRowsResult;
  const alreadyOnList = (existingRows ?? []).map((r) => r.list_id);
  const newlyAddedListIds = listIdsNewlyReceivingRestaurant(listIds, alreadyOnList);
  const rows = listIds.map((listId) => ({
    list_id: listId,
    restaurant_id: restaurantId,
    sort_order: minByList.has(listId) ? minByList.get(listId) - 1 : 0,
    added_by: user.id,
  }));
  const { error } = await supabase.from('list_items').upsert(rows, {
    onConflict: 'list_id,restaurant_id',
  });
  if (error) return { error: error.message };
  await supabase
    .from('lists')
    .update({ list_updated_at: new Date().toISOString() })
    .in('id', listIds);
  // Fire-and-forget: notify Live List / followers only for lists this restaurant
  // is newly on (re-adds must not re-email).
  newlyAddedListIds.forEach((id) => {
    notifyLiveListSubscribers(supabase, id).catch(() => {});
    notifyListFollowers(supabase, id, restaurantId, user.id).catch(() => {});
  });
  return { error: null };
}

export async function removeRestaurantFromList(listId, restaurantId) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) return { error: 'unauthorized' };
  const { error } = await supabase
    .from('list_items')
    .delete()
    .eq('list_id', listId)
    .eq('restaurant_id', restaurantId);
  if (error) return { error: error.message };
  await supabase
    .from('lists')
    .update({ list_updated_at: new Date().toISOString() })
    .eq('id', listId);
  return { error: null };
}

export async function addListItem(listId, restaurantId) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user?.id) return { error: 'unauthorized' };
  const { data: minRows, error: qErr } = await supabase
    .from('list_items')
    .select('sort_order')
    .eq('list_id', listId)
    .order('sort_order', { ascending: true })
    .limit(1);
  if (qErr) return { error: qErr.message };
  const next = minRows?.[0]?.sort_order != null ? minRows[0].sort_order - 1 : 0;
  const { error } = await supabase.from('list_items').insert({
    list_id: listId,
    restaurant_id: restaurantId,
    sort_order: next,
    added_by: user.id,
  });
  if (error) return { error: error.message };
  await supabase
    .from('lists')
    .update({ list_updated_at: new Date().toISOString() })
    .eq('id', listId);
  notifyLiveListSubscribers(supabase, listId).catch(() => {});
  notifyListFollowers(supabase, listId, restaurantId, user.id).catch(() => {});
  return { error: null };
}

export async function searchRestaurantsForPicker(query, limit = 20) {
  const supabase = await createSupabaseServerClient();
  const q = (query ?? '').trim();
  if (q.length < 2) return { restaurants: [], error: null };
  const { data, error } = await supabase
    .from('restaurants')
    .select('id,name,address')
    .ilike('name', `%${q}%`)
    .limit(Math.min(limit, 40));
  if (error) return { restaurants: [], error: error.message };
  return { restaurants: data ?? [], error: null };
}
