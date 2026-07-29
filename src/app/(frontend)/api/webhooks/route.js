import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * Payment webhooks were removed. POST is rejected so old endpoints fail clearly.
 */
export async function POST() {
  return NextResponse.json({ error: 'Webhooks are not configured' }, { status: 410 });
}
