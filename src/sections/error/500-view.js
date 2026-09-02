'use client';

import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { useTranslate } from 'src/locales';
import CompactLayout from 'src/layouts/compact';
import { readableAccent } from 'src/theme/readable-accent';
import { compactPageActionsStackSx } from 'src/theme/responsive-button-sx';

import { varFade, MotionPart, MotionContainer } from 'src/components/animate';

import ErrorIllustrationMark from './error-illustration-mark';

// ----------------------------------------------------------------------

export default function Page500({ reset }) {
  const { t } = useTranslate();

  const handleRefresh = () => {
    if (reset) {
      reset();
    } else {
      window.location.reload();
    }
  };

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
              color: (theme) => readableAccent(theme),
              letterSpacing: 1.2,
            }}
          >
            {t('pages.error.500.eyebrow')}
          </Typography>
        </MotionPart>

        <MotionPart variants={varFade().inUp}>
          <Typography variant="h3" sx={{ mb: 2, textAlign: 'center' }}>
            {t('pages.error.500.title')}
          </Typography>
        </MotionPart>

        <MotionPart variants={varFade().inUp}>
          <Typography sx={{ color: 'text.secondary', textAlign: 'center', mb: 3 }}>
            {t('pages.error.500.description')}
          </Typography>
        </MotionPart>
        <Box sx={compactPageActionsStackSx}>
          <Button size="large" color="primary" variant="contained" onClick={handleRefresh}>
            {t('pages.error.500.refresh')}
          </Button>

          <Button component="a" href={paths.home} size="large" variant="text">
            {t('pages.error.500.action')}
          </Button>
        </Box>
      </MotionContainer>
    </CompactLayout>
  );
}

Page500.propTypes = {
  reset: PropTypes.func,
};
