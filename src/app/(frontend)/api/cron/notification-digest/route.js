import { NextResponse } from 'next/server';

import { CRON_SECRET } from 'src/config-global';
import { sendListUpdateDigests } from 'src/libs/notifications/send-list-update-digests';
import { deleteOldNotifications } from 'src/libs/notifications/cleanup-old-notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Daily email digest of new spots on lists a user follows/subscribes to.
 * Triggered by Vercel Cron (see vercel.json). Protected by CRON_SECRET:
 * Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` automatically.
 */
export async function GET(request) {
  if (CRON_SECRET) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  const result = await sendListUpdateDigests({ windowHours: 24 });
  // Piggyback daily housekeeping: prune old, already-read notifications.
  await deleteOldNotifications({ days: 60 });
  return NextResponse.json({ ok: true, ...result });
}
