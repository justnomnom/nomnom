import { NextResponse } from 'next/server';

import { resolveNotificationMutationTarget } from 'src/libs/notifications/notification-api-helpers';
import {
  getSupabaseAuthUser,
  createSupabaseServerClient,
} from 'src/libs/supabase/supabase-server-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Delete a single notification (`{ id }`) or all of the caller's notifications
 * (`{ all: true }`).
 */
export async function POST(request) {
  const bodyPromise = request.json();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await bodyPromise;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const target = resolveNotificationMutationTarget(body);
  if (target.mode === 'error') {
    return NextResponse.json({ error: target.error }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  let query = supabase.from('notifications').delete().eq('user_id', user.id);

  if (target.mode === 'all') {
    // Deleting all: a redundant always-true guard keeps PostgREST from rejecting
    // an unfiltered delete while the user_id filter above scopes it to the caller.
    query = query.not('id', 'is', null);
  } else {
    query = query.eq('id', target.id);
  }

  const { error } = await query;
  if (error) {
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
