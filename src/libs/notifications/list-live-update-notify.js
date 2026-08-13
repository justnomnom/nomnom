import {
  emailsByUserFromAdminLookups,
  isWithinLiveListNotifyCooldown,
  resolveLiveListEmailRecipients,
  shouldStampLiveListNotifiedAt,
} from 'src/libs/notifications/live-list-notify-cooldown';

/**
 * Notify opted-in Live List (paid) subscribers by email when new spots are added.
 * - Respects `notification_preferences.list_updates_email` (opt-in, same as digest).
 * - Respects list/creator mutes.
 * - At most one email per list per 24h cooldown.
 * - Stamps `last_notified_at` only after at least one send attempt with a recipient email.
 *
 * Fire-and-forget from list add actions — errors are logged but not thrown.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase  — user-scoped client
 * @param {string} listId
 */
export async function notifyLiveListSubscribers(supabase, listId) {
  try {
    if (!listId) return;

    const { supabaseAdminClient } = await import('src/libs/supabase/supabase-admin');
    const { getSiteUrl } = await import('src/libs/site-url');
    const { sendResendEmail } = await import('src/libs/email/resend-server-send');
    const { liveListUpdateHtml } = await import('src/libs/email/list-email-templates');
    const { RESEND_API } = await import('src/config-global');

    if (!RESEND_API.key || !RESEND_API.from) return;

    const siteUrl = getSiteUrl();

    const { data: list, error: lErr } = await supabase
      .from('lists')
      .select('id, name, user_id, last_notified_at')
      .eq('id', listId)
      .maybeSingle();
    if (lErr || !list) return;

    if (isWithinLiveListNotifyCooldown(list.last_notified_at)) return;

    const { data: creatorProfile } = await supabaseAdminClient
      .from('users')
      .select('display_name, username')
      .eq('id', list.user_id)
      .maybeSingle();
    const creatorName = creatorProfile?.display_name || creatorProfile?.username || 'the creator';

    const { data: subs, error: sErr } = await supabaseAdminClient
      .from('list_subscriptions')
      .select('id, subscriber_user_id')
      .eq('list_id', listId)
      .in('status', ['active', 'trialing']);
    if (sErr || !subs?.length) return;

    const subscriberIds = subs.map((s) => s.subscriber_user_id).filter(Boolean);
    if (subscriberIds.length === 0) return;

    const [{ data: muteRows }, { data: prefRows }] = await Promise.all([
      supabaseAdminClient
        .from('notification_mutes')
        .select('user_id, target_type, target_id')
        .in('user_id', subscriberIds)
        .or(
          `and(target_type.eq.list,target_id.eq.${listId}),and(target_type.eq.creator,target_id.eq.${list.user_id})`
        ),
      supabaseAdminClient
        .from('notification_preferences')
        .select('user_id, list_updates_email')
        .in('user_id', subscriberIds)
        .eq('list_updates_email', true),
    ]);

    const activeSubscriberIds = new Set(
      resolveLiveListEmailRecipients({
        subscriberIds,
        muteRows,
        prefRows,
        listId,
        creatorId: list.user_id,
      })
    );
    if (activeSubscriberIds.size === 0) return;

    // Fetch each subscriber's email individually — listUsers() only returns 50 rows
    // by default and has no filter, so it would miss most users in any real database.
    const emailEntries = await Promise.all(
      [...activeSubscriberIds].map(async (id) => {
        try {
          const { data } = await supabaseAdminClient.auth.admin.getUserById(id);
          return [id, data.user?.email ?? null];
        } catch {
          return [id, null];
        }
      })
    );
    const emailById = emailsByUserFromAdminLookups(emailEntries);
    if (Object.keys(emailById).length === 0) return;

    const listUrl = `${siteUrl}/lists/${listId}`;
    const manageUrl = `${siteUrl}/dashboard/settings/notifications`;
    const listName = list.name ?? 'this list';

    const sendResults = await Promise.allSettled(
      Object.entries(emailById).map(async ([, email]) => {
        const html = liveListUpdateHtml({ listName, creatorName, listUrl, manageUrl });
        await sendResendEmail({
          to: email,
          subject: `${creatorName} updated "${listName}"`,
          html,
        });
      })
    );

    if (!shouldStampLiveListNotifiedAt(sendResults)) return;

    // Stamp only after a successful send so a total failure can retry.
    await supabaseAdminClient
      .from('lists')
      .update({ last_notified_at: new Date().toISOString() })
      .eq('id', listId);
  } catch (e) {
    console.error('[notifyLiveListSubscribers]', listId, e);
  }
}
