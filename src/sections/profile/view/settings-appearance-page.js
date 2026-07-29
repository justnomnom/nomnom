'use client';

import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { useTranslate } from 'src/locales';

import SettingsDrillShell from './settings-drill-shell';
import SettingsLanguageForm from '../settings-language-form';
import SettingsAppearanceForm from '../settings-appearance-form';
import {
  dashboardSectionLabelSx,
  dashboardSubsectionStackProps,
  dashboardPageSectionStackProps,
} from './settings-shell-shared';

// ----------------------------------------------------------------------

export default function SettingsAppearancePage() {
  const theme = useTheme();
  const { t } = useTranslate();

  return (
    <SettingsDrillShell title={t('pages.dashboard.settings.appearance.page_title')}>
      <Stack {...dashboardPageSectionStackProps}>
        <Stack {...dashboardSubsectionStackProps}>
          <Typography component="h2" sx={dashboardSectionLabelSx(theme)}>
            {t('pages.dashboard.settings.appearance.theme_section')}
          </Typography>
          <SettingsAppearanceForm />
        </Stack>

        <Stack {...dashboardSubsectionStackProps}>
          <Typography component="h2" sx={dashboardSectionLabelSx(theme)}>
            {t('pages.dashboard.settings.language.section_title')}
          </Typography>
          <SettingsLanguageForm />
        </Stack>
      </Stack>
    </SettingsDrillShell>
  );
}
