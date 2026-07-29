import { NextResponse } from 'next/server';

import {
  getSupabaseAuthUser,
  createSupabaseServerClient,
} from 'src/libs/supabase/supabase-server-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Store (upsert) a Web Push subscription for the current user/device.
 * Body: the browser PushSubscription JSON ({ endpoint, keys: { p256dh, auth } }).
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

  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: 'invalid_subscription' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh,
      auth,
      user_agent: request.headers.get('user-agent') ?? null,
    },
    { onConflict: 'endpoint' }
  );

  if (error) {
    return NextResponse.json({ error: 'persist_failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
