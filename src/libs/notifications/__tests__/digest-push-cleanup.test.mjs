/**
 * Notification digest / cleanup / web-push: early exits without live providers.
 */
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

mock.module('src/config-global.js', {
  exports: {
    RESEND_API: { key: '', from: '', to: '' },
    WEB_PUSH: { publicKey: '', privateKey: '', subject: 'mailto:ops@nomnom.test' },
  },
});

mock.module('src/libs/supabase/supabase-admin.js', {
  exports: {
    supabaseAdminClient: {
      from() {
        throw new Error('no admin');
      },
    },
  },
});

const { sendListUpdateDigests } = await import('../send-list-update-digests.js');
const { deleteOldNotifications } = await import('../cleanup-old-notifications.js');
const { sendWebPushToUsers } = await import('../send-web-push.js');

test('sendListUpdateDigests: no-op when Resend is unconfigured', async () => {
  assert.deepEqual(await sendListUpdateDigests({ windowHours: 24 }), { sent: 0, recipients: 0 });
});

test('deleteOldNotifications: admin client failure is ok:false', async () => {
  assert.deepEqual(await deleteOldNotifications({ days: 60 }), { ok: false });
});

test('sendWebPushToUsers: unconfigured VAPID is a silent no-op', async () => {
  await sendWebPushToUsers(['11111111-1111-4111-8111-111111111111'], {
    title: 'Hi',
    body: 'There',
  });
});
