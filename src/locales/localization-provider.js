'use client';

import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider as MuiLocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import DocumentLangSync from 'src/components/a11y/document-lang-sync';
import SplashScreen from 'src/components/loading-screen/splash-screen';

import { useLocales } from './use-locales';

// ----------------------------------------------------------------------

export default function LocalizationProvider({ children }) {
  const { currentLang } = useLocales();
  const { i18n } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleI18nLoaded = () => {
      setIsLoading(false);
    };

    if (i18n.isInitialized) {
      handleI18nLoaded();
    } else {
      i18n.on('initialized', handleI18nLoaded);
    }

    return () => {
      i18n.off('initialized', handleI18nLoaded);
    };
  }, [i18n]);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <MuiLocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={currentLang.adapterLocale}>
      <DocumentLangSync />
      {children}
    </MuiLocalizationProvider>
  );
}

LocalizationProvider.propTypes = {
  children: PropTypes.node,
};
