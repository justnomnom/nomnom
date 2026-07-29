import { NextResponse } from 'next/server';

/**
 * GET /api/posts — list posts or fetch one by slug/title (?title=)
 * Wire this route to your CMS or database when you add a content backend.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title');
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);

    if (title) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json({
      posts: [],
      totalPages: 0,
      page,
      limit,
      totalDocs: 0,
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
