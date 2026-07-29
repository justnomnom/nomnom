'use client';

import merge from 'lodash/merge';
import PropTypes from 'prop-types';
import { useMemo, useEffect } from 'react';

import CssBaseline from '@mui/material/CssBaseline';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';

import { useLocales } from 'src/locales';
import { THEME_COOKIE_NAME } from 'src/libs/theme-cookie';

import { useSettingsContext } from 'src/components/settings';

// system
import { RADIUS } from './spacing';
import { palette } from './palette';
import { shadows } from './shadows';
import { typography } from './typography';
// options
import RTL from './options/right-to-left';
import { customShadows } from './custom-shadows';
import { componentsOverrides } from './overrides';
import { createPresets } from './options/presets';
import { createContrast } from './options/contrast';
import NextAppDirEmotionCacheProvider from './next-emotion-cache';
import 'src/components/iconify/iconify-bundle';

// ----------------------------------------------------------------------

export default function ThemeProvider({ children }) {
  const { currentLang } = useLocales();

  const settings = useSettingsContext();

  useEffect(() => {
    const root = document.documentElement;
    const mode = settings.themeMode === 'dark' ? 'dark' : 'light';
    root.dataset.theme = mode;
    root.style.colorScheme = mode;
    document.cookie = `${THEME_COOKIE_NAME}=${mode};path=/;max-age=31536000;SameSite=Lax`;
  }, [settings.themeMode]);

  const presets = createPresets(settings.themeColorPresets);

  const contrast = createContrast(settings.themeContrast, settings.themeMode);

  const memoizedValue = useMemo(() => {
    const baseCustomShadows = customShadows(settings.themeMode);
    const presetCustomShadows = presets?.customShadows || {};

    // Deep-merge nested palette keys. A shallow spread (e.g. contrast bold's
    // `{ background: { default } }`) would wipe custom tokens like
    // `background.neutral` and crash `alpha(theme.palette.background.neutral, …)`.
    return {
      palette: merge({}, palette(settings.themeMode), presets.palette, contrast.palette),
      customShadows: {
        ...baseCustomShadows,
        ...presetCustomShadows,
      },
      direction: settings.themeDirection,
      shadows: shadows(settings.themeMode),
      shape: { borderRadius: RADIUS.base, ...RADIUS },
      typography,
    };
  }, [
    settings.themeMode,
    settings.themeDirection,
    presets.palette,
    presets.customShadows,
    contrast.palette,
  ]);

  const theme = createTheme(memoizedValue);

  // Ensure customShadows are always available
  if (!theme.customShadows) {
    theme.customShadows = customShadows(settings.themeMode);
  }

  theme.components = merge(componentsOverrides(theme), contrast.components);

  const themeWithLocale = useMemo(
    () => createTheme(theme, currentLang.systemValue),
    [currentLang.systemValue, theme]
  );

  return (
    <NextAppDirEmotionCacheProvider options={{ key: 'css' }}>
      <MuiThemeProvider theme={themeWithLocale}>
        <RTL themeDirection={settings.themeDirection}>
          <CssBaseline />
          {children}
        </RTL>
      </MuiThemeProvider>
    </NextAppDirEmotionCacheProvider>
  );
}

ThemeProvider.propTypes = {
  children: PropTypes.node,
};
