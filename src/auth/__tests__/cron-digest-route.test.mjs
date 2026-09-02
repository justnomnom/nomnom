/**
 * GET /api/cron/notification-digest: secret gate then digest + cleanup.
 */
import assert from 'node:assert/strict';
import { beforeEach, describe, mock, test } from 'node:test';

process.env.CRON_SECRET = process.env.CRON_SECRET || 'cron-secret';

/** @type {object[]} */
const digestCalls = [];
/** @type {object[]} */
const cleanupCalls = [];

mock.module('src/libs/notifications/send-list-update-digests.js', {
  exports: {
    sendListUpdateDigests: async (opts) => {
      digestCalls.push(opts);
      return { sent: 2, skipped: 1 };
    },
  },
});

mock.module('src/libs/notifications/cleanup-old-notifications.js', {
  exports: {
    deleteOldNotifications: async (opts) => {
      cleanupCalls.push(opts);
      return { deleted: 4 };
    },
  },
});

const { GET } = await import('../../app/(frontend)/api/cron/notification-digest/route.js');

describe('GET /api/cron/notification-digest', { concurrency: false }, () => {
  beforeEach(() => {
    digestCalls.length = 0;
    cleanupCalls.length = 0;
  });

  test('missing bearer → 401 and no work', async () => {
    const res = await GET({ headers: new Headers() });
    assert.equal(res.status, 401);
    assert.equal((await res.json()).error, 'unauthorized');
    assert.equal(digestCalls.length, 0);
    assert.equal(cleanupCalls.length, 0);
  });

  test('authorized run sends the 24h digest and prunes 60-day-old rows', async () => {
    const res = await GET({
      headers: new Headers({ authorization: `Bearer ${process.env.CRON_SECRET}` }),
    });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true, sent: 2, skipped: 1 });
    assert.deepEqual(digestCalls, [{ windowHours: 24 }]);
    assert.deepEqual(cleanupCalls, [{ days: 60 }]);
  });
});
