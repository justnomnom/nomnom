/**
 * Delete read notifications older than `days` to keep the table lean.
 * Unread notifications are always kept. Best-effort; never throws.
 *
 * @param {{ days?: number }} [opts]
 * @returns {Promise<{ ok: boolean }>}
 */
export async function deleteOldNotifications({ days = 60 } = {}) {
  try {
    const { supabaseAdminClient } = await import('src/libs/supabase/supabase-admin');
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    await supabaseAdminClient
      .from('notifications')
      .delete()
      .lt('created_at', cutoff)
      .not('read_at', 'is', null);
    return { ok: true };
  } catch (e) {
    console.error('[deleteOldNotifications]', e);
    return { ok: false };
  }
}
