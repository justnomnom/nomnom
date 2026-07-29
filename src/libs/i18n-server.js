import { cookies, headers } from 'next/headers';

import { normalizeAppLocale } from 'src/libs/locale-utils';

export { normalizeAppLocale };

/**
 * Best-effort viewer language for server-rendered lists (matches client i18n when cookie is set).
 * @returns {Promise<'en' | 'pt'>}
 */
export async function getServerViewerLang() {
  const c = await cookies();
  const cookieLng =
    c.get('i18next')?.value || c.get('i18nextLng')?.value || c.get('NEXT_LOCALE')?.value || null;
  if (cookieLng) {
    return normalizeAppLocale(cookieLng);
  }
  const h = await headers();
  const al = h.get('accept-language') || '';
  if (/^\s*pt/i.test(al) || /[,;]pt/i.test(al)) return 'pt';
  return 'en';
}
