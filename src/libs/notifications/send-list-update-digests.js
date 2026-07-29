import {
  groupListUpdatesByUserForDigest,
  filterDigestRecipientsByEmailPreference,
} from 'src/libs/notifications/group-list-update-digest';

/**
 * Build and send the "new spots on lists you follow" email digest.
 *
 * Aggregates `list_update` notifications created in the last `windowHours`, groups
 * them per recipient and per list, and emails a single summary to each recipient
 * who has opted into email updates (`notification_preferences.list_updates_email`).
 * Intended to run once per day from a cron route. Best-effort; never throws.
 *
 * @param {{ windowHours?: number }} [opts]
 * @returns {Promise<{ sent: number, recipients: number }>}
 */
export async function sendListUpdateDigests({ windowHours = 24 } = {}) {
  try {
    const { supabaseAdminClient } = await import('src/libs/supabase/supabase-admin');
    const { getSiteUrl } = await import('src/libs/site-url');
    const { sendResendEmail } = await import('src/libs/email/resend-server-send');
    const { listUpdateDigestHtml } = await import('src/libs/email/list-email-templates');
    const { RESEND_API } = await import('src/config-global');

    if (!RESEND_API.key || !RESEND_API.from) return { sent: 0, recipients: 0 };

    const since = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();

    const { data: notifs } = await supabaseAdminClient
      .from('notifications')
      .select('user_id, data, created_at')
      .eq('type', 'list_update')
      .gte('created_at', since);
    if (!notifs?.length) return { sent: 0, recipients: 0 };

    const byUser = groupListUpdatesByUserForDigest(notifs);

    const userIds = [...byUser.keys()];
    if (userIds.length === 0) return { sent: 0, recipients: 0 };

    // Only users who opted into the email digest.
    const { data: prefs } = await supabaseAdminClient
      .from('notification_preferences')
      .select('user_id, list_updates_email')
      .in('user_id', userIds)
      .eq('list_updates_email', true);
    const enabled = filterDigestRecipientsByEmailPreference(userIds, prefs);
    if (enabled.size === 0) return { sent: 0, recipients: 0 };

    const siteUrl = getSiteUrl();
    const manageUrl = `${siteUrl}/dashboard/settings/notifications`;

    let sent = 0;
    await Promise.allSettled(
      [...enabled].map(async (uid) => {
        const lists = byUser.get(uid);
        if (!lists || lists.size === 0) return;

        let email = null;
        try {
          const { data } = await supabaseAdminClient.auth.admin.getUserById(uid);
          email = data.user?.email ?? null;
        } catch {
          email = null;
        }
        if (!email) return;

        const items = [...lists.entries()].map(([listId, e]) => ({
          listName: e.listName,
          listUrl: `${siteUrl}/dashboard/lists/${listId}`,
          count: e.count,
        }));

        const totalSpots = items.reduce((sum, i) => sum + i.count, 0);
        const html = listUpdateDigestHtml({ items, manageUrl });
        await sendResendEmail({
          to: email,
          subject:
            totalSpots === 1
              ? 'A new spot on a list you follow'
              : `${totalSpots} new spots on lists you follow`,
          html,
        });
        sent += 1;
      })
    );

    return { sent, recipients: enabled.size };
  } catch (e) {
    console.error('[sendListUpdateDigests]', e);
    return { sent: 0, recipients: 0 };
  }
}
