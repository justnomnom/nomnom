import { getServerViewerLang } from 'src/libs/i18n-server';
import { getTranslation } from 'src/locales/default-translations';

export { displaySlug } from './content-hub-display';

/**
 * Translator for country/city hub chrome, using the viewer language cookie.
 * @returns {Promise<(key: string, vars?: Record<string, string | number>) => string>}
 */
export async function contentHubT() {
  const lang = await getServerViewerLang();
  return (key, vars) => getTranslation(lang, `pages.contentHub.${key}`, vars);
}
