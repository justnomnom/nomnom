import { insertNotifications } from 'src/libs/notifications/create-notification';
import { buildListUpdateRecipients } from 'src/libs/notifications/build-list-update-recipients';
import { resolveListUpdateNotificationAudiences } from 'src/libs/notifications/filter-notification-recipients';
import {
  buildListUpdateNotificationData,
  shouldFanOutListUpdate,
} from 'src/libs/notifications/list-update-notify-helpers';

/**
 * Notify a creator's followers and a list's paid subscribers that a new
 * restaurant was added to a list. Writes one in-app `notifications` row per
 * recipient and (best-effort) sends a Web Push to each opted-in device.
 *
 * Mirrors `notifyLiveListSubscribers`: fire-and-forget, admin client to bypass
 * RLS, never throws. Called with the specific restaurant that was just added, so
 * one notification is emitted per added spot.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase — user-scoped client
 * @param {string} listId
 * @param {string} restaurantId
 * @param {string} actingUserId — whoever performed the add (excluded from recipients)
 */
export async function notifyListFollowers(supabase, listId, restaurantId, actingUserId) {
  try {
    if (!listId || !restaurantId) return;

    const { supabaseAdminClient } = await import('src/libs/supabase/supabase-admin');

    const { data: list } = await supabase
      .from('lists')
      .select('id, name, user_id, visibility')
      .eq('id', listId)
      .maybeSingle();
    if (!list) return;

    // Nothing to do for private lists (collaborators are out of scope).
    if (!shouldFanOutListUpdate(list.visibility)) return;

    // Followers of the creator (only relevant for fully public lists).
    let followerIds = [];
    if (list.visibility === 'public') {
      const { data: follows } = await supabaseAdminClient
        .from('user_follows')
        .select('follower_id')
        .eq('following_id', list.user_id);
      followerIds = (follows ?? []).map((r) => r.follower_id).filter(Boolean);
    }

    // Active paid subscribers to this list.
    const { data: subs } = await supabaseAdminClient
      .from('list_subscriptions')
      .select('subscriber_user_id')
      .eq('list_id', listId)
      .in('status', ['active', 'trialing']);
    const subscriberIds = (subs ?? []).map((s) => s.subscriber_user_id).filter(Boolean);

    const recipients = buildListUpdateRecipients({
      visibility: list.visibility,
      followerIds,
      subscriberIds,
      creatorId: list.user_id,
      actingUserId,
    });
    if (recipients.length === 0) return;

    const [{ data: muteRows }, { data: prefRows }] = await Promise.all([
      supabaseAdminClient
        .from('notification_mutes')
        .select('user_id, target_type, target_id')
        .in('user_id', recipients)
        .or(
          `and(target_type.eq.list,target_id.eq.${listId}),and(target_type.eq.creator,target_id.eq.${list.user_id})`
        ),
      supabaseAdminClient
        .from('notification_preferences')
        .select('user_id, list_updates_in_app, list_updates_push')
        .in('user_id', recipients),
    ]);

    const { activeRecipients, inAppRecipients, pushRecipients } =
      resolveListUpdateNotificationAudiences({
        visibility: list.visibility,
        followerIds,
        subscriberIds,
        creatorId: list.user_id,
        actingUserId,
        listId,
        muteRows,
        prefRows,
      });
    if (activeRecipients.length === 0) return;

    // Names for the notification body / links.
    const [{ data: restaurant }, { data: creatorProfile }] = await Promise.all([
      supabaseAdminClient.from('restaurants').select('name').eq('id', restaurantId).maybeSingle(),
      supabaseAdminClient
        .from('users')
        .select('display_name, username')
        .eq('id', list.user_id)
        .maybeSingle(),
    ]);

    const data = buildListUpdateNotificationData({
      list,
      restaurantId,
      restaurant,
      creatorProfile,
    });
    const creatorName = data.creator_name;
    const restaurantName = data.restaurant_name;

    if (inAppRecipients.length > 0) {
      await insertNotifications(inAppRecipients, 'list_update', data);
    }

    // Best-effort Web Push to opted-in devices.
    if (pushRecipients.length > 0) {
      try {
        const { sendWebPushToUsers } = await import('src/libs/notifications/send-web-push');
        await sendWebPushToUsers(pushRecipients, {
          title: creatorName,
          body: `Added ${restaurantName} to ${list.name ?? 'a list'}`,
          data: { link: `/dashboard/lists/${list.id}?spot=${restaurantId}` },
        });
      } catch {
        // Push is optional; never let it break the in-app path.
      }
    }
  } catch (e) {
    console.error('[notifyListFollowers]', listId, e);
  }
}
