'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';

import Iconify from 'src/components/iconify';
import { varFade, MotionPart, MotionViewport } from 'src/components/animate';

// ----------------------------------------------------------------------

const starVariants = (index) => ({
  initial: { opacity: 0, scale: 0.3 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { delay: 0.5 + index * 0.1, duration: 0.4, ease: 'easeOut' },
  },
});

export default function HomeTestimonial() {
  const theme = useTheme();
  const { t } = useTranslate();

  return (
    <Box
      component="section"
      aria-labelledby="home-testimonial-heading"
      sx={{
        py: { xs: 5, sm: 7, md: 9 },
        px: { xs: 0 },
        bgcolor: 'transparent',
      }}
    >
      <Container component={MotionViewport} maxWidth="md" sx={{ px: { xs: 2, sm: 3 } }}>
        <MotionPart variants={varFade().inUp}>
          <Typography
            id="home-testimonial-heading"
            component="p"
            variant="overline"
            sx={{
              display: 'block',
              textAlign: 'center',
              letterSpacing: '0.14em',
              fontWeight: 700,
              fontSize: '0.75rem',
              color: 'text.secondary',
              mb: 2,
            }}
          >
            {t('pages.home.testimonial.kicker')}
          </Typography>
        </MotionPart>

        <MotionPart variants={varFade().inUp}>
          <Box
            sx={{
              position: 'relative',
              mt: 4.5,
              px: { xs: 1, sm: 2, md: 4 },
              py: { xs: 3, sm: 4 },
              borderRadius: 3,
              border: (th) => `1px solid ${alpha(th.palette.marketing.hairline, 0.75)}`,
              bgcolor: (th) => alpha(th.palette.background.paper, 0.85),
              boxShadow: (th) =>
                `${alpha(th.palette.marketing.shadowWarm, 0.08)} 0px 24px 48px -20px`,
              transform: 'rotate(-1.2deg)',
              transition: 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
              '&:hover': { transform: 'rotate(0deg) translateY(-4px)' },
              '@media (prefers-reduced-motion: reduce)': {
                transform: 'none',
                '&:hover': { transform: 'none' },
              },
            }}
          >
            <Box
              component="img"
              src="/assets/home/hero-trusted-2.svg"
              alt=""
              sx={{
                position: 'absolute',
                top: -26,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 54,
                height: 54,
                borderRadius: '50%',
                border: (th) => `3px solid ${th.palette.background.paper}`,
                boxShadow: (th) =>
                  `0 8px 16px -4px ${alpha(th.palette.marketing.shadowWarm, 0.24)}`,
              }}
            />
            <Box component="figure" sx={{ m: 0, position: 'relative' }}>
              <Typography
                aria-hidden
                sx={{
                  position: 'absolute',
                  top: { xs: 8, sm: 12 },
                  left: { xs: 12, sm: 20 },
                  fontFamily: theme.typography.fontSecondaryFamily,
                  fontSize: { xs: '3rem', sm: '3.75rem' },
                  lineHeight: 1,
                  color: (th) => alpha(th.palette.primary.main, 0.18),
                  userSelect: 'none',
                }}
              >
                “
              </Typography>
              <Typography
                variant="h5"
                component="blockquote"
                sx={{
                  position: 'relative',
                  zIndex: 1,
                  textAlign: 'center',
                  fontFamily: theme.typography.fontSecondaryFamily,
                  fontWeight: 400,
                  fontStyle: 'italic',
                  letterSpacing: '-0.01em',
                  lineHeight: 1.55,
                  color: 'text.primary',
                  fontSize: { xs: '1.125rem', sm: '1.25rem', md: '1.35rem' },
                  m: 0,
                  pt: { xs: 2, sm: 1 },
                }}
              >
                {t('pages.home.testimonial.quote')}
              </Typography>
              <Stack
                direction="row"
                justifyContent="center"
                spacing={0.5}
                aria-hidden
                sx={{ mt: 2.25, color: 'warning.main' }}
              >
                {[0, 1, 2, 3, 4].map((index) => (
                  <MotionPart key={index} variants={starVariants(index)}>
                    <Iconify icon={ic.starBold} width={20} />
                  </MotionPart>
                ))}
              </Stack>
              <Typography
                variant="subtitle2"
                component="figcaption"
                sx={{
                  textAlign: 'center',
                  mt: 3,
                  color: 'text.primary',
                }}
              >
                <Box component="span" sx={{ display: 'block', fontWeight: 600 }}>
                  {t('pages.home.testimonial.name')}
                </Box>
                <Box
                  component="span"
                  sx={{
                    display: 'block',
                    mt: 0.5,
                    typography: 'body2',
                    color: 'text.secondary',
                    fontWeight: 500,
                  }}
                >
                  {t('pages.home.testimonial.role')}
                </Box>
              </Typography>
            </Box>
          </Box>
        </MotionPart>
      </Container>
    </Box>
  );
}
