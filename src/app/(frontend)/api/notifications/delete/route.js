import { NextResponse } from 'next/server';

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

  const supabase = await createSupabaseServerClient();
  let query = supabase.from('notifications').delete().eq('user_id', user.id);

  if (body?.all === true) {
    // Deleting all: a redundant always-true guard keeps PostgREST from rejecting
    // an unfiltered delete while the user_id filter above scopes it to the caller.
    query = query.not('id', 'is', null);
  } else if (typeof body?.id === 'string' && body.id) {
    query = query.eq('id', body.id);
  } else {
    return NextResponse.json({ error: 'missing_target' }, { status: 400 });
  }

  const { error } = await query;
  if (error) {
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
