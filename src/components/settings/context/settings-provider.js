'use client';

import PropTypes from 'prop-types';
import isEqual from 'lodash/isEqual';
import { useMemo, useState, useEffect, useCallback } from 'react';

import { useLocalStorage } from 'src/hooks/use-local-storage';

import { localStorageGetItem } from 'src/utils/safe-storage';

import { getLanguageStorageKey } from 'src/locales/i18n';
import { useAuthContext } from 'src/auth/hooks/use-auth-context';

import { SettingsContext } from './settings-context';

// ----------------------------------------------------------------------

const STORAGE_KEY_PREFIX = 'settings';

/**
 * Get user-specific storage key
 * @param {string|null} userId - User ID or null for anonymous
 * @returns {string} Storage key
 */
const getStorageKey = (userId) => {
  if (userId) {
    return `${STORAGE_KEY_PREFIX}-${userId}`;
  }
  return `${STORAGE_KEY_PREFIX}-anonymous`;
};

export function SettingsProvider({ children, defaultSettings }) {
  const { user } = useAuthContext();
  const userId = user?.id || null;

  const storageKey = useMemo(() => getStorageKey(userId), [userId]);

  const { state, update, reset } = useLocalStorage(storageKey, defaultSettings);

  const [openDrawer, setOpenDrawer] = useState(false);

  // Direction by lang
  const onChangeDirectionByLang = useCallback(
    (lang) => {
      update('themeDirection', lang === 'ar' ? 'rtl' : 'ltr');
    },
    [update]
  );

  useEffect(() => {
    const languageStorageKey = getLanguageStorageKey(userId);
    const isArabic = localStorageGetItem(languageStorageKey) === 'ar';
    if (isArabic) {
      onChangeDirectionByLang('ar');
    }
  }, [onChangeDirectionByLang, userId]);

  // Drawer
  const onToggleDrawer = useCallback(() => {
    setOpenDrawer((prev) => !prev);
  }, []);

  const onCloseDrawer = useCallback(() => {
    setOpenDrawer(false);
  }, []);

  const canReset = !isEqual(state, defaultSettings);

  const memoizedValue = useMemo(
    () => ({
      ...state,
      onUpdate: update,
      // Direction
      onChangeDirectionByLang,
      // Reset
      canReset,
      onReset: reset,
      // Drawer
      open: openDrawer,
      onToggle: onToggleDrawer,
      onClose: onCloseDrawer,
    }),
    [
      reset,
      update,
      state,
      canReset,
      openDrawer,
      onCloseDrawer,
      onToggleDrawer,
      onChangeDirectionByLang,
    ]
  );

  return <SettingsContext.Provider value={memoizedValue}>{children}</SettingsContext.Provider>;
}

SettingsProvider.propTypes = {
  children: PropTypes.node,
  defaultSettings: PropTypes.object,
};
