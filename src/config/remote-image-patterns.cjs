'use strict';

/**
 * Single source of truth for Next.js `images.remotePatterns` and
 * `isOptimizableRemoteImageUrl` in the app bundle — keep them aligned.
 */

/** Literal hostname from env — fixes dev/client `next/image` validation when glob patterns misbehave in `__NEXT_IMAGE_OPTS`. */
function getSupabaseRemotePatternsFromEnv() {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return [];
  try {
    const hostname = new URL(raw).hostname;
    if (!hostname) return [];
    return [
      {
        protocol: 'https',
        hostname,
        pathname: '/storage/v1/object/public/**',
      },
    ];
  } catch {
    return [];
  }
}

const REMOTE_IMAGE_REMOTE_PATTERNS = [
  ...getSupabaseRemotePatternsFromEnv(),
  {
    protocol: 'https',
    hostname: '**.supabase.co',
    pathname: '/storage/v1/object/public/**',
  },
  {
    protocol: 'https',
    hostname: 'images.unsplash.com',
    pathname: '/**',
  },
  {
    protocol: 'https',
    hostname: 'lh3.googleusercontent.com',
    pathname: '/**',
  },
  {
    protocol: 'https',
    hostname: '*.googleusercontent.com',
    pathname: '/**',
  },
  {
    protocol: 'https',
    hostname: 'i.pravatar.cc',
    pathname: '/**',
  },
];

function isSupabasePublicStorageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    if (!u.hostname.endsWith('.supabase.co')) return false;
    return u.pathname.startsWith('/storage/v1/object/public/');
  } catch {
    return false;
  }
}

function isOptimizableRemoteImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (url.startsWith('blob:') || url.startsWith('data:')) return false;
  if (isSupabasePublicStorageUrl(url)) return true;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    const h = u.hostname;
    if (h.endsWith('.googleusercontent.com')) return true;
    if (h === 'i.pravatar.cc') return true;
    if (h === 'images.unsplash.com') return true;
    return false;
  } catch {
    return false;
  }
}

module.exports = {
  REMOTE_IMAGE_REMOTE_PATTERNS,
  isSupabasePublicStorageUrl,
  isOptimizableRemoteImageUrl,
};
