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

export default function NotFoundView({ title, message, action }) {
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
              color: (theme) => readableAccent(theme),
              letterSpacing: 1.2,
            }}
          >
            {t('pages.error.404.eyebrow')}
          </Typography>
        </MotionPart>

        <MotionPart variants={varFade().inUp}>
          <Typography variant="h3" sx={{ mb: 2, textAlign: 'center' }}>
            {title || t('pages.error.404.title')}
          </Typography>
        </MotionPart>

        <MotionPart variants={varFade().inUp}>
          <Typography sx={{ color: 'text.secondary', textAlign: 'center' }}>
            {message || t('pages.error.404.description')}
          </Typography>
        </MotionPart>

        <Box sx={compactPageActionsStackSx}>
          {action || (
            <>
              <Button
                component="a"
                href={paths.home}
                color="primary"
                size="large"
                variant="contained"
              >
                {t('pages.error.404.goToHome')}
              </Button>
              <Button component="a" href={paths.site.featuresRoot} size="large" variant="text">
                {t('pages.error.404.seeHowItWorks')}
              </Button>
            </>
          )}
        </Box>
      </MotionContainer>
    </CompactLayout>
  );
}

NotFoundView.propTypes = {
  title: PropTypes.string,
  message: PropTypes.string,
  action: PropTypes.node,
};
