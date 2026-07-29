import { NextResponse } from 'next/server';

/**
 * GET /api/posts/search?query=
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query || query.trim() === '') {
      return NextResponse.json({ results: [] });
    }

    return NextResponse.json({
      results: [],
    });
  } catch (error) {
    console.error('Error searching posts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
