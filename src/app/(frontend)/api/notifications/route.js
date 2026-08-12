import { NextResponse } from 'next/server';

import { parseNotificationListOffset } from 'src/libs/notifications/notification-api-helpers';
import { getSupabaseAuthUser } from 'src/libs/supabase/supabase-server-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 30;

/**
 * List the current user's notifications (most recent first) plus the unread count.
 * Supports simple offset pagination via `?offset=` for the full history page.
 */
export async function GET(request) {
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { supabaseAdminClient } = await import('src/libs/supabase/supabase-admin');

  const { searchParams } = new URL(request.url);
  const offset = parseNotificationListOffset(searchParams.get('offset'));

  const [{ data: rows, error }, { count }] = await Promise.all([
    supabaseAdminClient
      .from('notifications')
      .select('id, type, data, read_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1),
    supabaseAdminClient
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null),
  ]);

  if (error) {
    return NextResponse.json({ error: 'query_failed' }, { status: 500 });
  }

  const notifications = rows ?? [];
  return NextResponse.json({
    notifications,
    unreadCount: count ?? 0,
    hasMore: notifications.length === PAGE_SIZE,
  });
}
