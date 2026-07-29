/**
 * Canonical site origin for server redirects (Stripe return URLs, etc.).
 * Mirrors `getSiteUrl` in `src/content-platform/site-url.ts` without importing `.ts` from ESLint-strict JS.
 */
export function getSiteUrl() {
  const raw = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  const fromEnv = raw && String(raw).trim().toLowerCase() !== 'tbd' ? String(raw).trim() : '';
  if (fromEnv) {
    const trimmed = fromEnv.replace(/\/$/, '');
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed.replace(/^\/+/, '')}`;
  }
  const vercel = process.env.VERCEL_URL;
  if (vercel) {
    return `https://${vercel}`.replace(/\/$/, '');
  }
  return 'http://localhost:3032';
}
