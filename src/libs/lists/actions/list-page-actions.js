'use server';

import { cache } from 'react';

import { supabaseAdminClient } from 'src/libs/supabase/supabase-admin';
import { getMyStripeConnectStatus } from 'src/auth/actions/stripe-list-actions';
import { slimRestaurantCardMetadata } from 'src/libs/restaurant/slim-restaurant-card-metadata';
import { mergeSnapshotPurchaseCapturedItemIds } from 'src/libs/lists/merge-snapshot-purchase-captured-item-ids';
import {
  getSupabaseAuthUser,
  createSupabaseServerClient,
} from 'src/libs/supabase/supabase-server-client';
import {
  resolveViewerLangInput,
  enrichListItemsWithReviewsAndMustTry,
} from 'src/libs/lists/actions/_shared';
import {
  fetchAllSupabasePages,
  SUPABASE_DEFAULT_PAGE_SIZE,
} from 'src/libs/supabase/supabase-fetch-all-pages';
import {
  computeListSnapshotAmountCents,
  LIST_FREEMIUM_FREE_PLACES_COUNT,
} from 'src/libs/stripe/list-stripe-constants';

/** Slim nested `restaurants.metadata` on list item rows (same allowlist as map paths). */
function slimListItemsRestaurantMetadata(items) {
  return (items ?? []).map((item) => {
    if (!item?.restaurants || typeof item.restaurants !== 'object') return item;
    return {
      ...item,
      restaurants: {
        ...item.restaurants,
        metadata: slimRestaurantCardMetadata(item.restaurants.metadata),
      },
    };
  });
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
  const [listResult, authResult] = await Promise.all([
    supabase
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
      .maybeSingle(),
    getSupabaseAuthUser(),
  ]);
  const { data: list, error: lErr } = listResult;
  if (lErr || !list)
    return {
      list: null,
      items: [],
      members: [],
      listOwner: null,
      error: lErr?.message ?? 'not_found',
    };
  // Items, members, and owner are independent after the list row (async-parallel).
  const [itemsResult, membersResult, ownerResult] = await Promise.all([
    supabase
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
      .order('sort_order', { ascending: true }),
    supabase.rpc('list_members_with_profiles', { p_list_id: listId }),
    supabase.rpc('list_manage_owner_profile', { p_list_id: listId }),
  ]);
  const { data: items, error: iErr } = itemsResult;
  if (iErr)
    return {
      list,
      items: [],
      members: [],
      listOwner: null,
      error: iErr.message,
    };
  const viewerLang = await viewerLangPromise;
  const itemsWithMustTry = slimListItemsRestaurantMetadata(
    await enrichListItemsWithReviewsAndMustTry(supabase, items ?? [], viewerLang)
  );
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

  const { data: ownerRows, error: oErr } = ownerResult;
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
  } = authResult;
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
const resolveListSlugCached = cache(async (creatorHandle, listSlug) => {
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
});

/** Resolve `/lists/:handle/:slug` to a list id. Deduped per request via `React.cache()`. */
export async function resolveListSlug(creatorHandle, listSlug) {
  return resolveListSlugCached(creatorHandle, listSlug);
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
  const creatorDeleted = list.user_id === null;

  // Membership, paid access, and Connect readiness are independent (async-parallel).
  const membershipPromise = user ? fetchListMembershipForViewer(listId) : Promise.resolve(null);
  const paidAccessPromise = (async () => {
    let hasPaidSubscription = false;
    let accessType = null; // 'snapshot' | 'subscription' | null
    let snapshotPurchasedAt = null;
    /** `null` = do not filter items; array = snapshot capture (possibly empty) */
    let snapshotCapturedItemIds = null;
    /** Snapshot purchase rows (used for legacy "new since" counts when capture ids are missing). */
    let snapRows = [];

    if (!user?.id) {
      return {
        hasPaidSubscription,
        accessType,
        snapshotPurchasedAt,
        snapshotCapturedItemIds,
        snapRows,
      };
    }

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

    return {
      hasPaidSubscription,
      accessType,
      snapshotPurchasedAt,
      snapshotCapturedItemIds,
      snapRows,
    };
  })();
  // Stripe Connect readiness for paywall copy. Do not read `customers` directly: RLS only
  // allows selecting your own row, so viewers see null → false and a bogus "payments not
  // enabled" message. Use SECURITY DEFINER RPC (same pattern as `creator_payout_ready` on
  // `public_user_profile_by_username`).
  const chargesEnabledPromise = (async () => {
    if (!list.paid_access_enabled || creatorDeleted) return true;
    const { data: chargesRpc, error: chargesRpcErr } = await supabase.rpc(
      'public_list_creator_charges_enabled',
      { p_list_id: listId }
    );
    // Only an explicit true means payouts are ready; null/false should disable paywall CTAs.
    return !(chargesRpcErr || chargesRpc !== true);
  })();

  const [membership, paidState, chargesEnabled] = await Promise.all([
    membershipPromise,
    paidAccessPromise,
    chargesEnabledPromise,
  ]);

  const {
    hasPaidSubscription,
    accessType,
    snapshotPurchasedAt,
    snapshotCapturedItemIds,
    snapRows,
  } = paidState;

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

  const shouldGate = paidAccess.enabled && !hasPaidSubscription && !membership?.isOwner;

  // Access gate before snapshot "new count" / item fetch — denied viewers skip that work.
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

  const snapshotCountPromise = (async () => {
    if (accessType !== 'snapshot') return null;
    if (snapshotCapturedItemIds !== null) {
      return countListItemsNotInCaptureForSnapshot(listId, snapshotCapturedItemIds);
    }
    if (!snapRows.length) return null;
    const oldestPurchasedAt = snapRows.reduce((acc, r) => {
      const p = r?.purchased_at;
      if (!p) return acc;
      return !acc || p < acc ? p : acc;
    }, null);
    if (!oldestPurchasedAt) return null;
    return countListItemsCreatedAfterForSnapshot(listId, oldestPurchasedAt);
  })();

  const itemsFetchPromise = (async () => {
    if (
      accessType === 'snapshot' &&
      snapshotCapturedItemIds !== null &&
      snapshotCapturedItemIds.length === 0
    ) {
      return { rawItems: [], iErr: null, hasMore: false };
    }
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
      return {
        rawItems: Array.isArray(preview?.items) ? preview.items : [],
        iErr: previewErr,
        hasMore: Boolean(preview?.has_more),
      };
    }
    // Full list: page past PostgREST's 1000-row window so lists with >1000 places aren't
    // silently truncated (previously hard-capped at .limit(1000)).
    try {
      const fetched = await fetchAllSupabasePages(async (from, pageSize) => {
        const { data: page, error } = await buildItemsPage(from, pageSize);
        if (error) {
          throw error;
        }
        return page ?? [];
      }, SUPABASE_DEFAULT_PAGE_SIZE);
      return { rawItems: fetched, iErr: null, hasMore: false };
    } catch (e) {
      return { rawItems: [], iErr: e, hasMore: false };
    }
  })();

  const ownerPromise = creatorDeleted
    ? Promise.resolve({ data: null, error: null })
    : supabase.rpc(list.published_at ? 'published_list_owner' : 'list_owner_snapshot', {
        p_list_id: listId,
      });

  const [snapshotNewRestaurantCount, itemsFetch, ownerResult, viewerLang] = await Promise.all([
    snapshotCountPromise,
    itemsFetchPromise,
    ownerPromise,
    viewerLangPromise,
  ]);

  paidAccess.snapshotNewRestaurantCount = snapshotNewRestaurantCount;
  if (shouldGate) {
    paidAccess.hasMore = itemsFetch.hasMore;
  }

  const { rawItems, iErr } = itemsFetch;
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

  const itemsWithMustTry = slimListItemsRestaurantMetadata(
    await enrichListItemsWithReviewsAndMustTry(supabase, visibleItems, viewerLang)
  );

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
