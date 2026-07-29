'use server';

import { supabaseAdminClient } from 'src/libs/supabase/supabase-admin';
import { insertNotifications } from 'src/libs/notifications/create-notification';
import { shouldNotifyNewFollower } from 'src/libs/notifications/filter-notification-recipients';
import {
  getSupabaseAuthUser,
  createSupabaseServerClient,
} from 'src/libs/supabase/supabase-server-client';

const USERNAME_RE = /^[a-z0-9_]{3,30}$/;

/**
 * Notify a user that someone started following them. Fire-and-forget.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} actorId - the follower
 * @param {string} recipientId - the followed user
 */
async function notifyNewFollower(supabase, actorId, recipientId) {
  if (!shouldNotifyNewFollower(actorId, recipientId)) return;
  const { data: actor } = await supabaseAdminClient
    .from('users')
    .select('display_name, username')
    .eq('id', actorId)
    .maybeSingle();
  await insertNotifications([recipientId], 'new_follower', {
    actor_id: actorId,
    actor_username: actor?.username ?? null,
    actor_name: actor?.display_name || actor?.username || 'Someone',
  });
}

function emptyToNull(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

/**
 * @returns {Promise<{ profile: object | null, error?: string }>}
 */
export async function getMyProfile() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await getSupabaseAuthUser();
    if (authError || !user) {
      return { profile: null, error: 'Unauthorized' };
    }
    const { data, error } = await supabase
      .from('users')
      .select(
        'display_name, username, bio, avatar_url, social_instagram, social_tiktok, social_youtube, social_website, email'
      )
      .eq('id', user.id)
      .maybeSingle();
    if (error) {
      console.error('[getMyProfile]', error);
      return { profile: null, error: error.message };
    }
    return {
      profile: {
        ...data,
        id: user.id,
        auth_email: user.email,
        auth_avatar_url: user.user_metadata?.avatar_url ?? null,
        auth_full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
      },
    };
  } catch (e) {
    console.error('[getMyProfile]', e);
    return { profile: null, error: e?.message };
  }
}

/**
 * @param {{
 *   displayName?: string | null,
 *   username?: string | null,
 *   bio?: string | null,
 *   avatarUrl?: string | null,
 *   socialInstagram?: string | null,
 *   socialTiktok?: string | null,
 *   socialYoutube?: string | null,
 *   socialWebsite?: string | null,
 * }} input
 * @returns {Promise<{ ok?: boolean, error?: string, usernameTaken?: boolean, usernameInvalid?: boolean }>}
 */
export async function updateMyProfile(input) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await getSupabaseAuthUser();
  if (authError || !user) {
    return { error: 'Unauthorized' };
  }

  const usernameRaw = emptyToNull(input?.username);
  const usernameLower = usernameRaw ? usernameRaw.toLowerCase() : null;
  if (usernameRaw && !USERNAME_RE.test(usernameLower)) {
    return {
      error: 'Username must be 3–30 characters: lowercase letters, numbers, and underscores only.',
    };
  }

  const patch = {
    display_name: emptyToNull(input?.displayName),
    username: usernameLower,
    bio: emptyToNull(input?.bio),
    avatar_url: emptyToNull(input?.avatarUrl),
    social_instagram: emptyToNull(input?.socialInstagram),
    social_tiktok: emptyToNull(input?.socialTiktok),
    social_youtube: emptyToNull(input?.socialYoutube),
    social_website: emptyToNull(input?.socialWebsite),
    updated_at: new Date().toISOString(),
  };

  const { data: existing, error: existErr } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (existErr) {
    return { error: existErr.message };
  }

  if (!existing && !user.email) {
    return { error: 'Cannot create profile row without an email on this account.' };
  }

  const { error } = existing
    ? await supabase.from('users').update(patch).eq('id', user.id)
    : await supabase.from('users').insert({
        id: user.id,
        email: user.email,
        ...patch,
      });

  if (error) {
    if (error.code === '23505') {
      return { usernameTaken: true };
    }
    return { error: error.message };
  }

  // Refresh denormalized author_* snapshots on the user's existing reviews so other
  // viewers (blocked from public.users by RLS) see the latest avatar / name / handle.
  try {
    const { error: revSyncErr } = await supabase
      .from('restaurant_reviews')
      .update({
        author_display_name: patch.display_name,
        author_username: patch.username,
        author_avatar_url: patch.avatar_url,
      })
      .eq('user_id', user.id);
    if (revSyncErr) {
      console.warn('[updateMyProfile] restaurant_reviews sync:', revSyncErr.message);
    }
  } catch (e) {
    console.warn('[updateMyProfile] restaurant_reviews sync:', e?.message);
  }

  // Keep JWT `user_metadata` in sync with the public `users` row so client-only reads
  // (e.g. map sheet viewer avatar) see the updated photo without a separate profile fetch.
  try {
    const mergedMeta = {
      ...(user.user_metadata && typeof user.user_metadata === 'object' ? user.user_metadata : {}),
    };
    if (Object.prototype.hasOwnProperty.call(patch, 'avatar_url')) {
      mergedMeta.avatar_url = patch.avatar_url;
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'display_name')) {
      mergedMeta.display_name = patch.display_name;
    }
    const { error: authMetaErr } = await supabase.auth.updateUser({ data: mergedMeta });
    if (authMetaErr) {
      console.warn('[updateMyProfile] auth.updateUser metadata:', authMetaErr.message);
    }
  } catch (e) {
    console.warn('[updateMyProfile] auth.updateUser:', e?.message);
  }

  return { ok: true };
}

/**
 * @param {string} targetUserId
 * @returns {Promise<{ following: boolean }>}
 */
export async function fetchViewerFollowsUser(targetUserId) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user || !targetUserId || user.id === targetUserId) {
    return { following: false };
  }
  const { data } = await supabase
    .from('user_follows')
    .select('follower_id')
    .eq('follower_id', user.id)
    .eq('following_id', targetUserId)
    .maybeSingle();
  return { following: Boolean(data) };
}

/**
 * @param {string} followingId — profile user id to follow or unfollow
 * @param {boolean} follow — true to follow, false to unfollow
 * @returns {Promise<{ ok?: true, error?: string }>}
 */
export async function setFollowUser(followingId, follow) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await getSupabaseAuthUser();
  if (authError || !user) {
    return { error: 'Unauthorized' };
  }
  if (!followingId || user.id === followingId) {
    return { error: 'invalid' };
  }
  if (follow) {
    const { error } = await supabase.from('user_follows').insert({
      follower_id: user.id,
      following_id: followingId,
    });
    if (error?.code === '23505') {
      return { ok: true };
    }
    if (error) {
      return { error: error.message };
    }
    // Fire-and-forget: notify the followed user that they have a new follower.
    notifyNewFollower(supabase, user.id, followingId).catch(() => {});
    return { ok: true };
  }
  const { error } = await supabase
    .from('user_follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', followingId);
  if (error) {
    return { error: error.message };
  }
  return { ok: true };
}

/**
 * Returns users who follow the current user.
 * @returns {Promise<{ rows: Array<{ id: string, user: object }>, error?: string }>}
 */
export async function getMyFollowers() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await getSupabaseAuthUser();
    if (authError || !user) return { rows: [], error: 'Unauthorized' };

    const { data: follows, error: fErr } = await supabase
      .from('user_follows')
      .select('follower_id, created_at')
      .eq('following_id', user.id)
      .order('created_at', { ascending: false });

    if (fErr) return { rows: [], error: fErr.message };
    const followerIds = [...new Set((follows ?? []).map((r) => r.follower_id).filter(Boolean))];
    if (!followerIds.length) return { rows: [] };

    const { data: users, error: uErr } = await supabaseAdminClient
      .from('users')
      .select('id, display_name, username, avatar_url')
      .in('id', followerIds);

    if (uErr) return { rows: [], error: uErr.message };
    const userById = Object.fromEntries((users ?? []).map((u) => [u.id, u]));

    return {
      rows: followerIds.map((id) => ({ id, user: userById[id] ?? null })),
    };
  } catch (e) {
    return { rows: [], error: e?.message };
  }
}

/**
 * Returns users the current user follows.
 * @returns {Promise<{ rows: Array<{ id: string, user: object }>, error?: string }>}
 */
export async function getMyFollowing() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await getSupabaseAuthUser();
    if (authError || !user) return { rows: [], error: 'Unauthorized' };

    const { data: follows, error: fErr } = await supabase
      .from('user_follows')
      .select('following_id, created_at')
      .eq('follower_id', user.id)
      .order('created_at', { ascending: false });

    if (fErr) return { rows: [], error: fErr.message };
    const followingIds = [...new Set((follows ?? []).map((r) => r.following_id).filter(Boolean))];
    if (!followingIds.length) return { rows: [] };

    const { data: users, error: uErr } = await supabaseAdminClient
      .from('users')
      .select('id, display_name, username, avatar_url')
      .in('id', followingIds);

    if (uErr) return { rows: [], error: uErr.message };
    const userById = Object.fromEntries((users ?? []).map((u) => [u.id, u]));

    return {
      rows: followingIds.map((id) => ({ id, user: userById[id] ?? null })),
    };
  } catch (e) {
    return { rows: [], error: e?.message };
  }
}
