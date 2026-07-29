/**
 * Canonical site origin for metadata, JSON-LD, and sitemap absolute URLs.
 * Keep in sync with root `layout` `metadataBase` (uses this module).
 *
 * Resolution order (first wins):
 * 1. SITE_URL — server / CI canonical URL
 * 2. NEXT_PUBLIC_SITE_URL — same value exposed to the client bundle (must match for OG URLs)
 * 3. VERCEL_URL — preview / production host on Vercel
 * 4. Local dev fallback — same port as `next dev` / `package.json`
 */
function normalizeSiteUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, '');
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, '')}`;
}

export function getSiteUrl(): string {
  const raw = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  const fromEnv = raw && String(raw).trim().toLowerCase() !== 'tbd' ? String(raw).trim() : '';
  if (fromEnv) {
    return normalizeSiteUrl(fromEnv);
  }

  const vercel = process.env.VERCEL_URL;
  if (vercel) {
    return `https://${vercel}`.replace(/\/$/, '');
  }

  const devPort = 3032;
  return `http://localhost:${devPort}`;
}
