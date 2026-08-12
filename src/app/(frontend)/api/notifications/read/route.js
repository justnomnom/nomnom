import { NextResponse } from 'next/server';

import { resolveNotificationMutationTarget } from 'src/libs/notifications/notification-api-helpers';
import {
  getSupabaseAuthUser,
  createSupabaseServerClient,
} from 'src/libs/supabase/supabase-server-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Mark a single notification (`{ id }`) or all of the caller's notifications
 * (`{ all: true }`) as read.
 */
export async function POST(request) {
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const target = resolveNotificationMutationTarget(body);
  if (target.mode === 'error') {
    return NextResponse.json({ error: target.error }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();

  let query = supabase.from('notifications').update({ read_at: now }).eq('user_id', user.id);

  if (target.mode === 'all') {
    query = query.is('read_at', null);
  } else {
    query = query.eq('id', target.id);
  }

  const { error } = await query;
  if (error) {
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
