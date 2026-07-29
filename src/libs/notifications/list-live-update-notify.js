import { filterMutedRecipients } from 'src/libs/notifications/filter-notification-recipients';

/** Minimum hours between subscriber notification emails for the same list. */
const NOTIFY_COOLDOWN_HOURS = 24;

/**
 * Notify active Live List subscribers when a creator updates their list.
 * Sends at most one email per list per NOTIFY_COOLDOWN_HOURS to prevent spam
 * when a creator makes multiple edits in one session.
 * Called fire-and-forget from list mutation server actions — errors are logged but not thrown.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase  — user-scoped client
 * @param {string} listId
 */
export async function notifyLiveListSubscribers(supabase, listId) {
  try {
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

    // Cooldown: at most one email per 24 hours per list
    if (list.last_notified_at) {
      const hoursSinceLast =
        (Date.now() - new Date(list.last_notified_at).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLast < NOTIFY_COOLDOWN_HOURS) return;
    }

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
    const { data: muteRows } = await supabaseAdminClient
      .from('notification_mutes')
      .select('user_id, target_type, target_id')
      .in('user_id', subscriberIds)
      .or(
        `and(target_type.eq.list,target_id.eq.${listId}),and(target_type.eq.creator,target_id.eq.${list.user_id})`
      );
    const activeSubscriberIds = new Set(
      filterMutedRecipients(subscriberIds, muteRows, {
        listId,
        creatorId: list.user_id,
      })
    );
    if (activeSubscriberIds.size === 0) return;

    // Fetch each subscriber's email individually — listUsers() only returns 50 rows
    // by default and has no filter, so it would miss most users in any real database.
    const emailEntries = await Promise.all(
      subscriberIds.map(async (id) => {
        try {
          const { data } = await supabaseAdminClient.auth.admin.getUserById(id);
          return [id, data.user?.email ?? null];
        } catch {
          return [id, null];
        }
      })
    );
    const emailById = Object.fromEntries(emailEntries.filter(([, email]) => email));

    const listUrl = `${siteUrl}/lists/${listId}`;
    const manageUrl = `${siteUrl}/dashboard/settings/my-subscriptions`;
    const listName = list.name ?? 'this list';

    // Stamp before sending so concurrent mutations don't double-fire
    await supabaseAdminClient
      .from('lists')
      .update({ last_notified_at: new Date().toISOString() })
      .eq('id', listId);

    await Promise.allSettled(
      subs.map(async (sub) => {
        if (!activeSubscriberIds.has(sub.subscriber_user_id)) return;
        const email = emailById[sub.subscriber_user_id];
        if (!email) return;
        const html = liveListUpdateHtml({ listName, creatorName, listUrl, manageUrl });
        await sendResendEmail({
          to: email,
          subject: `${creatorName} updated "${listName}"`,
          html,
        });
      })
    );
  } catch (e) {
    console.error('[notifyLiveListSubscribers]', listId, e);
  }
}
