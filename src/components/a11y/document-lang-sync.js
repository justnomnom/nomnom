'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { setUiLocaleCookie } from 'src/libs/ui-locale';

/**
 * Keeps `<html lang>` aligned with i18next (en / pt) after hydration and syncs
 * `ui_locale` cookie so the next SSR response matches (see `src/app/layout.js`).
 */
export default function DocumentLangSync() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const apply = (lng) => {
      const code = lng && typeof lng === 'string' ? lng.split('-')[0] : 'en';
      const htmlLang = code === 'pt' ? 'pt' : 'en';
      document.documentElement.lang = htmlLang;
      setUiLocaleCookie(lng || 'en');
    };

    apply(i18n.language);
    const onLanguageChanged = (lng) => apply(lng);
    i18n.on('languageChanged', onLanguageChanged);
    return () => {
      i18n.off('languageChanged', onLanguageChanged);
    };
  }, [i18n]);

  return null;
}
