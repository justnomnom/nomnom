'use client';

import { useTranslation } from 'react-i18next';
import { useMemo, useState, useEffect, useCallback } from 'react';

import { safeSetItem, localStorageGetItem } from 'src/utils/safe-storage';

import { useAuthContext } from 'src/auth/hooks/use-auth-context';
import { setUiLocaleCookie, readUiLocaleCookie } from 'src/libs/ui-locale';

import { useSettingsContext } from 'src/components/settings/context';

import { allLangs, defaultLang } from './config-lang';
import { ensureI18nLocale, getLanguageStorageKey } from './i18n';

// ----------------------------------------------------------------------

export function useLocales() {
  const { currentLang, allLangs: availableLangs, onChangeLang } = useTranslate();

  const handleChangeLang = useCallback(
    (newLang) => {
      onChangeLang(newLang);
    },
    [onChangeLang]
  );

  return {
    allLangs: availableLangs,
    currentLang: currentLang || defaultLang,
    onChangeLang: handleChangeLang,
  };
}

// ----------------------------------------------------------------------

export function useTranslate() {
  const { t, i18n, ready } = useTranslation();
  const settings = useSettingsContext();
  const { user } = useAuthContext();
  const userId = user?.id || null;

  const languageStorageKey = useMemo(() => getLanguageStorageKey(userId), [userId]);
  const [currentLang, setCurrentLang] = useState(defaultLang);

  // Load language from user-specific storage, then `ui_locale` cookie (SSR alignment)
  useEffect(() => {
    const langStorage = localStorageGetItem(languageStorageKey);
    const cookieLang = readUiLocaleCookie();
    const preferred = langStorage || cookieLang;
    const lang = allLangs.find((l) => l.value === preferred) || defaultLang;
    setCurrentLang(lang);
    let nextLang = null;
    if (preferred && preferred !== i18n.language) {
      nextLang = preferred;
    } else if (!preferred && i18n.language !== defaultLang.value) {
      nextLang = defaultLang.value;
    }
    if (nextLang) {
      ensureI18nLocale(nextLang).then(() => {
        i18n.changeLanguage(nextLang);
      });
    }
    if (langStorage && !cookieLang) {
      setUiLocaleCookie(langStorage);
    }
  }, [languageStorageKey, i18n]);

  // Initialize language if not set
  useEffect(() => {
    if (!i18n.language || !allLangs.find((l) => l.value === i18n.language)) {
      ensureI18nLocale(defaultLang.value).then(() => {
        i18n.changeLanguage(defaultLang.value);
      });
    }
  }, [i18n]);

  // Sync currentLang with i18n.language when it changes
  useEffect(() => {
    const lang = allLangs.find((l) => l.value === i18n.language) || defaultLang;
    setCurrentLang(lang);
  }, [i18n.language]);

  const onChangeLang = useCallback(
    (newlang) => {
      const lang = allLangs.find((l) => l.value === newlang) || defaultLang;
      safeSetItem(languageStorageKey, newlang);
      setUiLocaleCookie(newlang);
      setCurrentLang(lang);
      settings.onChangeDirectionByLang(newlang);
      ensureI18nLocale(newlang).then(() => {
        i18n.changeLanguage(newlang);
      });
    },
    [i18n, settings, languageStorageKey]
  );

  return {
    t,
    i18n,
    ready,
    currentLang,
    allLangs,
    onChangeLang,
  };
}
