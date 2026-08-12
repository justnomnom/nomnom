'use server';

import { supabaseAdminClient } from 'src/libs/supabase/supabase-admin';
import { insertNotifications } from 'src/libs/notifications/create-notification';
import {
  buildListSocialNotificationData,
  resolveOwnerRecipientExcludingActor,
  shouldEmitDirectNotification,
} from 'src/libs/notifications/social-notification-payloads';
import { PROFILE_ACTIVITY_PAGE_SIZE } from 'src/libs/profile/public-profile-activity-constants';
import {
  getSupabaseAuthUser,
  createSupabaseServerClient,
} from 'src/libs/supabase/supabase-server-client';

import { normUuid, itemCountFromListItemsEmbed } from 'src/libs/lists/actions/_shared';

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
  const [profResult, authResult] = await Promise.all([
    supabase.rpc('public_user_profile_by_username', {
      p_username: handle,
    }),
    getSupabaseAuthUser(),
  ]);
  const { data: profRows, error: pErr } = profResult;
  if (pErr) {
    return { profile: null, lists: [], recentActivity: [], error: pErr.message };
  }
  const profile = Array.isArray(profRows) ? profRows[0] : profRows;
  if (!profile?.id) {
    return { profile: null, lists: [], recentActivity: [], error: 'not_found' };
  }

  const {
    data: { user },
  } = authResult;
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
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) return { error: 'unauthorized' };
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
  if (!shouldEmitDirectNotification(inviteeUserId)) return;
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  // Never notify yourself about your own invite.
  if (user?.id && String(user.id) === String(inviteeUserId)) return;
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
  await insertNotifications(
    [inviteeUserId],
    'list_invite',
    buildListSocialNotificationData({
      actor: user ? { id: user.id, ...actor } : null,
      listId,
      listName: list?.name,
    })
  );
}

// requestJoinList was removed with the request_join_list RPC (20260722121000):
// self-serve join requests are disabled, the RPC only ever raised, and no UI
// imported the action. approveListJoinRequest / rejectListJoinRequest stay —
// list-manage-view still resolves pre-existing pending_request rows with them.

export async function approveListJoinRequest(listId, requesterUserId, role) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) return { error: 'unauthorized' };
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
  if (!shouldEmitDirectNotification(requesterUserId)) return;
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (user?.id && String(user.id) === String(requesterUserId)) return;
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
  await insertNotifications(
    [requesterUserId],
    'join_approved',
    buildListSocialNotificationData({
      actor: user ? { id: user.id, ...actor } : null,
      listId,
      listName: list?.name,
      fallbackName: 'The owner',
    })
  );
}

export async function rejectListJoinRequest(listId, requesterUserId) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) return { error: 'unauthorized' };
  const { error } = await supabase.rpc('reject_list_join_request', {
    p_list_id: listId,
    p_user_id: requesterUserId,
  });
  if (error) return { error: error.message };
  return { error: null };
}

export async function setListMemberRole(listId, memberUserId, role) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) return { error: 'unauthorized' };
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
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) return { error: 'unauthorized' };
  const { error } = await supabase.rpc('remove_list_member', {
    p_list_id: listId,
    p_user_id: memberUserId,
  });
  if (error) return { error: error.message };
  return { error: null };
}

export async function acceptListInvite(listId) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) return { error: 'unauthorized' };
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
  const ownerId = resolveOwnerRecipientExcludingActor(list?.user_id, user.id);
  if (!ownerId) return;
  await insertNotifications(
    [ownerId],
    'invite_accepted',
    buildListSocialNotificationData({
      actor: { id: user.id, ...actor },
      listId,
      listName: list?.name,
    })
  );
}

export async function declineListInvite(listId) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) return { error: 'unauthorized' };
  const { error } = await supabase.rpc('decline_list_invite', { p_list_id: listId });
  if (error) return { error: error.message };
  return { error: null };
}
