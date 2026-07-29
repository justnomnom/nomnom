import { NextResponse } from 'next/server';

import { updateSession, getMiddlewareAuthUser } from 'src/libs/supabase/supabase-middleware-client';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Shareable dashboard detail routes that should fall back to their public
 * counterpart for signed-out viewers (instead of bouncing through sign-in).
 */
const DASHBOARD_PUBLIC_FALLBACKS = [
  { match: /^\/dashboard\/restaurants\/([^/?#]+)\/?$/, publicPath: (id) => `/restaurants/${id}` },
  { match: /^\/dashboard\/lists\/([^/?#]+)\/?$/, publicPath: (id) => `/lists/${id}` },
];

/**
 * Next.js 16+: request interception lives in `proxy` (Node.js runtime).
 * @see https://nextjs.org/docs/app/getting-started/proxy
 */
export default async function proxy(request) {
  const url = new URL(request.url);
  const { pathname } = url;

  if (pathname.startsWith('/api/webhooks')) {
    return NextResponse.next();
  }

  try {
    const response = await updateSession(request);

    const fallback = DASHBOARD_PUBLIC_FALLBACKS.find((entry) => entry.match.test(pathname));
    if (fallback) {
      const id = fallback.match.exec(pathname)?.[1];
      if (id && UUID_RE.test(id)) {
        const user = await getMiddlewareAuthUser(request);
        if (!user) {
          const target = new URL(fallback.publicPath(id), request.url);
          target.search = url.search;
          return NextResponse.redirect(target);
        }
      }
    }

    return response;
  } catch (error) {
    console.error('[proxy] Unexpected error:', error);

    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
