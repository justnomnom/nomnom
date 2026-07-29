import { NextResponse } from 'next/server';

/**
 * GET /api/posts/latest — latest posts excluding ?title=
 */
export async function GET() {
  try {
    return NextResponse.json({
      latestPosts: [],
    });
  } catch (error) {
    console.error('Error fetching latest posts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
