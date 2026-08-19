'use client';

import PropTypes from 'prop-types';

import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { useTranslate } from 'src/locales';

import { varFade, MotionPart, MotionContainer } from 'src/components/animate';

import {
  dashboardSubsectionStackProps,
  MARKETING_SPACE_HERO_TO_CONTENT,
} from 'src/sections/profile/view/settings-shell-shared';

import FaqsForm from '../../faqs/faqs-form';

// ----------------------------------------------------------------------

export default function ContactView({ variant = 'page' }) {
  const { t } = useTranslate();
  const isSettings = variant === 'settings';

  if (isSettings) {
    return (
      <Stack {...dashboardSubsectionStackProps} sx={{ width: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
          {t('pages.contact_us.form.subtitle')}
        </Typography>
        <FaqsForm
          variant="settings"
          translationPrefix="pages.contact_us.form"
          analyticsLocation="settings_support"
        />
      </Stack>
    );
  }

  return (
    <Container sx={{ py: 10 }}>
      <Stack spacing={MARKETING_SPACE_HERO_TO_CONTENT} sx={{ maxWidth: 560, mx: 'auto' }}>
        <MotionContainer>
          <MotionPart variants={varFade().inUp}>
            <Stack {...dashboardSubsectionStackProps} sx={{ textAlign: 'center' }}>
              <Typography variant="h2">{t('pages.contact_us.title')}</Typography>
              <Typography sx={{ color: 'text.secondary' }}>
                {t('pages.contact_us.form.subtitle')}
              </Typography>
            </Stack>
          </MotionPart>
        </MotionContainer>
        <FaqsForm translationPrefix="pages.contact_us.form" analyticsLocation="contact_page" />
      </Stack>
    </Container>
  );
}

ContactView.propTypes = {
  variant: PropTypes.oneOf(['page', 'settings']),
};
