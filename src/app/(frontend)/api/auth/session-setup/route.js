import { NextResponse } from 'next/server';

import { getOrCreateCustomer } from 'src/auth/actions/auth-actions';
import { getSupabaseAuthUser } from 'src/libs/supabase/supabase-server-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Post-sign-in session setup (customers row + users row) as a plain fetch endpoint.
 * Must NOT be a Server Action: action POSTs replay the current route's RSC tree, which
 * cancels any in-flight client navigation — the GuestGuard login → dashboard redirect and
 * the streamed /onboarding redirect were both being aborted by these calls.
 * Identity comes from the session cookie; the optional body only carries display names.
 */
export async function POST(request) {
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user?.id || !user.email) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    // Body is optional — names fall back to empty strings.
  }
  const firstName = typeof body?.firstName === 'string' ? body.firstName.slice(0, 100) : '';
  const lastName = typeof body?.lastName === 'string' ? body.lastName.slice(0, 100) : '';

  const result = await getOrCreateCustomer({
    userId: user.id,
    email: user.email,
    firstName,
    lastName,
  });

  return NextResponse.json({ ok: Boolean(result) });
}
