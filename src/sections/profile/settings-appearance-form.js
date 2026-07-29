'use client';

import Stack from '@mui/material/Stack';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { useAnalytics } from 'src/libs/analytics/analytics-provider';

import { useSettingsContext } from 'src/components/settings';

import SettingsSelectionRow from './settings-selection-row';

// ----------------------------------------------------------------------

const THEME_MODE_OPTIONS = [
  {
    value: 'light',
    icon: ic.sunLinear,
    labelKey: 'pages.dashboard.settings.appearance.light',
  },
  {
    value: 'dark',
    icon: ic.moonLinear,
    labelKey: 'pages.dashboard.settings.appearance.dark',
  },
];

// ----------------------------------------------------------------------

export default function SettingsAppearanceForm() {
  const settings = useSettingsContext();
  const { t } = useTranslate();
  const { trackEvent } = useAnalytics();

  return (
    <Stack spacing={1.5}>
      {THEME_MODE_OPTIONS.map((option) => (
        <SettingsSelectionRow
          key={option.value}
          selected={settings.themeMode === option.value}
          onClick={() => {
            if (settings.themeMode !== option.value) {
              trackEvent('appearance_mode_changed', { mode: option.value });
            }
            settings.onUpdate('themeMode', option.value);
          }}
          icon={option.icon}
          label={t(option.labelKey)}
        />
      ))}
    </Stack>
  );
}
