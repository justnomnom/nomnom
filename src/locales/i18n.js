'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import { defaultLang } from './config-lang';
import translationEn from './langs/en.json';

export { getLanguageStorageKey } from './language-storage-key';

// ----------------------------------------------------------------------

const localeLoaders = {
  pt: () => import('./langs/pt.json'),
};

const loadedLocales = new Set(['en']);

/**
 * Loads a non-default locale JSON before switching i18n language.
 * English is bundled with the initial client payload; Portuguese is fetched on demand.
 * @param {string} lng
 * @returns {Promise<void>}
 */
export async function ensureI18nLocale(lng) {
  const code = String(lng || '')
    .toLowerCase()
    .startsWith('pt')
    ? 'pt'
    : 'en';
  if (loadedLocales.has(code)) return;
  const loader = localeLoaders[code];
  if (!loader) return;
  const mod = await loader();
  const resources = mod.default ?? mod;
  i18n.addResourceBundle(code, 'translations', resources, true, true);
  loadedLocales.add(code);
}

// Initialize with default language (will be updated when user context is available)
const lng = defaultLang.value;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translations: translationEn },
    },
    lng,
    fallbackLng: 'en',
    debug: false,
    ns: ['translations'],
    defaultNS: 'translations',
    interpolation: {
      escapeValue: false,
    },
    // Disable automatic localStorage detection - we'll handle it manually with user-specific keys
    detection: {
      lookupLocalStorage: false,
    },
  });

export default i18n;
