'use server';

import { filterE2eTestListsForDisplay } from 'src/utils/filter-e2e-test-lists';

import { supabaseAdminClient } from 'src/libs/supabase/supabase-admin';
import { normalizeListVisibility } from 'src/libs/lists/list-visibility';
import { mergeSnapshotPurchaseCapturedItemIds } from 'src/libs/lists/merge-snapshot-purchase-captured-item-ids';
import {
  getSupabaseAuthUser,
  createSupabaseServerClient,
} from 'src/libs/supabase/supabase-server-client';

import { ensureListSlug } from 'src/libs/lists/ensure-list-slug';
import { normUuid, itemCountFromListItemsEmbed } from 'src/libs/lists/actions/_shared';

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
  // Owned lists and membership are independent (async-parallel). Do not early-return on
  // empty owned lists — collaborator lists still need to be checked.
  const [ownedResult, memResult] = await Promise.all([
    supabase.from('lists').select('id').eq('user_id', user.id),
    supabase.from('list_members').select('list_id').eq('user_id', user.id).eq('status', 'active'),
  ]);
  const { data: myLists, error: lErr } = ownedResult;
  if (lErr) return { listIds: [], lists: [], error: lErr.message };
  const { data: mem, error: mErr } = memResult;
  if (mErr) return { listIds: [], lists: [], error: mErr.message };

  const ownedListIds = (myLists ?? []).map((r) => r.id);
  const memberListIds = (mem ?? []).map((r) => r.list_id);
  if (ownedListIds.length === 0 && memberListIds.length === 0) {
    return { listIds: [], lists: [], error: null };
  }

  const hit = new Set();
  const itemLookups = [];
  if (ownedListIds.length) {
    itemLookups.push(
      supabase
        .from('list_items')
        .select('list_id')
        .eq('restaurant_id', restaurantId)
        .in('list_id', ownedListIds)
    );
  }
  if (memberListIds.length) {
    itemLookups.push(
      supabase
        .from('list_items')
        .select('list_id')
        .eq('restaurant_id', restaurantId)
        .in('list_id', memberListIds)
    );
  }
  const itemResults = await Promise.all(itemLookups);
  for (const { data: items, error: iErr } of itemResults) {
    if (iErr) return { listIds: [...hit], lists: [], error: iErr.message };
    (items ?? []).forEach((r) => hit.add(r.list_id));
  }
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
