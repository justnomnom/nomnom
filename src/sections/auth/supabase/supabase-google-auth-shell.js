'use client';

import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { ic } from 'src/assets/icons';
import { APP } from 'src/config-global';
import { useTranslate } from 'src/locales';
import { readableAccent } from 'src/theme/readable-accent';

import Iconify from 'src/components/iconify';

// ----------------------------------------------------------------------

export default function SupabaseGoogleAuthShell({ children, swapSlot }) {
  const theme = useTheme();
  const { t } = useTranslate();

  const muted = theme.palette.grey[600];

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        maxWidth: 420,
        minHeight: { xs: 'calc(100dvh - 120px)', md: 'calc(100dvh - 140px)' },
        position: 'relative',
        zIndex: 1,
        mx: 'auto',
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'fixed',
          pointerEvents: 'none',
          inset: 0,
          overflow: 'hidden',
          zIndex: 0,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 24,
            left: -48,
            opacity: 0.2,
            transform: 'rotate(12deg) scale(1.5)',
          }}
        >
          <Iconify icon={ic.emojiPizza} width={120} />
        </Box>
        <Box
          sx={{
            position: 'absolute',
            bottom: 140,
            right: -40,
            opacity: 0.2,
            transform: 'rotate(-12deg) scale(1.5)',
          }}
        >
          <Iconify icon={ic.emojiHamburger} width={120} />
        </Box>
        <Box
          sx={{
            position: 'absolute',
            top: '42%',
            right: -72,
            opacity: 0.1,
            transform: 'rotate(45deg) scale(1.25)',
          }}
        >
          <Iconify icon={ic.emojiTaco} width={140} />
        </Box>
      </Box>

      <Stack
        spacing={3}
        alignItems="center"
        sx={{
          flex: 1,
          justifyContent: 'center',
          width: '100%',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Stack spacing={2} alignItems="center" sx={{ textAlign: 'center', mb: 1 }}>
          <Box
            component="img"
            src="/logo/logo_single.png"
            alt={APP.name}
            sx={{
              width: '100%',
              maxWidth: { xs: 340, sm: 400 },
              height: 'auto',
              display: 'block',
              mx: 'auto',
            }}
          />

          <Typography
            sx={{
              px: 1,
              color: muted,
              fontSize: '1.25rem',
              fontWeight: 500,
              lineHeight: 1.35,
            }}
          >
            {t('pages.auth.google.tagline_before')}{' '}
            <Box
              component="span"
              sx={{ color: readableAccent(theme), fontWeight: 800, fontStyle: 'italic' }}
            >
              {t('pages.auth.google.tagline_highlight')}
            </Box>
            {t('pages.auth.google.tagline_after')
              ? ` ${t('pages.auth.google.tagline_after')}`
              : null}
          </Typography>
        </Stack>

        <Stack spacing={2} sx={{ width: '100%', position: 'relative', zIndex: 1 }}>
          {children}
          {swapSlot}
        </Stack>
      </Stack>

      <Typography
        component="div"
        sx={{
          mt: 4,
          textAlign: 'center',
          maxWidth: 360,
          typography: 'caption',
          fontSize: '0.625rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: muted,
          lineHeight: 1.7,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {t('pages.auth.google.legal_prefix')}{' '}
        <Link
          component={RouterLink}
          href={paths.terms}
          color="text.primary"
          underline="always"
          sx={{
            textDecorationColor: 'primary.main',
            textDecorationThickness: 2,
            textUnderlineOffset: 4,
            fontWeight: 700,
          }}
        >
          {t('pages.auth.google.terms_label')}
        </Link>{' '}
        {t('pages.auth.google.legal_and')}{' '}
        <Link
          component={RouterLink}
          href={paths.privacy}
          color="text.primary"
          underline="always"
          sx={{
            textDecorationColor: 'primary.main',
            textDecorationThickness: 2,
            textUnderlineOffset: 4,
            fontWeight: 700,
          }}
        >
          {t('pages.auth.google.privacy_label')}
        </Link>
        .
      </Typography>
    </Box>
  );
}

SupabaseGoogleAuthShell.propTypes = {
  children: PropTypes.node,
  swapSlot: PropTypes.node,
};
