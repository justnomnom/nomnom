'use client';

import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';

import { paths } from 'src/routes/paths';

import { useTranslate } from 'src/locales';

import { SettingsDrillShell } from 'src/sections/profile/view';

// ----------------------------------------------------------------------

export default function BlankView({ titleKey = 'pages.blank.title' }) {
  const { t } = useTranslate();

  return (
    <SettingsDrillShell
      title={t(titleKey)}
      backHref={paths.dashboard.discover}
      backAriaLabel={t('pages.dashboard.title')}
    >
      <Box
        sx={{
          mt: 1,
          width: 1,
          height: 320,
          borderRadius: 2,
          bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04),
          border: (theme) =>
            `1px solid ${
              theme.palette.mode === 'light' ? theme.palette.grey[300] : theme.palette.divider
            }`,
        }}
      />
    </SettingsDrillShell>
  );
}

BlankView.propTypes = {
  titleKey: PropTypes.string,
};
