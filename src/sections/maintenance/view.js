'use client';

import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { useTranslate } from 'src/locales';
import { MaintenanceIllustration } from 'src/assets/illustrations';
import { mobileStretchButtonSx } from 'src/theme/responsive-button-sx';

// ----------------------------------------------------------------------

export default function MaintenanceView() {
  const { t } = useTranslate();

  return (
    <Stack sx={{ alignItems: 'center', width: 1, maxWidth: 400, mx: 'auto', px: 2 }}>
      <Typography variant="h3" sx={{ mb: 2 }}>
        {t('pages.maintenance.title')}
      </Typography>

      <Typography sx={{ color: 'text.secondary' }}>{t('pages.maintenance.description')}</Typography>

      <MaintenanceIllustration sx={{ my: 10, height: 240 }} />

      <Button
        component={RouterLink}
        href="/"
        size="large"
        variant="contained"
        color="primary"
        sx={mobileStretchButtonSx}
      >
        {t('pages.maintenance.goToHome')}
      </Button>
    </Stack>
  );
}
