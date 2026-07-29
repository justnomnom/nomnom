'use client';

import Stack from '@mui/material/Stack';

import { useTranslate } from 'src/locales';

import SettingsSelectionRow from './settings-selection-row';

// Same row pattern as SettingsAppearanceForm (export-html content management).

// ----------------------------------------------------------------------

export default function SettingsLanguageForm() {
  const { allLangs, currentLang, onChangeLang } = useTranslate();

  return (
    <Stack spacing={1.5}>
      {allLangs.map((option) => (
        <SettingsSelectionRow
          key={option.value}
          selected={option.value === currentLang.value}
          onClick={() => onChangeLang(option.value)}
          icon={option.icon}
          iconWidth={28}
          iconColor="text.primary"
          iconSx={{ borderRadius: 0.65 }}
          label={option.label}
        />
      ))}
    </Stack>
  );
}
