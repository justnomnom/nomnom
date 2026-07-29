'use client';

import PropTypes from 'prop-types';

import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { useTranslate } from 'src/locales';
import { useAuthContext } from 'src/auth/hooks';
import { ForbiddenIllustration } from 'src/assets/illustrations';

import { varFade, MotionPart, MotionContainer } from 'src/components/animate';

// ----------------------------------------------------------------------

export default function RoleBasedGuard({ hasContent, roles, children, sx }) {
  const { user } = useAuthContext();
  const { t } = useTranslate();

  const currentRole = user?.role; // admin;

  if (typeof roles !== 'undefined' && !roles.includes(currentRole)) {
    return hasContent ? (
      <Container component={MotionContainer} sx={{ textAlign: 'center', ...sx }}>
        <MotionPart variants={varFade().in}>
          <Typography variant="h3" sx={{ mb: 1 }}>
            {t('pages.auth.permission.denied')}
          </Typography>
        </MotionPart>

        <MotionPart variants={varFade().in}>
          <Typography sx={{ color: 'text.secondary' }}>
            {t('pages.auth.permission.message')}
          </Typography>
        </MotionPart>

        <MotionPart variants={varFade().in}>
          <ForbiddenIllustration
            sx={{
              height: 260,
              my: { xs: 5, sm: 10 },
            }}
          />
        </MotionPart>
      </Container>
    ) : null;
  }

  return <> {children} </>;
}

RoleBasedGuard.propTypes = {
  children: PropTypes.node,
  hasContent: PropTypes.bool,
  roles: PropTypes.arrayOf(PropTypes.string),
  sx: PropTypes.object,
};
