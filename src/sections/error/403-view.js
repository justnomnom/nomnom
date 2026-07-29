'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { useTranslate } from 'src/locales';
import CompactLayout from 'src/layouts/compact';
import { compactPageActionsStackSx } from 'src/theme/responsive-button-sx';

import { varFade, MotionPart, MotionContainer } from 'src/components/animate';

import ErrorIllustrationMark from './error-illustration-mark';

// ----------------------------------------------------------------------

export default function View403() {
  const { t } = useTranslate();

  return (
    <CompactLayout>
      <MotionContainer>
        <MotionPart variants={varFade().inUp}>
          <ErrorIllustrationMark />
        </MotionPart>

        <MotionPart variants={varFade().inUp}>
          <Typography
            variant="overline"
            sx={{
              display: 'block',
              mb: 1.5,
              textAlign: 'center',
              color: 'primary.main',
              letterSpacing: 1.2,
            }}
          >
            {t('pages.error.403.eyebrow')}
          </Typography>
        </MotionPart>

        <MotionPart variants={varFade().inUp}>
          <Typography variant="h3" sx={{ mb: 2, textAlign: 'center' }}>
            {t('pages.error.403.title')}
          </Typography>
        </MotionPart>

        <MotionPart variants={varFade().inUp}>
          <Typography sx={{ color: 'text.secondary', textAlign: 'center' }}>
            {t('pages.error.403.description')}
          </Typography>
        </MotionPart>
        <Box sx={compactPageActionsStackSx}>
          <Button component="a" href={paths.home} color="primary" size="large" variant="contained">
            {t('pages.error.403.goToHome')}
          </Button>
          <Button component="a" href={paths.dashboard.map} size="large" variant="text">
            {t('pages.error.403.exploreMap')}
          </Button>
        </Box>
      </MotionContainer>
    </CompactLayout>
  );
}
