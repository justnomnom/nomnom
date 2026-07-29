import webpush from 'web-push';

import { WEB_PUSH } from 'src/config-global';

let configured = false;

function ensureConfigured() {
  if (configured) return true;
  if (!WEB_PUSH.publicKey || !WEB_PUSH.privateKey) return false;
  webpush.setVapidDetails(WEB_PUSH.subject, WEB_PUSH.publicKey, WEB_PUSH.privateKey);
  configured = true;
  return true;
}

/**
 * Send a Web Push notification to every registered device of the given users.
 * Dead subscriptions (404/410) are cleaned up. Best-effort: never throws.
 *
 * @param {string[]} userIds
 * @param {{ title: string, body: string, data?: Record<string, unknown> }} payload
 */
export async function sendWebPushToUsers(userIds, payload) {
  try {
    if (!ensureConfigured()) return;
    if (!Array.isArray(userIds) || userIds.length === 0) return;

    const { supabaseAdminClient } = await import('src/libs/supabase/supabase-admin');
    const { chunkArray } = await import('src/libs/notifications/chunk');

    // Fetch subscriptions in id-batches (avoid an oversized `.in()` for big audiences).
    const subs = [];
    await Promise.all(
      chunkArray(userIds, 500).map(async (batch) => {
        const { data } = await supabaseAdminClient
          .from('push_subscriptions')
          .select('id, endpoint, p256dh, auth')
          .in('user_id', batch);
        if (data?.length) subs.push(...data);
      })
    );
    if (subs.length === 0) return;

    const body = JSON.stringify(payload);
    const deadIds = [];

    // Send in bounded batches so a large audience doesn't open thousands of
    // concurrent requests inside one serverless invocation.
    const sendOne = async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        );
      } catch (err) {
        const status = err?.statusCode;
        if (status === 404 || status === 410) deadIds.push(sub.id);
      }
    };
    // Process batches sequentially (bounded concurrency per batch) without a loop.
    await chunkArray(subs, 100).reduce(
      (prev, batch) => prev.then(() => Promise.allSettled(batch.map(sendOne))),
      Promise.resolve()
    );

    if (deadIds.length > 0) {
      await Promise.allSettled(
        chunkArray(deadIds, 500).map((batch) =>
          supabaseAdminClient.from('push_subscriptions').delete().in('id', batch)
        )
      );
    }
  } catch (e) {
    console.error('[sendWebPushToUsers]', e);
  }
}
