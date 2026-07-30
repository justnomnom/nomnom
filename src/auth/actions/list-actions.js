'use server';

import { filterE2eTestListsForDisplay } from 'src/utils/filter-e2e-test-lists';

import { supabaseAdminClient } from 'src/libs/supabase/supabase-admin';
import { attachMustTryDisplayToListItems } from 'src/lib/ugc-translate';
import { normalizeListVisibility } from 'src/libs/lists/list-visibility';
import { normalizeFollowCircle } from 'src/libs/restaurant/follow-circle';
import { normalizeOpeningStatus } from 'src/libs/restaurant/opening-hours';
import { getMyStripeConnectStatus } from 'src/auth/actions/stripe-list-actions';
import { insertNotifications } from 'src/libs/notifications/create-notification';
import { slimRestaurantCardMetadata } from 'src/lib/slim-restaurant-card-metadata';
import { notifyListFollowers } from 'src/libs/notifications/notify-list-followers';
import { PROFILE_ACTIVITY_PAGE_SIZE } from 'src/lib/public-profile-activity-constants';
import { buildFollowingListOwnersMap } from 'src/libs/restaurant/following-list-owners';
import { notifyLiveListSubscribers } from 'src/libs/notifications/list-live-update-notify';
import { groupListItemsByRestaurant } from 'src/libs/lists/group-list-items-by-restaurant';
import {
  fetchAllSupabasePages,
  SUPABASE_DEFAULT_PAGE_SIZE,
} from 'src/lib/supabase-fetch-all-pages';
import { mergeSnapshotPurchaseCapturedItemIds } from 'src/libs/lists/merge-snapshot-purchase-captured-item-ids';
import {
  getSupabaseAuthUser,
  createSupabaseServerClient,
} from 'src/libs/supabase/supabase-server-client';
import {
  computeListSnapshotAmountCents,
  LIST_FREEMIUM_FREE_PLACES_COUNT,
} from 'src/libs/stripe/list-stripe-constants';

/** @param {unknown} id */
function normUuid(id) {
  if (id == null) return '';
  return String(id);
}

/**
 * Mentions should reflect places saved on lists the viewer owns, follows as an active member,
 * or has an active paid subscription to — not every public list visible under RLS.
 * (Fallback when RPC is unavailable; prefer `restaurant_list_mention_item_ids_for_viewer`.)
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @param {Array<object>} items
 */
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
 * Join each list item with the contributor's `restaurant_reviews` row (added_by + restaurant_id).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {Array<object>} items
 */
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
async function enrichListItemsWithReviewsAndMustTry(supabase, items, viewerLang) {
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
async function resolveViewerLangInput(langInput) {
  const resolved = await Promise.resolve(langInput);
  return resolved === 'pt' ? 'pt' : 'en';
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

/** PostgREST aggregate embed: `list_items(count)` → `[{ count: number }]`. */
function itemCountFromListItemsEmbed(listItems) {
  const row = Array.isArray(listItems) ? listItems[0] : null;
  const n = row?.count;
  if (typeof n === 'number' && Number.isFinite(n)) return n;
  if (typeof n === 'string' && n !== '') {
    const parsed = Number(n);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

const MY_LISTS_FOR_SAVE_SELECT = `
      id,
      name,
      description,
      cover_image_url,
      visibility,
      published_at,
      updated_at,
      list_items(count)
    `;

/** Same columns as MY_LISTS_FOR_SAVE_SELECT but without the list_items embed (used for collaborator lists). */
const MY_LISTS_FOR_SAVE_BASE = `
      id,
      name,
      description,
      cover_image_url,
      visibility,
      published_at,
      updated_at
    `;

function mapListRowWithItemCount(row) {
  const { list_items: li, ...rest } = row;
  return {
    ...rest,
    item_count: itemCountFromListItemsEmbed(li),
  };
}

/** @param {Record<string, unknown>} row */
function mapMyListsForSaveRpcRow(row) {
  const itemCount = row.item_count;
  let n = 0;
  if (typeof itemCount === 'bigint') n = Number(itemCount);
  else if (typeof itemCount === 'number' && Number.isFinite(itemCount)) n = itemCount;
  else if (typeof itemCount === 'string' && itemCount !== '') {
    const parsed = Number(itemCount);
    n = Number.isFinite(parsed) ? parsed : 0;
  }
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    cover_image_url: row.cover_image_url,
    visibility: row.visibility,
    published_at: row.published_at,
    updated_at: row.updated_at,
    item_count: n,
  };
}

/** @param {{ message?: string; code?: string } | null | undefined} error */
function isMyListsForSaveRpcUnavailable(error) {
  if (!error) return false;
  if (error.code === 'PGRST202') return true;
  const msg = typeof error.message === 'string' ? error.message : '';
  return /my_lists_for_save/i.test(msg) || /Could not find the function/i.test(msg);
}

/**
 * Direct table reads (fallback when `my_lists_for_save` RPC is not deployed yet).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ id: string }} user
 */
async function fetchMyListsViaTables(supabase, user) {
  const [{ data: ownedRaw, error: ownedErr }, { data: editorRows, error: editorErr }] =
    await Promise.all([
      supabase
        .from('lists')
        .select(MY_LISTS_FOR_SAVE_SELECT)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false }),
      supabase
        .from('list_members')
        .select('list_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .eq('role', 'editor'),
    ]);

  if (ownedErr) return { lists: [], error: ownedErr.message };
  if (editorErr) return { lists: [], error: editorErr.message };

  const owned = (ownedRaw ?? []).map(mapListRowWithItemCount);
  const ownedIds = new Set(owned.map((l) => normUuid(l.id)));

  const editorIds = [
    ...new Set((editorRows ?? []).map((r) => normUuid(r.list_id)).filter(Boolean)),
  ].filter((id) => !ownedIds.has(id));

  let editorLists = [];
  if (editorIds.length) {
    const [{ data: editorRaw, error: edErr }, countByListId] = await Promise.all([
      supabase
        .from('lists')
        .select(MY_LISTS_FOR_SAVE_BASE)
        .in('id', editorIds)
        .order('updated_at', { ascending: false }),
      listItemCountMapForListIds(supabase, editorIds),
    ]);
    if (edErr) return { lists: [], error: edErr.message };
    editorLists = (editorRaw ?? []).map((row) => ({
      ...row,
      item_count: countByListId[normUuid(row.id)] ?? 0,
    }));
  }

  const merged = [...owned, ...editorLists];
  merged.sort((a, b) => {
    const ta = new Date(a.updated_at ?? 0).getTime();
    const tb = new Date(b.updated_at ?? 0).getTime();
    return tb - ta;
  });

  return { lists: filterE2eTestListsForDisplay(merged), error: null };
}

/**
 * Item counts for the given list IDs (one `list_items` read; RLS limits rows to lists the user can read).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string[]} listIds
 * @returns {Promise<Record<string, number>>}
 */
async function listItemCountMapForListIds(supabase, listIds) {
  const ids = [...new Set((listIds ?? []).map((id) => normUuid(id)).filter(Boolean))];
  if (ids.length === 0) return {};
  const { data: rows, error } = await supabase
    .from('list_items')
    .select('list_id')
    .in('list_id', ids);
  if (error || !rows?.length) return {};
  /** @type {Record<string, number>} */
  const map = {};
  rows.forEach((r) => {
    const lid = normUuid(r.list_id);
    if (!lid) return;
    map[lid] = (map[lid] ?? 0) + 1;
  });
  return map;
}

/** Lists the user can add spots to: owned + active collaborator role `editor` (not viewer-only). */
export async function fetchMyLists() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) return { lists: [], error: 'unauthorized' };

  const { data: rpcRows, error: rpcErr } = await supabase.rpc('my_lists_for_save');
  if (!rpcErr) {
    return {
      lists: filterE2eTestListsForDisplay((rpcRows ?? []).map(mapMyListsForSaveRpcRow)),
      error: null,
    };
  }
  if (!isMyListsForSaveRpcUnavailable(rpcErr)) {
    return { lists: [], error: rpcErr.message };
  }

  return fetchMyListsViaTables(supabase, user);
}

/**
 * Owned lists + non-owned buckets for `/dashboard/lists` hub:
 * `sharedWithMe` — active collaborator or pending invite; not list owner.
 * `fromFollowed` — lists owned by users the viewer follows that are *not* covered by paid
 *   access below (no active subscription or snapshot row for that list). Public picks from
 *   followed creators; subscriber-only lists you pay for appear only in `subscribedLists`.
 * `subscribedLists` — lists the viewer has recurring access to via Stripe (`list_subscriptions`)
 *   plus one-time snapshot purchases (`list_snapshot_purchases`).
 */
export async function fetchMyListsHub() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) {
    return {
      owned: [],
      sharedWithMe: [],
      fromFollowed: [],
      subscribedLists: [],
      error: 'unauthorized',
    };
  }

  const [
    { data: ownedRaw, error: oErr },
    { data: followingRaw, error: fErr },
    { data: followedUserListsRaw, error: fuErr },
    { data: subRows, error: subErr },
    { data: snapRows, error: snapErr },
  ] = await Promise.all([
    supabase
      .from('lists')
      .select(
        `
        id,
        name,
        description,
        cover_image_url,
        visibility,
        published_at,
        updated_at,
        list_items(count)
      `
      )
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false }),
    supabase.rpc('dashboard_following_lists'),
    supabase.rpc('map_following_lists'),
    supabase
      .from('list_subscriptions')
      .select('list_id')
      .eq('subscriber_user_id', user.id)
      .in('status', ['active', 'trialing']),
    supabase
      .from('list_snapshot_purchases')
      .select('list_id, captured_list_item_ids')
      .eq('buyer_user_id', user.id),
  ]);

  const emptyHub = {
    owned: [],
    sharedWithMe: [],
    fromFollowed: [],
    subscribedLists: [],
    error: null,
  };
  if (oErr) return { ...emptyHub, error: oErr.message };
  if (fErr) return { ...emptyHub, error: fErr.message };
  if (fuErr) return { ...emptyHub, error: fuErr.message };
  if (subErr) return { ...emptyHub, error: subErr.message };
  if (snapErr) return { ...emptyHub, error: snapErr.message };

  const owned = (ownedRaw ?? []).map(({ list_items: li, ...rest }) => ({
    ...rest,
    item_count: itemCountFromListItemsEmbed(li),
  }));

  const normalizeItemCount = (ic) => {
    if (typeof ic === 'bigint') return Number(ic);
    if (typeof ic === 'number' && Number.isFinite(ic)) return ic;
    if (typeof ic === 'string' && ic !== '') {
      const parsed = Number(ic);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };

  const normalizeRow = (row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    cover_image_url: row.cover_image_url,
    visibility: row.visibility,
    published_at: row.published_at,
    updated_at: row.updated_at,
    owner_username: row.owner_username ?? null,
    owner_display_name: row.owner_display_name ?? null,
    item_count: normalizeItemCount(row.item_count),
    member_status: row.member_status === 'pending_invite' ? 'pending_invite' : 'active',
  });

  const sharedWithMe = (followingRaw ?? []).map(normalizeRow);
  const fromFollowedRaw = (followedUserListsRaw ?? []).map(normalizeRow);

  const subListIds = [...new Set((subRows ?? []).map((r) => normUuid(r.list_id)).filter(Boolean))];
  const snapshotListIds = [
    ...new Set((snapRows ?? []).map((r) => normUuid(r.list_id)).filter(Boolean)),
  ];
  const subscribedListIds = [...new Set([...subListIds, ...snapshotListIds])];
  const paidAccessListIdSet = new Set(subscribedListIds);
  const fromFollowed = fromFollowedRaw.filter((l) => !paidAccessListIdSet.has(normUuid(l.id)));

  /** Snapshot-only lists: no `list_subscriptions` row for that list_id — item_count must match frozen capture (see `map_following_lists`). */
  const subListIdSet = new Set(subListIds);
  /** @type {Map<string, { captured_list_item_ids?: string[] | null }[]>} */
  const snapshotPurchaseRowsByListId = new Map();
  (snapRows ?? []).forEach((r) => {
    const lid = normUuid(r.list_id);
    if (!lid) return;
    const cur = snapshotPurchaseRowsByListId.get(lid) ?? [];
    cur.push(r);
    snapshotPurchaseRowsByListId.set(lid, cur);
  });
  /** @type {Map<string, number>} */
  const snapshotOnlyItemCountByListId = new Map();
  snapshotListIds.forEach((lid) => {
    if (subListIdSet.has(lid)) return;
    const merged = mergeSnapshotPurchaseCapturedItemIds(
      snapshotPurchaseRowsByListId.get(lid) ?? []
    );
    if (merged !== null) {
      snapshotOnlyItemCountByListId.set(lid, merged.length);
    }
  });

  let subscribedLists = [];
  if (subscribedListIds.length) {
    const { data: listsRaw, error: lsErr } = await supabase
      .from('lists')
      .select(
        `
        id,
        name,
        description,
        cover_image_url,
        visibility,
        published_at,
        updated_at,
        user_id,
        list_items(count)
      `
      )
      .in('id', subscribedListIds)
      .order('updated_at', { ascending: false });
    if (lsErr) return { ...emptyHub, error: lsErr.message };

    const subscribedListsRaw = listsRaw ?? [];
    const ownerIds = [
      ...new Set(subscribedListsRaw.map((l) => normUuid(l.user_id)).filter(Boolean)),
    ];
    /** @type {Map<string, { username: string | null, display_name: string | null }>} */
    const ownerById = new Map();
    if (ownerIds.length) {
      const { data: ownerRows, error: ownErr } = await supabase
        .from('users')
        .select('id, username, display_name')
        .in('id', ownerIds);
      if (ownErr) return { ...emptyHub, error: ownErr.message };
      (ownerRows ?? []).forEach((u) => {
        ownerById.set(normUuid(u.id), { username: u.username, display_name: u.display_name });
      });
    }

    subscribedLists = subscribedListsRaw.map((row) => {
      const { list_items: li, user_id: ownerUserId, ...rest } = row;
      const o = ownerById.get(normUuid(ownerUserId)) ?? {};
      const lid = normUuid(rest.id);
      const snapCount = lid ? snapshotOnlyItemCountByListId.get(lid) : undefined;
      return normalizeRow({
        ...rest,
        owner_username: o.username ?? null,
        owner_display_name: o.display_name ?? null,
        item_count: snapCount !== undefined ? snapCount : itemCountFromListItemsEmbed(li),
      });
    });
  }

  // Before migration `20260423100000_dashboard_following_lists_item_count`, RPC has no `item_count`.
  const needsSharedCounts =
    sharedWithMe.length > 0 && !Object.prototype.hasOwnProperty.call(followingRaw[0], 'item_count');
  if (needsSharedCounts) {
    const ids = sharedWithMe.map((l) => l.id);
    const { data: countRows, error: cErr } = await supabase
      .from('list_items')
      .select('list_id')
      .in('list_id', ids);
    if (cErr) return { ...emptyHub, error: cErr.message };
    const countBy = {};
    (countRows ?? []).forEach((row) => {
      countBy[row.list_id] = (countBy[row.list_id] ?? 0) + 1;
    });
    sharedWithMe.forEach((l, i) => {
      sharedWithMe[i] = { ...l, item_count: countBy[l.id] ?? 0 };
    });
  }

  return {
    owned: filterE2eTestListsForDisplay(owned),
    sharedWithMe: filterE2eTestListsForDisplay(sharedWithMe),
    fromFollowed: filterE2eTestListsForDisplay(fromFollowed),
    subscribedLists: filterE2eTestListsForDisplay(subscribedLists),
    error: null,
  };
}

export async function createList({ name, description, visibility }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) return { list: null, error: 'unauthorized' };
  const vis = normalizeListVisibility(visibility);
  const listName = name?.trim() || 'Untitled list';
  const desc = description?.trim() || '';
  const { data, error } = await supabase.rpc('create_user_list', {
    p_name: listName,
    p_description: desc,
    p_visibility: vis,
  });
  if (error) return { list: null, error: error.message };
  const listId = data != null ? String(data) : null;
  // Generate slug immediately so the list has a clean URL from the start.
  if (listId) ensureListSlug(listId).catch(() => {});
  return { list: listId ? { id: listId } : null, error: null };
}

/**
 * Owner: lists for Settings → Billing (paid-list monetization UI).
 * @returns {Promise<{ lists: Array<{ id: string, name: string | null, visibility: string, published_at: string | null, paid_access_enabled: boolean | null, monthly_amount_cents: number | null, currency: string | null }>, error: string | null }>}
 */
export async function fetchOwnedListsForBilling() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) return { lists: [], error: 'unauthorized' };
  const { data, error } = await supabase
    .from('lists')
    .select(
      'id, name, visibility, published_at, paid_access_enabled, monthly_amount_cents, currency'
    )
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });
  if (error) return { lists: [], error: error.message };
  return { lists: data ?? [], error: null };
}

export async function updateListMeta(
  listId,
  { name, description, visibility, cover_image_url, published_at }
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) return { error: 'unauthorized' };

  const { data: row, error: fetchErr } = await supabase
    .from('lists')
    .select('id, user_id')
    .eq('id', listId)
    .maybeSingle();

  if (fetchErr) return { error: fetchErr.message };
  if (!row || row.user_id !== user.id) return { error: 'forbidden' };

  const patch = {};
  if (name != null) patch.name = name;
  if (description !== undefined) patch.description = description;
  if (visibility != null) {
    const nv = normalizeListVisibility(visibility);
    patch.visibility = nv;
    // DB constraint requires paid_access_enabled=false whenever visibility != 'public_subscribers'.
    if (nv !== 'public_subscribers') {
      patch.paid_access_enabled = false;
    }
  }
  if (cover_image_url !== undefined) patch.cover_image_url = cover_image_url;
  if (published_at !== undefined) patch.published_at = published_at;
  const { error } = await supabase.from('lists').update(patch).eq('id', listId);
  if (error) return { error: error.message };

  // Auto-generate slug when name is set or list is published for the first time.
  if (patch.name || patch.published_at) {
    ensureListSlug(listId).catch(() => {});
  }

  return { error: null };
}

/** Owner-only. */
export async function deleteList(listId) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) return { error: 'unauthorized' };

  const { data: row, error: fetchErr } = await supabase
    .from('lists')
    .select('id, user_id')
    .eq('id', listId)
    .maybeSingle();

  if (fetchErr) return { error: fetchErr.message };
  if (!row || row.user_id !== user.id) return { error: 'forbidden' };

  // Block deletion if money is attached to the list. Both tables FK to lists
  // with ON DELETE RESTRICT (20260722120000), so the DB refuses the delete
  // either way — these checks exist to return a message the UI can render
  // instead of a raw Postgres constraint error.
  //
  // Read with the admin client: the owner is not the buyer/subscriber, and both
  // tables are row-owner scoped under RLS. Before 20260722120000 added an
  // owner-read policy this query returned zero rows for the owner every time,
  // which made the guard dead code.
  const [{ data: snapRows }, { data: subRows }] = await Promise.all([
    supabaseAdminClient.from('list_snapshot_purchases').select('id').eq('list_id', listId).limit(1),
    supabaseAdminClient
      .from('list_subscriptions')
      .select('id')
      .eq('list_id', listId)
      .in('status', ['active', 'trialing', 'past_due', 'unpaid'])
      .limit(1),
  ]);
  if (snapRows?.length) return { error: 'has_snapshot_purchases' };
  if (subRows?.length) return { error: 'has_active_subscriptions' };

  const { error } = await supabase.from('lists').delete().eq('id', listId);
  if (error) return { error: error.message };
  return { error: null };
}

export async function restaurantInMyLists(restaurantId) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user || !restaurantId) return { listIds: [], lists: [], error: null };
  const { data: myLists, error: lErr } = await supabase
    .from('lists')
    .select('id')
    .eq('user_id', user.id);
  if (lErr) return { listIds: [], lists: [], error: lErr.message };
  const listIds = (myLists ?? []).map((r) => r.id);
  if (listIds.length === 0) return { listIds: [], lists: [], error: null };
  const { data: items, error: iErr } = await supabase
    .from('list_items')
    .select('list_id')
    .eq('restaurant_id', restaurantId)
    .in('list_id', listIds);
  if (iErr) return { listIds: [], lists: [], error: iErr.message };
  const hit = new Set((items ?? []).map((r) => r.list_id));
  const { data: mem, error: mErr } = await supabase
    .from('list_members')
    .select('list_id')
    .eq('user_id', user.id)
    .eq('status', 'active');
  if (mErr) return { listIds: [...hit], lists: [], error: mErr.message };
  const memberListIds = (mem ?? []).map((r) => r.list_id);
  if (memberListIds.length === 0) return summarizeListsForViewer(supabase, hit);
  const { data: mItems, error: miErr } = await supabase
    .from('list_items')
    .select('list_id')
    .eq('restaurant_id', restaurantId)
    .in('list_id', memberListIds);
  if (miErr) return { listIds: [...hit], lists: [], error: miErr.message };
  (mItems ?? []).forEach((r) => hit.add(r.list_id));
  return summarizeListsForViewer(supabase, hit);
}

function sortListSummariesByName(rows) {
  return [...rows].sort((a, b) =>
    String(a.name ?? '').localeCompare(String(b.name ?? ''), undefined, { sensitivity: 'base' })
  );
}

/** Resolve `id` + `name` for list IDs the viewer may read (RLS). */
async function summarizeListsForViewer(supabase, listIdSet) {
  const listIds = [...listIdSet];
  if (listIds.length === 0) return { listIds: [], lists: [], error: null };
  const { data: rows, error } = await supabase.from('lists').select('id, name').in('id', listIds);
  if (error) return { listIds, lists: [], error: error.message };
  const lists = sortListSummariesByName(
    (rows ?? [])
      .map((r) => ({
        id: typeof r.id === 'string' ? r.id : String(r.id),
        name: typeof r.name === 'string' ? r.name.trim() || 'List' : 'List',
      }))
      .filter((r) => r.id)
  );
  return { listIds, lists, error: null };
}

/**
 * List titles for IDs the viewer can access (owned or active member). Used when only IDs are known (e.g. map cache).
 * @param {string[]} listIds
 */
export async function fetchListSummariesForViewer(listIds) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) return { lists: [], error: null };
  const ids = [...new Set((listIds ?? []).filter((id) => typeof id === 'string' && id))];
  if (ids.length === 0) return { lists: [], error: null };
  const { data: rows, error } = await supabase
    .from('lists')
    .select('id, name, cover_image_url, user_id')
    .in('id', ids);
  if (error) return { lists: [], error: error.message };
  const ownerIds = [...new Set((rows ?? []).map((r) => r.user_id).filter(Boolean))];
  const userById = {};
  if (ownerIds.length > 0) {
    const { data: userRows } = await supabase
      .from('users')
      .select('id, display_name, username, avatar_url')
      .in('id', ownerIds);
    (userRows ?? []).forEach((u) => {
      userById[u.id] = u;
    });
  }
  const lists = sortListSummariesByName(
    (rows ?? [])
      .map((r) => {
        const owner = r.user_id ? (userById[r.user_id] ?? null) : null;
        return {
          id: typeof r.id === 'string' ? r.id : String(r.id),
          name: typeof r.name === 'string' ? r.name.trim() || 'List' : 'List',
          cover_image_url:
            typeof r.cover_image_url === 'string' && r.cover_image_url.trim()
              ? r.cover_image_url.trim()
              : null,
          owner_id: r.user_id ?? null,
          owner_display_name: owner?.display_name ?? null,
          owner_username: owner?.username ?? null,
          owner_avatar_url: owner?.avatar_url ?? null,
        };
      })
      .filter((r) => r.id)
  );
  return { lists, error: null };
}

/**
 * Batch: which of the user's lists (owned + active member) contain each restaurant.
 * @param {string[]} restaurantIds
 * @returns {Promise<{ map: Record<string, string[]>, error: string | null }>}
 */
/**
 * All restaurants on the viewer’s lists (owned + active member), deduped, with coords for the map.
 *
 * @param {object} [options]
 * @param {string[] | null} [options.tagSlugs]
 * @param {boolean} [options.matchAll]
 * @param {string | null} [options.search]
 * @param {number | null} [options.minRating]
 * @param {'name' | 'rating_desc' | 'relevance' | 'distance'} [options.sort]
 * @param {number | null} [options.refLat]
 * @param {number | null} [options.refLng]
 * @returns {Promise<{ restaurants: Array<{ id: string, name: string, latitude: number, longitude: number, municipality_id: string | null, metadata: object }>, error?: string | null }>}
 */
export async function fetchSavedRestaurantsForMap(options = {}) {
  const {
    tagSlugs = null,
    matchAll = false,
    search = null,
    minRating = null,
    sort = 'name',
    refLat = null,
    refLng = null,
    openNow = false,
  } = options;
  const pTagSlugs = Array.isArray(tagSlugs) && tagSlugs.length > 0 ? tagSlugs : null;
  const pSearch = typeof search === 'string' && search.trim() ? search.trim() : null;
  const pMinRating =
    typeof minRating === 'number' && Number.isFinite(minRating) && minRating > 0 ? minRating : null;
  const allowedSort = new Set(['name', 'rating_desc', 'relevance', 'distance']);
  const pSort = allowedSort.has(sort) ? sort : 'name';
  const pRefLat =
    pSort === 'distance' && typeof refLat === 'number' && Number.isFinite(refLat) ? refLat : null;
  const pRefLng =
    pSort === 'distance' && typeof refLng === 'number' && Number.isFinite(refLng) ? refLng : null;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) {
    return { restaurants: [], error: null };
  }

  // Page through the RPC: a viewer with >1000 saved restaurants would otherwise lose
  // every pin past PostgREST's 1000-row window (the RPC has no LIMIT and orders by
  // name, so truncation silently drops the alphabetical tail). The RPC's ORDER BY is
  // stable, so `.range()` paging is deterministic. Same fix class as fetchLocationLocalities.
  let data;
  try {
    data = await fetchAllSupabasePages(async (from, pageSize) => {
      const { data: page, error } = await supabase
        .rpc('saved_restaurants_for_map', {
          p_tag_slugs: pTagSlugs,
          p_match_all: Boolean(matchAll),
          p_search: pSearch,
          p_min_rating: pMinRating,
          p_sort: pSort,
          p_ref_lat: pRefLat,
          p_ref_lng: pRefLng,
          p_open_now: openNow ? true : null,
        })
        .range(from, from + pageSize - 1);
      if (error) {
        throw error;
      }
      return page ?? [];
    }, SUPABASE_DEFAULT_PAGE_SIZE);
  } catch (e) {
    return { restaurants: [], error: e?.message ?? 'unknown' };
  }

  const restaurants = (data ?? [])
    .map((row) => {
      const lat = row.latitude != null ? Number(row.latitude) : NaN;
      const lng = row.longitude != null ? Number(row.longitude) : NaN;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      const openingStatus = normalizeOpeningStatus(row.opening_status ?? row.openingStatus);
      return {
        id: String(row.id),
        name: String(row.name ?? ''),
        address: typeof row.address === 'string' ? row.address : null,
        latitude: lat,
        longitude: lng,
        municipality_id: row.municipality_id != null ? String(row.municipality_id) : null,
        metadata: slimRestaurantCardMetadata(row.metadata) ?? {},
        is_sponsored: row.is_sponsored === true,
        // Time the restaurant was saved to the list, when the RPC surfaces it — powers the
        // "Last added" sort in the map sheet. Absent columns leave it null (sort falls back).
        added_at: row.added_at ?? row.saved_at ?? row.created_at ?? null,
        ...(openingStatus ? { openingStatus } : {}),
      };
    })
    .filter(Boolean);

  return { restaurants, error: null };
}

/**
 * @param {object} [options]
 * @param {string[] | null} [options.tagSlugs]
 * @param {boolean} [options.matchAll]
 * @param {string | null} [options.search]
 * @param {number | null} [options.minRating]
 * @param {'name' | 'rating_desc' | 'relevance' | 'distance'} [options.sort]
 * @param {number | null} [options.refLat]
 * @param {number | null} [options.refLng]
 * @returns {Promise<{ restaurants: Array<{ id: string, name: string, latitude: number, longitude: number, municipality_id: string | null, metadata: object }>, error?: string | null }>}
 */
export async function fetchFollowingRestaurantsForMap(options = {}) {
  const {
    tagSlugs = null,
    matchAll = false,
    search = null,
    minRating = null,
    sort = 'name',
    refLat = null,
    refLng = null,
    openNow = false,
  } = options;
  const pTagSlugs = Array.isArray(tagSlugs) && tagSlugs.length > 0 ? tagSlugs : null;
  const pSearch = typeof search === 'string' && search.trim() ? search.trim() : null;
  const pMinRating =
    typeof minRating === 'number' && Number.isFinite(minRating) && minRating > 0 ? minRating : null;
  const allowedSort = new Set(['name', 'rating_desc', 'relevance', 'distance']);
  const pSort = allowedSort.has(sort) ? sort : 'name';
  const pRefLat =
    pSort === 'distance' && typeof refLat === 'number' && Number.isFinite(refLat) ? refLat : null;
  const pRefLng =
    pSort === 'distance' && typeof refLng === 'number' && Number.isFinite(refLng) ? refLng : null;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) {
    return { restaurants: [], error: null };
  }

  // Page through the RPC: a viewer whose followed lists exceed 1000 combined pins would
  // otherwise lose every marker past PostgREST's 1000-row window (the RPC has no LIMIT
  // and orders by name, so truncation silently drops the alphabetical tail). The RPC's
  // ORDER BY is stable, so `.range()` paging is deterministic. Same fix class as
  // fetchLocationLocalities.
  let data;
  try {
    data = await fetchAllSupabasePages(async (from, pageSize) => {
      const { data: page, error } = await supabase
        .rpc('following_restaurants_for_map', {
          p_tag_slugs: pTagSlugs,
          p_match_all: Boolean(matchAll),
          p_search: pSearch,
          p_min_rating: pMinRating,
          p_sort: pSort,
          p_ref_lat: pRefLat,
          p_ref_lng: pRefLng,
          p_open_now: openNow ? true : null,
        })
        .range(from, from + pageSize - 1);
      if (error) {
        throw error;
      }
      return page ?? [];
    }, SUPABASE_DEFAULT_PAGE_SIZE);
  } catch (e) {
    return { restaurants: [], error: e?.message ?? 'unknown' };
  }

  const restaurants = (data ?? [])
    .map((row) => {
      const lat = row.latitude != null ? Number(row.latitude) : NaN;
      const lng = row.longitude != null ? Number(row.longitude) : NaN;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      const openingStatus = normalizeOpeningStatus(row.opening_status ?? row.openingStatus);
      return {
        id: String(row.id),
        name: String(row.name ?? ''),
        address: typeof row.address === 'string' ? row.address : null,
        latitude: lat,
        longitude: lng,
        municipality_id: row.municipality_id != null ? String(row.municipality_id) : null,
        metadata: slimRestaurantCardMetadata(row.metadata) ?? {},
        is_sponsored: row.is_sponsored === true,
        // Time the restaurant was saved to the list, when the RPC surfaces it — powers the
        // "Last added" sort in the map sheet. Absent columns leave it null (sort falls back).
        added_at: row.added_at ?? row.saved_at ?? row.created_at ?? null,
        ...(openingStatus ? { openingStatus } : {}),
      };
    })
    .filter(Boolean);

  return { restaurants, error: null };
}

/**
 * Lists owned by the viewer, for the map "Saved" chip dropdown (subset filter).
 * @returns {Promise<{ lists: Array<{ id: string, name: string, owner_username: string|null, owner_display_name: string|null, item_count: number }>, error: string|null }>}
 */
export async function fetchMyOwnedListsForMapDropdown() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) return { lists: [], error: null };

  const { data, error } = await supabase.rpc('map_my_owned_lists');
  if (error) return { lists: [], error: error.message };

  const lists = (data ?? [])
    .filter((row) => row?.id != null && String(row.id).trim() !== '')
    .map((row) => {
      const ic = row.item_count;
      let item_count = 0;
      if (typeof ic === 'bigint') {
        item_count = Number(ic);
      } else if (typeof ic === 'number' && Number.isFinite(ic)) {
        item_count = ic;
      } else if (typeof ic === 'string' && ic !== '') {
        const parsed = Number(ic);
        item_count = Number.isFinite(parsed) ? parsed : 0;
      }
      return {
        id: String(row.id),
        name: row.name,
        description: row.description,
        cover_image_url: row.cover_image_url,
        visibility: row.visibility,
        published_at: row.published_at,
        updated_at: row.updated_at,
        owner_username: row.owner_username ?? null,
        owner_display_name: row.owner_display_name ?? null,
        item_count,
      };
    });
  return { lists: filterE2eTestListsForDisplay(lists), error: null };
}

/**
 * Lists where the viewer is an active collaborator (but not owner), for the map "My own"
 * chip dropdown's "Shared with me" group.
 * @returns {Promise<{ lists: Array<{ id: string, name: string, owner_username: string|null, owner_display_name: string|null, item_count: number }>, error: string|null }>}
 */
export async function fetchMyCollaboratorListsForMapDropdown() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) return { lists: [], error: null };

  const { data, error } = await supabase.rpc('map_my_collaborator_lists');
  if (error) return { lists: [], error: error.message };

  const lists = (data ?? [])
    .filter((row) => row?.id != null && String(row.id).trim() !== '')
    .map((row) => {
      const ic = row.item_count;
      let item_count = 0;
      if (typeof ic === 'bigint') {
        item_count = Number(ic);
      } else if (typeof ic === 'number' && Number.isFinite(ic)) {
        item_count = ic;
      } else if (typeof ic === 'string' && ic !== '') {
        const parsed = Number(ic);
        item_count = Number.isFinite(parsed) ? parsed : 0;
      }
      return {
        id: String(row.id),
        name: row.name,
        description: row.description,
        cover_image_url: row.cover_image_url,
        visibility: row.visibility,
        published_at: row.published_at,
        updated_at: row.updated_at,
        owner_username: row.owner_username ?? null,
        owner_display_name: row.owner_display_name ?? null,
        item_count,
      };
    });
  return { lists: filterE2eTestListsForDisplay(lists), error: null };
}

/**
 * Fetch restaurants from specific list IDs for the map while preserving the same
 * tag/search/rating/sort behavior as `fetchSavedRestaurantsForMap`. Accepts both
 * owned list IDs and IDs of lists where the viewer is an active collaborator.
 *
 * @param {string[]} listIds
 * @param {object} [options]
 * @param {string[] | null} [options.tagSlugs]
 * @param {boolean} [options.matchAll]
 * @param {string | null} [options.search]
 * @param {number | null} [options.minRating]
 * @param {'name' | 'rating_desc' | 'relevance' | 'distance'} [options.sort]
 * @param {number | null} [options.refLat]
 * @param {number | null} [options.refLng]
 * @returns {Promise<{ restaurants: Array<{ id: string, name: string, latitude: number, longitude: number, municipality_id: string | null, metadata: object, is_sponsored: boolean }>, error?: string | null }>}
 */
export async function fetchSavedRestaurantsForMapByListIds(listIds, options = {}) {
  if (!Array.isArray(listIds) || listIds.length === 0) {
    return { restaurants: [], error: null };
  }
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) return { restaurants: [], error: null };

  const supabase = await createSupabaseServerClient();
  const [{ data: ownedListsData }, { data: collaboratorListsData }] = await Promise.all([
    supabase.rpc('map_my_owned_lists'),
    supabase.rpc('map_my_collaborator_lists'),
  ]);
  const accessibleListIdSet = new Set([
    ...(ownedListsData ?? []).map((l) => String(l.id)),
    ...(collaboratorListsData ?? []).map((l) => String(l.id)),
  ]);
  const validListIds = listIds.filter((id) => accessibleListIdSet.has(String(id)));

  if (validListIds.length === 0) {
    return { restaurants: [], error: null };
  }

  const { data: listItemRows, error } = await supabaseAdminClient
    .from('list_items')
    .select('restaurant_id')
    .in('list_id', validListIds);

  if (error) return { restaurants: [], error: error.message };

  const allowedRestaurantIds = new Set(
    (listItemRows ?? [])
      .map((row) => (row?.restaurant_id != null ? String(row.restaurant_id) : ''))
      .filter(Boolean)
  );
  if (allowedRestaurantIds.size === 0) return { restaurants: [], error: null };

  const { restaurants: filteredRestaurants, error: filteredError } =
    await fetchSavedRestaurantsForMap(options);
  if (filteredError) return { restaurants: [], error: filteredError };

  const restaurants = (filteredRestaurants ?? []).filter((r) =>
    allowedRestaurantIds.has(String(r.id))
  );
  return { restaurants, error: null };
}

/**
 * Fetch restaurants from specific followed list IDs for the map while preserving
 * the same tag/search/rating/sort behavior as `fetchFollowingRestaurantsForMap`.
 *
 * @param {string[]} listIds
 * @param {object} [options]
 * @param {string[] | null} [options.tagSlugs]
 * @param {boolean} [options.matchAll]
 * @param {string | null} [options.search]
 * @param {number | null} [options.minRating]
 * @param {'name' | 'rating_desc' | 'relevance' | 'distance'} [options.sort]
 * @param {number | null} [options.refLat]
 * @param {number | null} [options.refLng]
 * @returns {Promise<{ restaurants: Array<{ id: string, name: string, latitude: number, longitude: number, municipality_id: string | null, metadata: object, is_sponsored: boolean }>, error?: string | null }>}
 */
export async function fetchFollowingRestaurantsForMapByListIds(listIds, options = {}) {
  if (!Array.isArray(listIds) || listIds.length === 0) {
    return { restaurants: [], error: null };
  }
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) return { restaurants: [], error: null };

  // Validate that the requested list IDs belong to lists the user actually follows.
  // list_items RLS only allows reading items from lists the user owns, so we use the
  // admin client after confirming ownership via the map_following_lists RPC.
  const supabase = await createSupabaseServerClient();
  const { data: followedListsData } = await supabase.rpc('map_following_lists');
  const followedListIdSet = new Set((followedListsData ?? []).map((l) => String(l.id)));
  const validListIds = listIds.filter((id) => followedListIdSet.has(String(id)));

  if (validListIds.length === 0) {
    return { restaurants: [], error: null };
  }

  const { data: listItemRows, error } = await supabaseAdminClient
    .from('list_items')
    .select('restaurant_id')
    .in('list_id', validListIds);

  if (error) return { restaurants: [], error: error.message };

  const allowedRestaurantIds = new Set(
    (listItemRows ?? [])
      .map((row) => (row?.restaurant_id != null ? String(row.restaurant_id) : ''))
      .filter(Boolean)
  );
  if (allowedRestaurantIds.size === 0) return { restaurants: [], error: null };

  const { restaurants: filteredRestaurants, error: filteredError } =
    await fetchFollowingRestaurantsForMap(options);
  if (filteredError) return { restaurants: [], error: filteredError };

  const restaurants = (filteredRestaurants ?? []).filter((r) =>
    allowedRestaurantIds.has(String(r.id))
  );
  return { restaurants, error: null };
}

/**
 * Lists owned by users the viewer follows (user_follows), used to populate the
 * map "Following" chip dropdown. Matches the source of following_restaurants_for_map.
 * @returns {Promise<{ lists: Array<{ id: string, name: string, owner_username: string|null, owner_display_name: string|null, item_count: number }>, error: string|null }>}
 * `item_count` is the live list size for subscribers; for snapshot-only access it matches the
 * purchase capture size (or full list size when capture is legacy-null).
 */
export async function fetchFollowingListsForMapDropdown() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) return { lists: [], error: null };

  const { data, error } = await supabase.rpc('map_following_lists');
  if (error) return { lists: [], error: error.message };

  const lists = (data ?? [])
    .filter((row) => row?.id != null && String(row.id).trim() !== '')
    .map((row) => {
      const ic = row.item_count;
      let item_count = 0;
      if (typeof ic === 'bigint') {
        item_count = Number(ic);
      } else if (typeof ic === 'number' && Number.isFinite(ic)) {
        item_count = ic;
      } else if (typeof ic === 'string' && ic !== '') {
        const parsed = Number(ic);
        item_count = Number.isFinite(parsed) ? parsed : 0;
      }
      return {
        id: String(row.id),
        name: row.name,
        description: row.description,
        cover_image_url: row.cover_image_url,
        visibility: row.visibility,
        published_at: row.published_at,
        updated_at: row.updated_at,
        owner_username: row.owner_username ?? null,
        owner_display_name: row.owner_display_name ?? null,
        item_count,
      };
    });
  return { lists: filterE2eTestListsForDisplay(lists), error: null };
}

/**
 * For a set of visible restaurant IDs, returns which followed users (public lists + subscribed)
 * have each restaurant on their list. Used to show social "who has this" rings on the map sheet.
 *
 * @param {string[]} restaurantIds
 * @returns {Promise<{ map: Record<string, Array<{ userId: string, displayName: string | null, username: string | null, avatarUrl: string | null }>>, error: string | null }>}
 */
export async function fetchFollowingListOwnersForRestaurants(restaurantIds) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) return { map: {}, error: null };

  const ids = [...new Set((restaurantIds ?? []).map(String).filter(Boolean))];
  if (ids.length === 0) return { map: {}, error: null };

  // Fetch lists from followed users that the viewer can access (handles visibility + subscriptions)
  const { data: followingLists, error: flErr } = await supabase.rpc('map_following_lists');
  if (flErr) return { map: {}, error: flErr.message };

  const followingListIds = (followingLists ?? []).map((r) => String(r.id)).filter(Boolean);
  if (followingListIds.length === 0) return { map: {}, error: null };

  // Fetch list ownership and list_items in parallel
  const [{ data: listUserRows }, { data: items, error: iErr }] = await Promise.all([
    supabase.from('lists').select('id, user_id').in('id', followingListIds),
    supabase
      .from('list_items')
      .select('restaurant_id, list_id')
      .in('list_id', followingListIds)
      .in('restaurant_id', ids),
  ]);
  if (iErr) return { map: {}, error: iErr.message };
  if (!items?.length) return { map: {}, error: null };

  const ownerIds = [...new Set((listUserRows ?? []).map((l) => l?.user_id).filter(Boolean))];
  if (ownerIds.length === 0) return { map: {}, error: null };

  // RLS allows users to SELECT only their own row; use SECURITY DEFINER RPC limited to followed users.
  const { data: userRows, error: profErr } = await supabase.rpc('map_following_owner_profiles', {
    p_user_ids: ownerIds,
  });
  if (profErr) {
    console.warn(
      '[fetchFollowingListOwnersForRestaurants] map_following_owner_profiles:',
      profErr.message
    );
    return { map: {}, error: profErr.message };
  }

  return {
    map: buildFollowingListOwnersMap(items, listUserRows, userRows),
    error: null,
  };
}

/**
 * Complete "who you follow has this" map for the viewer — every restaurant on any following list
 * the viewer can access, keyed restaurant id → followed owners. The bounded
 * {@link fetchFollowingListOwnersForRestaurants} only covers a passed-in id set (the map's detail
 * slice), so the avatar badges went missing on pins outside it. This returns the whole set so the
 * map can badge every pin, viewport-independent. The `list_items` read is paged past PostgREST's
 * 1000-row window (a following graph spanning many lists easily exceeds it).
 *
 * @returns {Promise<{ map: Record<string, Array<{ userId: string, displayName: string | null, username: string | null, avatarUrl: string | null }>>, complete: boolean, error: string | null }>}
 */
export async function fetchViewerFollowingOwnersMap() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) return { map: {}, complete: false, error: null };

  const { data: followingLists, error: flErr } = await supabase.rpc('map_following_lists');
  if (flErr) return { map: {}, complete: false, error: flErr.message };

  const followingListIds = (followingLists ?? []).map((r) => String(r.id)).filter(Boolean);
  if (followingListIds.length === 0) {
    // No accessible following lists — a complete (empty) answer.
    return { map: {}, complete: true, error: null };
  }

  try {
    const [{ data: listUserRows }, items] = await Promise.all([
      supabase.from('lists').select('id, user_id').in('id', followingListIds),
      fetchAllSupabasePages(async (from, pageSize) => {
        const { data, error } = await supabase
          .from('list_items')
          .select('restaurant_id, list_id')
          .in('list_id', followingListIds)
          .range(from, from + pageSize - 1);
        if (error) throw error;
        return data ?? [];
      }, SUPABASE_DEFAULT_PAGE_SIZE),
    ]);

    if (items.length === 0) return { map: {}, complete: true, error: null };

    const ownerIds = [...new Set((listUserRows ?? []).map((l) => l?.user_id).filter(Boolean))];
    if (ownerIds.length === 0) return { map: {}, complete: true, error: null };

    const { data: userRows, error: profErr } = await supabase.rpc('map_following_owner_profiles', {
      p_user_ids: ownerIds,
    });
    if (profErr) {
      console.warn(
        '[fetchViewerFollowingOwnersMap] map_following_owner_profiles:',
        profErr.message
      );
      return { map: {}, complete: false, error: profErr.message };
    }

    return {
      map: buildFollowingListOwnersMap(items, listUserRows, userRows),
      complete: true,
      error: null,
    };
  } catch (e) {
    return { map: {}, complete: false, error: e?.message ?? 'unknown' };
  }
}

/**
 * Follow-circle (you + people you follow who have this restaurant on a list) for one restaurant.
 * Returns `null` when not signed in or no circle data exists.
 */
export async function fetchFollowCircleForRestaurant(restaurantId) {
  const id = normUuid(restaurantId);
  if (!id) return { circle: null, error: null };
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) return { circle: null, error: null };
  const { data, error } = await supabase.rpc('restaurant_follow_circle_for_viewer', {
    p_restaurant_id: id,
  });
  if (error) {
    return { circle: null, error: error.message };
  }
  return { circle: normalizeFollowCircle(data), error: null };
}

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

  const { data: myLists, error: lErr } = await supabase
    .from('lists')
    .select('id')
    .eq('user_id', user.id);
  if (lErr) return { map: {}, error: lErr.message };

  const ownedListIds = (myLists ?? []).map((r) => r.id);
  const listIdSet = new Set(ownedListIds);

  const { data: mem, error: mErr } = await supabase
    .from('list_members')
    .select('list_id')
    .eq('user_id', user.id)
    .eq('status', 'active');
  if (mErr) return { map: {}, error: mErr.message };

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

  const { data: myLists, error: lErr } = await supabase
    .from('lists')
    .select('id')
    .eq('user_id', user.id);
  if (lErr) return { map: {}, complete: false, error: lErr.message };

  const listIdSet = new Set((myLists ?? []).map((r) => r.id));

  const { data: mem, error: mErr } = await supabase
    .from('list_members')
    .select('list_id')
    .eq('user_id', user.id)
    .eq('status', 'active');
  if (mErr) return { map: {}, complete: false, error: mErr.message };

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
  const { data: minRows } = await supabase
    .from('list_items')
    .select('list_id, sort_order')
    .in('list_id', listIds)
    .order('sort_order', { ascending: true });
  const minByList = new Map();
  (minRows ?? []).forEach((r) => {
    if (!minByList.has(r.list_id)) minByList.set(r.list_id, r.sort_order);
  });
  // Which lists already contain this restaurant? Re-adding is a no-op upsert and
  // must NOT re-notify followers — only the newly added lists should.
  const { data: existingRows } = await supabase
    .from('list_items')
    .select('list_id')
    .eq('restaurant_id', restaurantId)
    .in('list_id', listIds);
  const alreadyOnList = new Set((existingRows ?? []).map((r) => r.list_id));
  const newlyAddedListIds = listIds.filter((id) => !alreadyOnList.has(id));
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
  // Fire-and-forget: notify Live List subscribers for each affected list, and
  // notify followers/subscribers only for lists this restaurant is newly on.
  listIds.forEach((id) => {
    notifyLiveListSubscribers(supabase, id).catch(() => {});
  });
  newlyAddedListIds.forEach((id) => {
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
  notifyLiveListSubscribers(supabase, listId).catch(() => {});
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

export async function fetchListMembershipForViewer(listId) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user)
    return { isOwner: false, isEditor: false, isMember: false, pending: null, error: null };
  const { data: list } = await supabase
    .from('lists')
    .select('user_id')
    .eq('id', listId)
    .maybeSingle();
  if (!list)
    return { isOwner: false, isEditor: false, isMember: false, pending: null, error: 'not_found' };
  if (list.user_id === user.id) {
    return { isOwner: true, isEditor: true, isMember: true, pending: null, error: null };
  }
  const { data: row } = await supabase
    .from('list_members')
    .select('status, role')
    .eq('list_id', listId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!row) return { isOwner: false, isEditor: false, isMember: false, pending: null, error: null };
  const isMember = row.status === 'active';
  let pending = null;
  if (row.status === 'pending_invite') {
    pending = 'invite';
  } else if (row.status === 'pending_request') {
    pending = 'request';
  }
  const isEditor = isMember && row.role === 'editor';
  return { isOwner: false, isEditor, isMember, pending, error: null };
}

/**
 * @param {string} listId
 * @param {{ viewerLang?: 'en' | 'pt' | Promise<'en' | 'pt' | string> }} [opts]
 */
export async function fetchListForManage(listId, opts = {}) {
  const viewerLangPromise = resolveViewerLangInput(opts.viewerLang);
  const supabase = await createSupabaseServerClient();
  const { data: list, error: lErr } = await supabase
    .from('lists')
    .select(
      `
      id,
      user_id,
      name,
      description,
      cover_image_url,
      visibility,
      published_at,
      updated_at,
      paid_access_enabled,
      monthly_amount_cents,
      currency,
      stripe_price_id,
      stripe_product_id
    `
    )
    .eq('id', listId)
    .maybeSingle();
  if (lErr || !list)
    return {
      list: null,
      items: [],
      members: [],
      listOwner: null,
      error: lErr?.message ?? 'not_found',
    };
  const { data: items, error: iErr } = await supabase
    .from('list_items')
    .select(
      `
      id,
      restaurant_id,
      sort_order,
      added_by,
      list_item_must_try_dishes (
        id,
        tag_id,
        label,
        label_locale,
        sort_order,
        tags ( id, label, slug )
      ),
      restaurants (
        id,
        name,
        address,
        latitude,
        longitude,
        phone,
        rating,
        maps_link,
        metadata,
        restaurant_images (
          id,
          url,
          sort_order,
          moderation_status
        )
      )
    `
    )
    .eq('list_id', listId)
    .order('sort_order', { ascending: true });
  if (iErr)
    return {
      list,
      items: [],
      members: [],
      listOwner: null,
      error: iErr.message,
    };
  const viewerLang = await viewerLangPromise;
  // Enrich and members RPC don't depend on each other (async-parallel).
  const [itemsWithMustTry, membersResult] = await Promise.all([
    enrichListItemsWithReviewsAndMustTry(supabase, items ?? [], viewerLang),
    supabase.rpc('list_members_with_profiles', { p_list_id: listId }),
  ]);
  const { data: memberRows, error: mErr } = membersResult;
  if (mErr)
    return {
      list,
      items: itemsWithMustTry,
      members: [],
      listOwner: null,
      error: mErr.message,
    };
  const members = (memberRows ?? []).map((r) => ({
    user_id: r.user_id,
    role: r.role,
    status: r.status,
    invited_by: r.invited_by,
    created_at: r.created_at,
    users: {
      display_name: r.display_name,
      username: r.username,
      avatar_url: r.avatar_url,
    },
  }));

  const { data: ownerRows, error: oErr } = await supabase.rpc('list_manage_owner_profile', {
    p_list_id: listId,
  });
  const ownerRow = !oErr && ownerRows?.[0] ? ownerRows[0] : null;
  const listOwner = ownerRow
    ? {
        user_id: ownerRow.owner_id,
        users: {
          display_name: ownerRow.display_name,
          username: ownerRow.username,
          avatar_url: ownerRow.avatar_url,
        },
      }
    : null;

  /** When the viewer owns the list, sync Connect status and look up creator's bundle price. */
  let ownerStripeChargesEnabled = null;
  let bundlePriceCents = null;
  let bundleCurrency = 'eur';
  const {
    data: { user: manageViewer },
  } = await getSupabaseAuthUser();
  if (manageViewer?.id && list.user_id === manageViewer.id) {
    const [st, bundleResult] = await Promise.all([
      getMyStripeConnectStatus(),
      supabase
        .from('lists')
        .select('monthly_amount_cents, currency')
        .eq('user_id', manageViewer.id)
        .eq('paid_access_enabled', true)
        .not('stripe_price_id', 'is', null)
        .limit(1)
        .maybeSingle(),
    ]);
    ownerStripeChargesEnabled =
      st && typeof st === 'object' && 'error' in st && st.error
        ? false
        : Boolean(st?.chargesEnabled);
    bundlePriceCents = bundleResult.data?.monthly_amount_cents ?? null;
    bundleCurrency = bundleResult.data?.currency ?? 'eur';
  }

  return {
    list,
    items: itemsWithMustTry,
    members,
    listOwner,
    error: null,
    ownerStripeChargesEnabled,
    bundlePriceCents,
    bundleCurrency,
  };
}

/**
 * Resolve a /lists/[creatorHandle]/[listSlug] URL to a list UUID.
 * Returns the list id or null if not found.
 * @param {string} creatorHandle — username from users table (no @ prefix)
 * @param {string} listSlug
 */
export async function resolveListSlug(creatorHandle, listSlug) {
  const supabase = await createSupabaseServerClient();
  const handle = creatorHandle.replace(/^@/, '').toLowerCase().trim();
  if (!handle || !listSlug) return null;
  // `users` table RLS blocks anon reads, so use the SECURITY DEFINER RPC that
  // resolves a username → user_id for anyone (including signed-out viewers).
  const { data: ownerId } = await supabase.rpc('resolve_user_id_from_username', {
    p_username: handle,
  });
  if (!ownerId) return null;
  const { data: list } = await supabase
    .from('lists')
    .select('id')
    .eq('user_id', ownerId)
    .eq('slug', listSlug.toLowerCase().trim())
    .maybeSingle();
  return list?.id ?? null;
}

/**
 * Owner: generate and persist a slug for a list from its name.
 * Appends -2, -3 etc. if the slug is already taken by another of the creator's lists.
 * @param {string} listId
 */
export async function ensureListSlug(listId) {
  // Uses admin client so this can be called fire-and-forget from any context
  // (server actions, webhooks, post-create hooks) without needing an auth session.
  const { supabaseAdminClient: admin } = await import('src/libs/supabase/supabase-admin');

  const { data: list } = await admin
    .from('lists')
    .select('id, user_id, name, slug')
    .eq('id', listId)
    .maybeSingle();
  if (!list) return { error: 'not_found' };
  if (list.slug) return { error: null, slug: list.slug }; // already set

  const base =
    (list.name ?? 'list')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-{2,}/g, '-')
      .slice(0, 60)
      .replace(/^-|-$/g, '') || 'list';

  // Find a unique slug for this creator
  const { data: existing } = await admin
    .from('lists')
    .select('slug')
    .eq('user_id', list.user_id)
    .like('slug', `${base}%`);

  const taken = new Set((existing ?? []).map((r) => r.slug).filter(Boolean));
  let slug = base;
  let n = 2;
  while (taken.has(slug)) {
    slug = `${base}-${n}`;
    n += 1;
  }

  const { error } = await admin.from('lists').update({ slug }).eq('id', listId);
  return error ? { error: error.message } : { error: null, slug };
}

/**
 * Lightweight metadata fetch for generateMetadata / OG tags.
 * No auth, no items — just what's needed for social previews.
 * @param {string} listId
 */
export async function fetchListMetadata(listId) {
  const supabase = await createSupabaseServerClient();
  const { data: list } = await supabase
    .from('lists')
    .select('id, name, description, cover_image_url, visibility, published_at, user_id, slug')
    .eq('id', listId)
    .maybeSingle();
  if (!list || list.visibility === 'private') return null;
  if (list.visibility === 'public_subscribers' && !list.published_at) return null;
  const ownerRpc = list.published_at ? 'published_list_owner' : 'list_owner_snapshot';
  const { data: ownerRows } = await supabase.rpc(ownerRpc, { p_list_id: listId });
  const orow = Array.isArray(ownerRows) ? ownerRows[0] : ownerRows;
  return {
    name: list.name ?? '',
    description: list.description ?? '',
    coverImageUrl: list.cover_image_url ?? null,
    ownerName: orow?.display_name || orow?.username || null,
    ownerUsername: orow?.username ?? null,
    slug: list.slug ?? null,
  };
}

/** PostgREST `not.in` URL length safety; larger captures fall back to id fetch + filter. */
const SNAPSHOT_NEW_COUNT_NOT_IN_MAX = 250;

/**
 * Count live `list_items` on a list that are not in the snapshot capture (places added or kept
 * on the list but outside the buyer's frozen set). Uses the admin client so the count matches
 * the full list regardless of snapshot RLS filtering on reads.
 *
 * @param {string} listId
 * @param {string[]} captureIds
 * @returns {Promise<number | null>}
 */
async function countListItemsNotInCaptureForSnapshot(listId, captureIds) {
  if (!listId || !Array.isArray(captureIds)) return null;
  const admin = supabaseAdminClient;

  if (captureIds.length === 0) {
    const { count, error } = await admin
      .from('list_items')
      .select('id', { count: 'exact', head: true })
      .eq('list_id', listId);
    if (error) return null;
    return count ?? 0;
  }

  if (captureIds.length <= SNAPSHOT_NEW_COUNT_NOT_IN_MAX) {
    const inList = `(${captureIds.join(',')})`;
    const { count, error } = await admin
      .from('list_items')
      .select('id', { count: 'exact', head: true })
      .eq('list_id', listId)
      .not('id', 'in', inList);
    if (!error) return count ?? 0;
  }

  const { data: rows, error: fetchErr } = await admin
    .from('list_items')
    .select('id')
    .eq('list_id', listId);
  if (fetchErr) return null;
  const cap = new Set(captureIds);
  return (rows ?? []).filter((r) => r?.id && !cap.has(r.id)).length;
}

/**
 * Legacy snapshot rows without `captured_list_item_ids`: approximate "new since snapshot" using
 * `created_at` vs earliest purchase time for this list.
 *
 * @param {string} listId
 * @param {string} sinceIso
 * @returns {Promise<number | null>}
 */
async function countListItemsCreatedAfterForSnapshot(listId, sinceIso) {
  if (!listId || !sinceIso) return null;
  const { count, error } = await supabaseAdminClient
    .from('list_items')
    .select('id', { count: 'exact', head: true })
    .eq('list_id', listId)
    .gt('created_at', sinceIso);
  if (error) return null;
  return count ?? 0;
}

/**
 * List read model for `/lists/:id` and `/dashboard/lists/:id`.
 * Public lists behave as before; private lists load for owner, active members,
 * and invitees with status pending_invite.
 *
 * @param {string} listId
 * @param {{ viewerLang?: 'en' | 'pt' | Promise<'en' | 'pt' | string> }} [opts]
 */
export async function fetchListPage(listId, opts = {}) {
  const viewerLangPromise = resolveViewerLangInput(opts.viewerLang);
  const supabase = await createSupabaseServerClient();
  const listPromise = supabase
    .from('lists')
    .select(
      `
      id,
      user_id,
      name,
      description,
      cover_image_url,
      visibility,
      published_at,
      paid_access_enabled,
      monthly_amount_cents,
      currency,
      list_updated_at,
      slug
    `
    )
    .eq('id', listId)
    .maybeSingle();
  // Auth is independent of the list row — overlap the round-trips (async-parallel).
  const [listResult, authResult] = await Promise.all([listPromise, getSupabaseAuthUser()]);
  const { data: list, error: lErr } = listResult;
  if (lErr || !list)
    return {
      list: null,
      items: [],
      owner: null,
      membership: null,
      paidAccess: null,
      error: lErr?.message ?? 'not_found',
    };

  const {
    data: { user },
  } = authResult;
  const membership = user ? await fetchListMembershipForViewer(listId) : null;

  let hasPaidSubscription = false;
  let accessType = null; // 'snapshot' | 'subscription' | null
  let snapshotPurchasedAt = null;
  /** `null` = do not filter items; array = snapshot capture (possibly empty) */
  let snapshotCapturedItemIds = null;
  /** Snapshot purchase rows (used for legacy "new since" counts when capture ids are missing). */
  let snapRows = [];

  if (user?.id) {
    const [subResult, snapResult] = await Promise.all([
      supabase
        .from('list_subscriptions')
        .select('status, list_id')
        .eq('subscriber_user_id', user.id)
        .in('status', ['active', 'trialing']),
      supabase
        .from('list_snapshot_purchases')
        .select('purchased_at, captured_list_item_ids')
        .eq('buyer_user_id', user.id)
        .eq('list_id', listId)
        .order('purchased_at', { ascending: false }),
    ]);

    snapRows = snapResult.data ?? [];
    const subListIds = [...new Set((subResult.data ?? []).map((r) => r.list_id).filter(Boolean))];
    let creatorBundleSubscription = false;
    if (subListIds.length) {
      const { data: subbedLists } = await supabase
        .from('lists')
        .select('user_id, paid_access_enabled')
        .in('id', subListIds);
      const ownerIds = new Set(
        (subbedLists ?? []).filter((l) => Boolean(l.paid_access_enabled)).map((l) => l.user_id)
      );
      creatorBundleSubscription = ownerIds.has(list.user_id);
    }

    if (creatorBundleSubscription) {
      hasPaidSubscription = true;
      accessType = 'subscription';
      snapshotPurchasedAt = null;
      snapshotCapturedItemIds = null;
    } else if (snapRows.length) {
      hasPaidSubscription = true;
      accessType = 'snapshot';
      snapshotPurchasedAt = snapRows[0]?.purchased_at ?? null;
      snapshotCapturedItemIds = mergeSnapshotPurchaseCapturedItemIds(snapRows);
    }
  }

  const creatorDeleted = list.user_id === null;

  // Stripe Connect readiness for paywall copy. Do not read `customers` directly: RLS only
  // allows selecting your own row, so viewers see null → false and a bogus "payments not
  // enabled" message. Use SECURITY DEFINER RPC (same pattern as `creator_payout_ready` on
  // `public_user_profile_by_username`).
  let chargesEnabled = true;
  if (list.paid_access_enabled && !creatorDeleted) {
    const { data: chargesRpc, error: chargesRpcErr } = await supabase.rpc(
      'public_list_creator_charges_enabled',
      { p_list_id: listId }
    );
    // Only an explicit true means payouts are ready; null/false should disable paywall CTAs.
    if (chargesRpcErr || chargesRpc !== true) {
      chargesEnabled = false;
    }
  }

  const snapshotAmountCents = computeListSnapshotAmountCents(list.monthly_amount_cents);

  const paidAccess = {
    enabled: Boolean(list.paid_access_enabled),
    amountCents: list.monthly_amount_cents ?? null,
    snapshotAmountCents,
    currency: (list.currency && String(list.currency)) || 'eur',
    hasSubscription: hasPaidSubscription,
    accessType,
    snapshotPurchasedAt,
    /**
     * Snapshot purchase size (distinct list_items in capture). Null when not a snapshot viewer
     * or legacy rows where capture ids were never stored (same semantics as list page: full list).
     */
    snapshotPurchasedItemCount:
      accessType === 'snapshot' && Array.isArray(snapshotCapturedItemIds)
        ? snapshotCapturedItemIds.length
        : null,
    /** Places on the live list that are not in this buyer's snapshot capture (null = unknown). */
    snapshotNewRestaurantCount: null,
    listUpdatedAt: list.list_updated_at ?? null,
    creatorDeleted,
    chargesEnabled,
    hasMore: false,
  };

  if (accessType === 'snapshot') {
    if (snapshotCapturedItemIds !== null) {
      paidAccess.snapshotNewRestaurantCount = await countListItemsNotInCaptureForSnapshot(
        listId,
        snapshotCapturedItemIds
      );
    } else if (snapRows.length) {
      const oldestPurchasedAt = snapRows.reduce((acc, r) => {
        const p = r?.purchased_at;
        if (!p) return acc;
        return !acc || p < acc ? p : acc;
      }, null);
      if (oldestPurchasedAt) {
        paidAccess.snapshotNewRestaurantCount = await countListItemsCreatedAfterForSnapshot(
          listId,
          oldestPurchasedAt
        );
      }
    }
  }

  const shouldGate = paidAccess.enabled && !hasPaidSubscription && !membership?.isOwner;

  if (list.visibility === 'private') {
    const canViewPrivateList =
      membership?.isOwner ||
      membership?.isMember ||
      membership?.pending === 'invite' ||
      hasPaidSubscription;
    if (!canViewPrivateList) {
      return {
        list: null,
        items: [],
        owner: null,
        membership: null,
        paidAccess: null,
        error: 'not_public',
      };
    }
  } else if (list.visibility === 'public_subscribers' && !list.published_at && !user) {
    const { data: ownerRows } = await supabase.rpc('list_owner_snapshot', { p_list_id: listId });
    const orow = Array.isArray(ownerRows) ? ownerRows[0] : ownerRows;
    const owner = orow
      ? {
          id: orow.owner_id,
          display_name: orow.display_name,
          username: orow.username,
          avatar_url: orow.avatar_url,
        }
      : null;
    return {
      list,
      items: [],
      owner,
      membership: null,
      paidAccess,
      error: 'login_required',
    };
  }

  const listItemsSelect = `
      id,
      restaurant_id,
      sort_order,
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
      restaurants (
        id,
        name,
        address,
        latitude,
        longitude,
        phone,
        rating,
        maps_link,
        metadata,
        restaurant_images (
          id,
          url,
          sort_order,
          moderation_status
        )
      )
    `;

  let rawItems = [];
  let iErr = null;
  if (
    accessType === 'snapshot' &&
    snapshotCapturedItemIds !== null &&
    snapshotCapturedItemIds.length === 0
  ) {
    rawItems = [];
  } else {
    // Shared base query. Stable secondary sort on `id` keeps `.range()` paging deterministic
    // across page boundaries when `created_at` ties.
    const buildItemsPage = (from, pageSize) => {
      let q = supabase.from('list_items').select(listItemsSelect).eq('list_id', listId);
      if (accessType === 'snapshot' && snapshotCapturedItemIds !== null) {
        q = q.in('id', snapshotCapturedItemIds);
      }
      return q
        .order('created_at', { ascending: false })
        .order('id', { ascending: true })
        .range(from, from + pageSize - 1);
    };
    if (shouldGate) {
      // Freemium gate: `list_items` RLS denies non-buyers on gated lists entirely, so a raw
      // select returns 0 rows. The SECURITY DEFINER RPC is the single audited exception: it
      // returns only the N most-recent places (capped server side too) plus whether more places
      // are locked behind the paywall.
      const { data: preview, error: previewErr } = await supabase.rpc(
        'list_freemium_preview_items',
        { p_list_id: listId, p_limit: LIST_FREEMIUM_FREE_PLACES_COUNT }
      );
      rawItems = Array.isArray(preview?.items) ? preview.items : [];
      paidAccess.hasMore = Boolean(preview?.has_more);
      iErr = previewErr;
    } else {
      // Full list: page past PostgREST's 1000-row window so lists with >1000 places aren't
      // silently truncated (previously hard-capped at .limit(1000)).
      try {
        rawItems = await fetchAllSupabasePages(async (from, pageSize) => {
          const { data: page, error } = await buildItemsPage(from, pageSize);
          if (error) {
            throw error;
          }
          return page ?? [];
        }, SUPABASE_DEFAULT_PAGE_SIZE);
      } catch (e) {
        iErr = e;
      }
    }
  }
  if (iErr)
    return { list, items: [], owner: null, membership: null, paidAccess, error: iErr.message };

  let visibleItems = rawItems ?? [];
  if (shouldGate) {
    // hasMore already came from the RPC; the slice is only a belt-and-braces cap in case the
    // RPC's server-side ceiling and FREEMIUM_PREVIEW_COUNT ever drift apart.
    visibleItems = visibleItems.slice(0, LIST_FREEMIUM_FREE_PLACES_COUNT);
  }
  if (
    accessType === 'snapshot' &&
    snapshotCapturedItemIds !== null &&
    snapshotCapturedItemIds.length
  ) {
    const captureOrder = new Map(snapshotCapturedItemIds.map((id, i) => [id, i]));
    visibleItems.sort((a, b) => (captureOrder.get(a.id) ?? 1e9) - (captureOrder.get(b.id) ?? 1e9));
  }

  const viewerLang = await viewerLangPromise;
  // Item enrich and owner RPC are independent (async-parallel).
  const itemsPromise = enrichListItemsWithReviewsAndMustTry(supabase, visibleItems, viewerLang);
  const ownerPromise = creatorDeleted
    ? Promise.resolve({ data: null, error: null })
    : supabase.rpc(list.published_at ? 'published_list_owner' : 'list_owner_snapshot', {
        p_list_id: listId,
      });
  const [itemsWithMustTry, ownerResult] = await Promise.all([itemsPromise, ownerPromise]);

  let owner = null;
  if (!creatorDeleted) {
    const { data: ownerRows, error: oErr } = ownerResult;
    if (oErr)
      return {
        list,
        items: itemsWithMustTry,
        owner: null,
        membership: null,
        paidAccess,
        error: oErr.message,
      };
    const orow = Array.isArray(ownerRows) ? ownerRows[0] : ownerRows;
    owner = orow
      ? {
          id: orow.owner_id,
          display_name: orow.display_name,
          username: orow.username,
          avatar_url: orow.avatar_url,
        }
      : null;
  }
  return {
    list,
    items: itemsWithMustTry,
    owner,
    membership,
    paidAccess,
    error: null,
  };
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

function normalizeProfileActivityRpc(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Paginated slice of merged public profile activity (same RPC as initial profile load).
 * @param {string} ownerUserId
 * @param {number} [offset]
 * @param {number} [limit]
 */
export async function fetchPublicProfileActivityPage(
  ownerUserId,
  offset = 0,
  limit = PROFILE_ACTIVITY_PAGE_SIZE
) {
  const supabase = await createSupabaseServerClient();
  const id = normUuid(ownerUserId);
  if (!id) {
    return { activity: [], error: 'invalid' };
  }
  const lim = Math.min(Math.max(Number(limit) || PROFILE_ACTIVITY_PAGE_SIZE, 1), 100);
  const off = Math.max(Number(offset) || 0, 0);
  const { data: activityRaw, error: aErr } = await supabase.rpc('public_profile_activity', {
    p_owner_user_id: id,
    p_limit: lim,
    p_offset: off,
  });
  if (aErr) {
    console.error('[public_profile_activity]', aErr.message);
    return { activity: [], error: aErr.message };
  }
  return { activity: normalizeProfileActivityRpc(activityRaw), error: null };
}

/** Public profile + lists + merged activity feed (RPCs; reviews visible to anon via `public_profile_activity`). */
export async function fetchPublicProfileByUsername(username) {
  const supabase = await createSupabaseServerClient();
  const handle = (username ?? '').trim().replace(/^@/, '');
  if (!handle) {
    return { profile: null, lists: [], recentActivity: [], error: 'invalid' };
  }
  const { data: profRows, error: pErr } = await supabase.rpc('public_user_profile_by_username', {
    p_username: handle,
  });
  if (pErr) {
    return { profile: null, lists: [], recentActivity: [], error: pErr.message };
  }
  const profile = Array.isArray(profRows) ? profRows[0] : profRows;
  if (!profile?.id) {
    return { profile: null, lists: [], recentActivity: [], error: 'not_found' };
  }

  const {
    data: { user },
  } = await getSupabaseAuthUser();
  const viewerIsOwner = Boolean(user?.id && user.id === profile.id);

  const [listsResult, { data: activityRaw, error: aErr }] = await Promise.all([
    (async () => {
      if (viewerIsOwner) {
        const { data: ownedRaw, error: oErr } = await supabase
          .from('lists')
          .select(
            `
            id,
            name,
            description,
            cover_image_url,
            visibility,
            published_at,
            updated_at,
            slug,
            list_items(count)
          `
          )
          .eq('user_id', profile.id)
          .order('updated_at', { ascending: false });
        if (oErr) return { lists: [], error: oErr.message };
        const lists = (ownedRaw ?? []).map(({ list_items: li, ...rest }) => ({
          ...rest,
          item_count: itemCountFromListItemsEmbed(li),
        }));
        return { lists, error: null };
      }
      const { data: listsRpc, error: lErr } = await supabase.rpc('public_lists_for_profile', {
        p_owner_user_id: profile.id,
      });
      if (lErr) return { lists: [], error: lErr.message };
      return { lists: listsRpc ?? [], error: null };
    })(),
    supabase.rpc('public_profile_activity', {
      p_owner_user_id: profile.id,
      p_limit: PROFILE_ACTIVITY_PAGE_SIZE,
      p_offset: 0,
    }),
  ]);

  if (listsResult.error) {
    return { profile, lists: [], recentActivity: [], error: listsResult.error };
  }
  if (aErr) {
    console.error('[public_profile_activity]', aErr.message);
  }
  const recentActivity = aErr ? [] : normalizeProfileActivityRpc(activityRaw);

  // creator_payout_ready comes from the public_user_profile_by_username RPC (SECURITY DEFINER),
  // which bypasses RLS — safe to read another user's stripe_connect_charges_enabled status.
  // The RPC may not expose subscribe_list_id, so we derive it directly:
  // find the owner's oldest paid public_subscribers list (the one used for checkout).
  const creatorPayoutReady = Boolean(profile.creator_payout_ready);
  const { data: subscribeListData } = await supabase
    .from('lists')
    .select('id')
    .eq('user_id', profile.id)
    .eq('visibility', 'public_subscribers')
    .eq('paid_access_enabled', true)
    .not('stripe_price_id', 'is', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  const subscribeListId =
    profile.subscribe_list_id ?? (creatorPayoutReady ? (subscribeListData?.id ?? null) : null);

  let viewerSubscribedToCreator = false;
  let viewerSubscriptionRowId = null;
  let viewerSubscriptionPeriodEnd = null;
  let viewerSubscriptionCancelAtPeriodEnd = false;
  if (subscribeListId && user?.id && !viewerIsOwner) {
    const { data: subRows } = await supabase
      .from('list_subscriptions')
      .select('id, list_id, status, current_period_end, cancel_at_period_end')
      .eq('subscriber_user_id', user.id)
      .in('status', ['active', 'trialing']);
    if (subRows?.length) {
      const subListIds = [...new Set(subRows.map((r) => r.list_id).filter(Boolean))];
      const { data: subLists } = await supabase
        .from('lists')
        .select('id, user_id, paid_access_enabled')
        .in('id', subListIds);
      const matchingList = (subLists ?? []).find(
        (l) => Boolean(l.paid_access_enabled) && l.user_id === profile.id
      );
      if (matchingList) {
        viewerSubscribedToCreator = true;
        const matchingRow = subRows.find((r) => r.list_id === matchingList.id);
        if (matchingRow) {
          viewerSubscriptionRowId = matchingRow.id;
          viewerSubscriptionPeriodEnd = matchingRow.current_period_end ?? null;
          viewerSubscriptionCancelAtPeriodEnd = Boolean(matchingRow.cancel_at_period_end);
        }
      }
    }
  }

  const profileForView = {
    ...profile,
    subscribe_list_id: subscribeListId,
    creator_payout_ready: creatorPayoutReady,
    viewer_subscribed_to_creator: viewerSubscribedToCreator,
    viewer_subscription_row_id: viewerSubscriptionRowId,
    viewer_subscription_period_end: viewerSubscriptionPeriodEnd,
    viewer_subscription_cancel_at_period_end: viewerSubscriptionCancelAtPeriodEnd,
  };

  return { profile: profileForView, lists: listsResult.lists, recentActivity, error: null };
}

export async function resolveUsernameToUserId(username) {
  const supabase = await createSupabaseServerClient();
  const handle = (username ?? '').trim().replace(/^@/, '');
  if (!handle) return { userId: null, error: 'invalid' };
  const { data, error } = await supabase.rpc('resolve_user_id_from_username', {
    p_username: handle,
  });
  if (error) return { userId: null, error: error.message };
  return { userId: data ?? null, error: data ? null : 'not_found' };
}

export async function inviteToList(listId, inviteeUserId, role) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('invite_to_list', {
    p_list_id: listId,
    p_invitee_user_id: inviteeUserId,
    p_role: role === 'editor' ? 'editor' : 'viewer',
  });
  if (error) return { error: error.message };
  // Fire-and-forget: notify the invitee.
  notifyListInvite(supabase, listId, inviteeUserId).catch(() => {});
  return { error: null };
}

/**
 * Notify a user that they were invited to collaborate on a list. Fire-and-forget.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} listId
 * @param {string} inviteeUserId
 */
async function notifyListInvite(supabase, listId, inviteeUserId) {
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  const [{ data: list }, { data: actor }] = await Promise.all([
    supabaseAdminClient.from('lists').select('name').eq('id', listId).maybeSingle(),
    user
      ? supabaseAdminClient
          .from('users')
          .select('display_name, username')
          .eq('id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  await insertNotifications([inviteeUserId], 'list_invite', {
    actor_id: user?.id ?? null,
    actor_username: actor?.username ?? null,
    actor_name: actor?.display_name || actor?.username || 'Someone',
    list_id: listId,
    list_name: list?.name ?? null,
  });
}

// requestJoinList was removed with the request_join_list RPC (20260722121000):
// self-serve join requests are disabled, the RPC only ever raised, and no UI
// imported the action. approveListJoinRequest / rejectListJoinRequest stay —
// list-manage-view still resolves pre-existing pending_request rows with them.

export async function approveListJoinRequest(listId, requesterUserId, role) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('approve_list_join_request', {
    p_list_id: listId,
    p_user_id: requesterUserId,
    p_role: role === 'editor' ? 'editor' : 'viewer',
  });
  if (error) return { error: error.message };
  // Fire-and-forget: tell the requester they were approved.
  notifyJoinApproved(listId, requesterUserId).catch(() => {});
  return { error: null };
}

/**
 * Notify a user that their request to join a list was approved.
 * @param {string} listId
 * @param {string} requesterUserId
 */
async function notifyJoinApproved(listId, requesterUserId) {
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  const [{ data: list }, { data: actor }] = await Promise.all([
    supabaseAdminClient.from('lists').select('name').eq('id', listId).maybeSingle(),
    user
      ? supabaseAdminClient
          .from('users')
          .select('display_name, username')
          .eq('id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  await insertNotifications([requesterUserId], 'join_approved', {
    actor_id: user?.id ?? null,
    actor_username: actor?.username ?? null,
    actor_name: actor?.display_name || actor?.username || 'The owner',
    list_id: listId,
    list_name: list?.name ?? null,
  });
}

export async function rejectListJoinRequest(listId, requesterUserId) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('reject_list_join_request', {
    p_list_id: listId,
    p_user_id: requesterUserId,
  });
  if (error) return { error: error.message };
  return { error: null };
}

export async function setListMemberRole(listId, memberUserId, role) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('set_list_member_role', {
    p_list_id: listId,
    p_user_id: memberUserId,
    p_role: role === 'editor' ? 'editor' : 'viewer',
  });
  if (error) return { error: error.message };
  return { error: null };
}

export async function removeListMember(listId, memberUserId) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('remove_list_member', {
    p_list_id: listId,
    p_user_id: memberUserId,
  });
  if (error) return { error: error.message };
  return { error: null };
}

export async function acceptListInvite(listId) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('accept_list_invite', { p_list_id: listId });
  if (error) return { error: error.message };
  // Fire-and-forget: tell the list owner their invite was accepted.
  notifyInviteAccepted(listId).catch(() => {});
  return { error: null };
}

/**
 * Notify the list owner that a user accepted their collaboration invite.
 * @param {string} listId
 */
async function notifyInviteAccepted(listId) {
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user?.id) return;
  const [{ data: list }, { data: actor }] = await Promise.all([
    supabaseAdminClient.from('lists').select('name, user_id').eq('id', listId).maybeSingle(),
    supabaseAdminClient
      .from('users')
      .select('display_name, username')
      .eq('id', user.id)
      .maybeSingle(),
  ]);
  if (!list?.user_id || list.user_id === user.id) return;
  await insertNotifications([list.user_id], 'invite_accepted', {
    actor_id: user.id,
    actor_username: actor?.username ?? null,
    actor_name: actor?.display_name || actor?.username || 'Someone',
    list_id: listId,
    list_name: list.name ?? null,
  });
}

export async function declineListInvite(listId) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('decline_list_invite', { p_list_id: listId });
  if (error) return { error: error.message };
  return { error: null };
}
