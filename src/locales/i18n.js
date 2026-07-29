'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import { defaultLang } from './config-lang';
import translationEn from './langs/en.json';
import translationPt from './langs/pt.json';

export { getLanguageStorageKey } from './language-storage-key';

// ----------------------------------------------------------------------

// Initialize with default language (will be updated when user context is available)
const lng = defaultLang.value;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translations: translationEn },
      pt: { translations: translationPt },
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
