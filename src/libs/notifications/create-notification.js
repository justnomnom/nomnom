/**
 * De-duplicate and drop falsy recipient ids before insert.
 *
 * @param {string[]} recipientIds
 * @returns {string[]}
 */
export function normalizeNotificationRecipientIds(recipientIds) {
  return [
    ...new Set(
      (recipientIds ?? [])
        .map((id) => (id == null || id === false ? '' : String(id).trim()))
        .filter(Boolean)
    ),
  ];
}

/**
 * Insert one in-app notification row per recipient. Uses the service-role client
 * (RLS blocks cross-user inserts). Fire-and-forget: never throws.
 *
 * This is the shared low-level writer used by producers other than the list-update
 * fan-out (which lives in notify-list-followers.js and additionally sends push).
 *
 * @param {string[]} recipientIds
 * @param {string} type
 * @param {Record<string, unknown>} data
 */
export async function insertNotifications(recipientIds, type, data) {
  try {
    const ids = normalizeNotificationRecipientIds(recipientIds);
    if (ids.length === 0) return;
    const { supabaseAdminClient } = await import('src/libs/supabase/supabase-admin');
    const { chunkArray } = await import('src/libs/notifications/chunk');
    // Chunk so a creator with a large audience doesn't produce one oversized
    // insert payload (PostgREST rejects very large bodies).
    const batches = chunkArray(ids, 500);
    const results = await Promise.allSettled(
      batches.map((batch) =>
        supabaseAdminClient
          .from('notifications')
          .insert(batch.map((user_id) => ({ user_id, type, data })))
      )
    );
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error('[insertNotifications] batch rejected', type, index, result.reason);
        return;
      }
      if (result.value?.error) {
        console.error('[insertNotifications] batch insert error', type, index, result.value.error);
      }
    });
  } catch (e) {
    console.error('[insertNotifications]', type, e);
  }
}
