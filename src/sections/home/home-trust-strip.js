'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { readableAccent } from 'src/theme/readable-accent';
import { getLocaleBodyMaxWidthCh } from 'src/theme/locale-prose';

import Iconify from 'src/components/iconify';
import { varFade, MotionPart, MotionViewport } from 'src/components/animate';

import {
  dashboardSubsectionStackProps,
  marketingPageSectionStackProps,
} from 'src/sections/profile/view/settings-shell-shared';

const TRUST_ITEMS = [
  { key: 'free', icon: ic.walletBold },
  { key: 'voices', icon: ic.usersGroupRoundedBold },
  { key: 'leave', icon: ic.checkCircleBold },
];

/**
 * Three-point “what makes us different” band: free app, chosen voices, user control.
 * Copy lives in `pages.home.trustStrip` so the canonical free/voices/control lines actually render.
 */
export default function HomeTrustStrip() {
  const theme = useTheme();
  const { t } = useTranslate();
  const bodyMaxWidth = getLocaleBodyMaxWidthCh(theme);

  return (
    <Box
      component="section"
      aria-labelledby="home-trust-strip-heading"
      sx={{
        py: { xs: 5, sm: 6, md: 8 },
        px: { xs: 0 },
        bgcolor: 'transparent',
      }}
    >
      <Container component={MotionViewport} maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
        <Stack
          {...dashboardSubsectionStackProps}
          sx={{
            textAlign: { xs: 'center', md: 'left' },
            mb: { xs: 4, sm: 5 },
            maxWidth: { md: 'min(100%, 52rem)' },
            mx: { xs: undefined, md: 0 },
          }}
        >
          <MotionPart variants={varFade().inUp}>
            <Typography
              id="home-trust-strip-heading"
              variant="h2"
              sx={(th) => ({
                fontFamily: th.typography.fontSecondaryFamily,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                textTransform: 'none',
                fontSize: { xs: '1.625rem', sm: '2rem', md: '2.25rem' },
                lineHeight: { xs: 1.2, md: 1.22 },
                color: 'text.primary',
              })}
            >
              {t('pages.home.trustStrip.title')}
            </Typography>
          </MotionPart>
        </Stack>

        <Stack {...marketingPageSectionStackProps}>
          <Grid container spacing={{ xs: 2.5, sm: 3 }}>
            {TRUST_ITEMS.map((item) => (
              <Grid key={item.key} size={{ xs: 12, md: 4 }}>
                <MotionPart variants={varFade().inUp}>
                  <Card
                    sx={{
                      height: '100%',
                      p: { xs: 2.5, sm: 3 },
                      borderRadius: 2.5,
                      bgcolor: (th) => alpha(th.palette.background.paper, 0.88),
                      boxShadow: (th) =>
                        `${alpha(th.palette.marketing.hairline, th.palette.mode === 'light' ? 0.45 : 0.2)} 0px 0px 0px 1px`,
                    }}
                  >
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 2,
                        bgcolor: (th) => alpha(th.palette.primary.main, 0.12),
                        color: (th) => readableAccent(th),
                      }}
                    >
                      <Iconify icon={item.icon} width={26} />
                    </Box>
                    <Typography
                      variant="h5"
                      component="h3"
                      sx={(th) => ({
                        fontFamily: th.typography.fontSecondaryFamily,
                        fontWeight: 700,
                        mb: 1.25,
                        letterSpacing: '-0.01em',
                        fontSize: { xs: '1.0625rem', sm: '1.125rem' },
                        lineHeight: 1.3,
                      })}
                    >
                      {t(`pages.home.trustStrip.items.${item.key}.title`)}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'text.secondary',
                        fontWeight: 400,
                        lineHeight: 1.65,
                        maxWidth: bodyMaxWidth,
                      }}
                    >
                      {t(`pages.home.trustStrip.items.${item.key}.body`)}
                    </Typography>
                  </Card>
                </MotionPart>
              </Grid>
            ))}
          </Grid>
        </Stack>
      </Container>
    </Box>
  );
}
