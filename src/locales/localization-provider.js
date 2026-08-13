'use client';

import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { readUiLocaleCookie } from 'src/libs/ui-locale';

import DocumentLangSync from 'src/components/a11y/document-lang-sync';
import SplashScreen from 'src/components/loading-screen/splash-screen';

import { ensureI18nLocale } from './i18n';

// ----------------------------------------------------------------------

export default function LocalizationProvider({ children }) {
  const { i18n } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const finish = () => {
      if (!cancelled) setIsLoading(false);
    };

    const boot = async () => {
      const cookieLang = readUiLocaleCookie();
      if (cookieLang && cookieLang !== 'en') {
        await ensureI18nLocale(cookieLang);
        if (i18n.language !== cookieLang) {
          await i18n.changeLanguage(cookieLang);
        }
      }

      if (i18n.isInitialized) {
        finish();
        return;
      }
      i18n.on('initialized', finish);
    };

    boot();

    return () => {
      cancelled = true;
      i18n.off('initialized', finish);
    };
  }, [i18n]);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <>
      <DocumentLangSync />
      {children}
    </>
  );
}

LocalizationProvider.propTypes = {
  children: PropTypes.node,
};
