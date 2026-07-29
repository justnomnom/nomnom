/**
 * Normalize browser / stored language to app locale (`en` | `pt`).
 * Safe for client and server (no Next.js server-only imports).
 * @param {string | null | undefined} raw
 * @returns {'en' | 'pt'}
 */
export function normalizeAppLocale(raw) {
  if (!raw || typeof raw !== 'string') return 'en';
  const l = raw.trim().toLowerCase();
  if (l === 'pt' || l.startsWith('pt-')) return 'pt';
  return 'en';
}
