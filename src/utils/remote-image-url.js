import remoteImagePatterns from 'src/config/remote-image-patterns.cjs';

/**
 * Re-exports from `src/config/remote-image-patterns.cjs` (shared with `next.config.js` `images.remotePatterns`).
 */
export const { isSupabasePublicStorageUrl } = remoteImagePatterns;
export const { isOptimizableRemoteImageUrl } = remoteImagePatterns;
