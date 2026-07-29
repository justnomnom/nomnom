import Link from 'next/link';
import Image from 'next/image';
import PropTypes from 'prop-types';
import { useRef, Fragment, useEffect } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { alpha, styled, keyframes } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { ic } from 'src/assets/icons';
import { APP } from 'src/config-global';
import { bgGradient } from 'src/theme/css';
import { useLocales, useTranslate } from 'src/locales';
import { getLocaleBodyMaxWidthCh } from 'src/theme/locale-prose';
import { useAuthContext } from 'src/auth/hooks/use-auth-context';
import { useAnalytics } from 'src/libs/analytics/analytics-provider';

import Iconify from 'src/components/iconify';
import { varFade, MotionPart, MotionContainer } from 'src/components/animate';

import HomeHeroFloats from './home-hero-floats';
import HomeHeroShowcase from './home-hero-showcase';
import { FLOAT_LAYER_CLASS, REDUCED_MOTION_NONE } from './home-motion';

const HERO_CIRCLE_AVATARS = [
  '/assets/home/hero-trusted-1.svg',
  '/assets/home/hero-trusted-2.svg',
  '/assets/home/hero-trusted-3.svg',
];

/** Warm editorial CTAs — aligned with DESIGN.md (terracotta primary, readable sans) */
const heroCtaSharedSx = {
  borderRadius: 2,
  fontWeight: 600,
  textTransform: 'none',
  letterSpacing: '0.02em',
  lineHeight: 1.35,
  px: { xs: 3, sm: 4 },
  py: 1.75,
  minHeight: { xs: 48, sm: 50 },
  fontSize: { xs: '0.9375rem', sm: '1rem' },
  width: { xs: '100%', sm: 'auto' },
  maxWidth: { xs: 400, sm: 'none' },
  mx: { xs: 'auto', sm: 0 },
};

// ----------------------------------------------------------------------

const drift1 = keyframes`
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(60px, 40px); }
`;

const drift2 = keyframes`
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(-50px, 30px); }
`;

const drift3 = keyframes`
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(30px, -40px); }
`;

const wordUp = keyframes`
  to { opacity: 1; transform: none; }
`;

const drawLine = keyframes`
  to { stroke-dashoffset: 0; }
`;

/** Drifting warm background blobs behind the hero (handoff design). */
function HeroBlobs() {
  const blobSx = {
    position: 'absolute',
    borderRadius: '50%',
    filter: 'blur(60px)',
    opacity: 0.68,
    ...REDUCED_MOTION_NONE,
  };

  return (
    <Box aria-hidden sx={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
      <Box
        sx={{
          ...blobSx,
          width: 460,
          height: 460,
          top: -120,
          left: -100,
          background: (th) =>
            `radial-gradient(circle, ${alpha(th.palette.primary.main, 0.28)}, transparent 70%)`,
          animation: `${drift1} 22s ease-in-out infinite`,
        }}
      />
      <Box
        sx={{
          ...blobSx,
          width: 420,
          height: 420,
          top: 40,
          right: -120,
          background: (th) =>
            `radial-gradient(circle, ${alpha(th.palette.warning.main, 0.22)}, transparent 70%)`,
          animation: `${drift2} 26s ease-in-out infinite`,
        }}
      />
      <Box
        sx={{
          ...blobSx,
          width: 360,
          height: 360,
          bottom: -140,
          left: '38%',
          background: (th) =>
            `radial-gradient(circle, ${alpha(th.palette.primary.light, 0.22)}, transparent 70%)`,
          animation: `${drift3} 30s ease-in-out infinite`,
        }}
      />
    </Box>
  );
}

const StyledRoot = styled('div')(({ theme }) => ({
  ...bgGradient({
    direction: 'to bottom',
    startColor:
      theme.palette.mode === 'light'
        ? alpha(theme.palette.marketing.parchment, 0.88)
        : alpha(theme.palette.marketing.surfaceDark, 0.82),
    // End on the exact parchment the next section uses so the hero hands off
    // seamlessly instead of leaving a darker band/line under the showcase card.
    endColor:
      theme.palette.mode === 'light'
        ? theme.palette.marketing.parchment
        : alpha(theme.palette.marketing.surfaceDarker, 0.9),
  }),
  width: '100%',
  position: 'relative',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  padding: theme.spacing(2, 0),
  paddingTop: theme.spacing(5),
  paddingBottom: theme.spacing(7),
  [theme.breakpoints.up('sm')]: {
    paddingTop: theme.spacing(6),
    paddingBottom: theme.spacing(9),
  },
}));

/**
 * Word-by-word headline reveal. The accent phrase ("Stop guessing where to eat.")
 * stays in plain ink; the suffix ("Start following who knows.") is the colored payoff
 * and its last word gets the hand-drawn underline that draws itself — emphasis lands on
 * "knows", the value prop, instead of crossing it out.
 */
function HeadlineWords({ text, startIndex = 0, decoration }) {
  const words = text.split(' ').filter(Boolean);

  // NOTE: The headline is the mobile LCP element. It must stay painted (opacity:1)
  // on the first frame — animating opacity from 0 makes the browser defer the LCP
  // timestamp until each word's animationDelay elapses (~0.5s+), wrecking the score.
  // We keep the staggered rise as a transform-only reveal, which is LCP-neutral.
  const wordSx = (index) => ({
    display: 'inline-block',
    transform: 'translateY(0.5em) rotate(2deg)',
    animation: `${wordUp} 0.55s cubic-bezier(0.2, 0.85, 0.25, 1) forwards`,
    animationDelay: `${0.15 + (startIndex + index) * 0.07}s`,
    '@media (prefers-reduced-motion: reduce)': {
      animation: 'none',
      transform: 'none',
    },
  });

  const decorationSvgSx = {
    position: 'absolute',
    overflow: 'visible',
    pointerEvents: 'none',
    '& path': {
      fill: 'none',
      strokeLinecap: 'round',
      strokeDasharray: 300,
      strokeDashoffset: 300,
      '@media (prefers-reduced-motion: reduce)': {
        strokeDashoffset: 0,
        animation: 'none',
      },
    },
  };

  return words.map((word, index) => {
    const isLast = index === words.length - 1;
    const space = isLast ? null : ' ';

    if (isLast && decoration === 'underline') {
      return (
        <Box key={word} component="span" sx={{ display: 'inline-block', position: 'relative' }}>
          <Box component="span" sx={wordSx(index)}>
            {word}
          </Box>
          <Box
            component="svg"
            viewBox="0 0 200 20"
            preserveAspectRatio="none"
            aria-hidden
            sx={{
              ...decorationSvgSx,
              left: '-2%',
              bottom: '-0.32em',
              width: '104%',
              height: '0.42em',
              '& path': {
                ...decorationSvgSx['& path'],
                stroke: (th) => th.palette.primary.main,
                strokeWidth: 7,
                animation: `${drawLine} 0.55s ease-out 0.5s forwards`,
              },
            }}
          >
            <path d="M4,14 C42,6 82,6 112,11 C142,16 176,9 196,7" />
          </Box>
        </Box>
      );
    }

    if (isLast && decoration === 'strike') {
      return (
        <Box key={word} component="span" sx={{ display: 'inline-block', position: 'relative' }}>
          <Box component="span" sx={wordSx(index)}>
            {word}
          </Box>
          <Box
            component="svg"
            viewBox="0 0 200 20"
            preserveAspectRatio="none"
            aria-hidden
            sx={{
              ...decorationSvgSx,
              left: '-3%',
              top: '52%',
              width: '106%',
              height: '0.34em',
              '& path': {
                ...decorationSvgSx['& path'],
                stroke: (th) => th.palette.text.primary,
                strokeWidth: 6,
                animation: `${drawLine} 0.45s ease-out 1.05s forwards`,
              },
            }}
          >
            <path d="M2,12 C46,7 96,15 142,10 C166,7 184,10 198,8" />
          </Box>
        </Box>
      );
    }

    return (
      <Fragment key={`${word}-${index}`}>
        <Box component="span" sx={{ display: 'inline-block' }}>
          <Box component="span" sx={wordSx(index)}>
            {word}
          </Box>
        </Box>
        {space}
      </Fragment>
    );
  });
}

HeadlineWords.propTypes = {
  text: PropTypes.string,
  startIndex: PropTypes.number,
  decoration: PropTypes.oneOf(['underline', 'strike']),
};

const StyledWrapper = styled('div')(() => ({
  width: '100%',
  flex: '0 1 auto',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 0,
  overflowX: 'hidden',
  overflowY: 'visible',
  position: 'relative',
  zIndex: 2,
}));

// ----------------------------------------------------------------------

function HeroActions() {
  const { t } = useTranslate();
  const { user } = useAuthContext();
  const analytics = useAnalytics();

  return (
    <MotionPart variants={varFade().in}>
      <Stack spacing={1.5} alignItems="center" sx={{ width: '100%', maxWidth: 520 }}>
        <Stack
          spacing={2}
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="center"
          alignItems="center"
          sx={{ width: '100%' }}
        >
          <Button
            color="inherit"
            size="large"
            variant="outlined"
            component={RouterLink}
            href={paths.dashboard.discover}
            onClick={() => {
              const isAuthenticated = !!user;
              analytics.trackEvent('homepage_view_dashboard', {
                action_type: 'login',
                button_label: t('pages.home.hero.signIn'),
                destination: paths.dashboard.discover,
                page_location: typeof window !== 'undefined' ? window.location.href : '',
                page_title: typeof window !== 'undefined' ? document.title : '',
                is_authenticated: isAuthenticated,
                is_subscriber: false,
                user_id: user?.id || null,
              });
            }}
            sx={{
              ...heroCtaSharedSx,
              bgcolor: 'background.paper',
              borderColor: (th) => alpha(th.palette.marketing.outlineMuted, 0.35),
              borderWidth: 1,
              color: 'text.primary',
              boxShadow: (th) =>
                `${alpha(th.palette.marketing.hairline, 0.9)} 0px 0px 0px 1px inset`,
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: (th) => alpha(th.palette.marketing.dividerWarm, 0.65),
                boxShadow: (th) => `${alpha(th.palette.primary.main, 0.25)} 0px 0px 0px 1px`,
              },
              transition: (theme) =>
                theme.transitions.create(
                  ['transform', 'box-shadow', 'border-color', 'background-color'],
                  {
                    duration: 200,
                  }
                ),
            }}
          >
            {t('pages.home.hero.signIn')}
          </Button>

          {user ? (
            <Button
              color="primary"
              size="large"
              variant="contained"
              component={RouterLink}
              href={paths.dashboard.discover}
              onClick={() => {
                analytics.trackEvent('homepage_start_plan_generation', {
                  action_type: 'get_started',
                  button_label: t('pages.home.hero.getStarted'),
                  destination: paths.dashboard.discover,
                  user_type: 'authenticated',
                  page_location: typeof window !== 'undefined' ? window.location.href : '',
                  page_title: typeof window !== 'undefined' ? document.title : '',
                  is_authenticated: true,
                  is_subscriber: false,
                  user_id: user?.id || null,
                });
              }}
              sx={{
                ...heroCtaSharedSx,
                boxShadow: (th) =>
                  `${th.palette.primary.dark} 0px 0px 0px 0px, ${alpha(th.palette.primary.main, 0.35)} 0px 0px 0px 1px`,
                '&:hover': {
                  bgcolor: 'primary.dark',
                  boxShadow: (th) =>
                    `${th.palette.primary.darker} 0px 0px 0px 0px, ${alpha(th.palette.primary.main, 0.45)} 0px 0px 0px 1px`,
                },
                transition: (theme) =>
                  theme.transitions.create(['transform', 'box-shadow', 'background-color'], {
                    duration: 200,
                  }),
              }}
            >
              {t('pages.home.hero.getStarted')}
            </Button>
          ) : (
            <Button
              color="primary"
              size="large"
              variant="contained"
              component={RouterLink}
              href={`${paths.auth.supabase.register}?returnTo=${encodeURIComponent(paths.dashboard.discover)}`}
              onClick={() => {
                analytics.trackEvent('homepage_signup_cta', {
                  action_type: 'signup',
                  button_label: t('pages.home.hero.getStarted'),
                  destination: paths.auth.supabase.register,
                  page_location: typeof window !== 'undefined' ? window.location.href : '',
                  page_title: typeof window !== 'undefined' ? document.title : '',
                  is_authenticated: false,
                });
              }}
              sx={{
                ...heroCtaSharedSx,
                boxShadow: (th) =>
                  `${th.palette.primary.dark} 0px 0px 0px 0px, ${alpha(th.palette.primary.main, 0.35)} 0px 0px 0px 1px`,
                '&:hover': {
                  bgcolor: 'primary.dark',
                  boxShadow: (th) =>
                    `${th.palette.primary.darker} 0px 0px 0px 0px, ${alpha(th.palette.primary.main, 0.45)} 0px 0px 0px 1px`,
                },
                transition: (theme) =>
                  theme.transitions.create(['transform', 'box-shadow', 'background-color'], {
                    duration: 200,
                  }),
              }}
            >
              {t('pages.home.hero.getStarted')}
            </Button>
          )}
        </Stack>
        <Typography
          variant="caption"
          component="p"
          sx={{
            textAlign: 'center',
            color: 'text.secondary',
            fontWeight: 500,
            letterSpacing: '0.02em',
            lineHeight: 1.5,
            px: { xs: 1, sm: 0 },
          }}
        >
          {t('pages.auth.register.trust_line')}
        </Typography>
        {APP.appStoreUrl ? (
          <Typography
            component={Link}
            href={APP.appStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="caption"
            sx={{
              textAlign: 'center',
              color: 'primary.dark',
              fontWeight: 600,
              letterSpacing: '0.02em',
              textDecoration: 'none',
              borderBottom: (th) => `1px solid ${alpha(th.palette.primary.dark, 0.45)}`,
              pb: 0.25,
              '&:hover': {
                color: 'primary.darker',
                borderBottomColor: 'primary.darker',
              },
            }}
          >
            {t('pages.home.hero.appStoreVerify')}
          </Typography>
        ) : null}
      </Stack>
    </MotionPart>
  );
}

// ----------------------------------------------------------------------

export default function HomeHero() {
  const { t } = useTranslate();
  const { currentLang } = useLocales();
  const heroRef = useRef(null);
  const heroBodyMaxWidth = getLocaleBodyMaxWidthCh(currentLang?.value);

  const headlineAccent = t('pages.home.hero.headline');
  const headlineSuffix = t('pages.home.hero.headlineSuffix');

  // Subtle parallax: drift the floating-chip layer toward the cursor (fine pointers only).
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return undefined;
    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !window.matchMedia('(pointer: fine)').matches
    ) {
      return undefined;
    }
    const layer = hero.querySelector(`.${FLOAT_LAYER_CLASS}`);
    if (!layer) return undefined;

    const onMove = (event) => {
      const rect = hero.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      layer.style.transform = `translate(${px * 16}px, ${py * 16}px)`;
    };
    const onLeave = () => {
      layer.style.transform = '';
    };

    hero.addEventListener('pointermove', onMove);
    hero.addEventListener('pointerleave', onLeave);
    return () => {
      hero.removeEventListener('pointermove', onMove);
      hero.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  const renderDescription = (
    <Stack
      alignItems="center"
      justifyContent="center"
      sx={{
        width: '100%',
        maxWidth: '100%',
        px: { xs: 1.5, sm: 2, md: 4 },
        py: { xs: 0.5, md: 0 },
        boxSizing: 'border-box',
      }}
    >
      {/* Rendered statically (no opacity entrance) and via next/image so the brand
          mark paints immediately alongside the headline and Vercel serves a resized
          AVIF/WebP (~10 KB) instead of the raw 533 KB PNG during the critical load. */}
      <Box
        sx={{
          display: 'inline-flex',
          justifyContent: 'center',
          py: { xs: 2, sm: 2.5, md: 3 },
          mb: { xs: 1.25, sm: 2, md: 2.25 },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            height: {
              xs: 'clamp(3.35rem, 14.5vw, 4.75rem)',
              sm: '4rem',
              md: '4.5rem',
            },
            width: 'auto',
            maxWidth: { xs: 'min(98vw, 520px)', sm: 'min(90vw, 560px)', md: 600 },
          }}
        >
          <Image
            src="/logo/logo_single.png"
            alt={APP.name}
            width={1881}
            height={836}
            priority
            sizes="(min-width: 900px) 165px, (min-width: 600px) 145px, 130px"
            style={{ height: '100%', width: 'auto', maxWidth: '100%', objectFit: 'contain' }}
          />
        </Box>
      </Box>

      <Typography
        variant="h1"
        sx={(theme) => ({
          textAlign: 'center',
          maxWidth: '100%',
          mb: { xs: 1.5, sm: 2 },
          px: { xs: 0, sm: 1, md: 2 },
          fontFamily: theme.typography.fontSecondaryFamily,
          fontWeight: 700,
          fontSize: { xs: 'clamp(2rem, 6vw, 2.5rem)', sm: '2.875rem', md: '3.5rem' },
          lineHeight: { xs: 1.16, sm: 1.18, md: 1.2 },
          overflowWrap: 'break-word',
          hyphens: 'manual',
          color: 'text.primary',
        })}
      >
        <Box component="span" sx={{ color: 'text.primary' }}>
          <HeadlineWords text={headlineAccent} />
        </Box>{' '}
        <Box component="span" sx={{ color: 'primary.main' }}>
          <HeadlineWords
            text={headlineSuffix}
            startIndex={headlineAccent.split(' ').filter(Boolean).length}
            decoration="underline"
          />
        </Box>
      </Typography>

      <MotionPart variants={varFade().in}>
        <Typography
          component="p"
          sx={{
            textAlign: 'center',
            maxWidth: heroBodyMaxWidth,
            mx: 'auto',
            mb: { xs: 2, sm: 2.75 },
            color: 'text.secondary',
            fontWeight: 400,
            fontSize: { xs: '1rem', sm: '1.125rem', md: '1.1875rem' },
            lineHeight: 1.65,
            px: { xs: 0, sm: 0 },
            overflowWrap: 'anywhere',
          }}
        >
          {t('pages.home.hero.description')}
        </Typography>
      </MotionPart>

      <MotionPart variants={varFade().in}>
        <Stack
          spacing={1.5}
          direction={{ xs: 'column', sm: 'row' }}
          sx={{ my: { xs: 1, sm: 1.5 }, width: '100%' }}
          justifyContent="center"
        >
          <HeroActions />
        </Stack>
      </MotionPart>

      <MotionPart variants={varFade().in}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems="center"
          justifyContent="center"
          spacing={{ xs: 2, sm: 0 }}
          sx={{
            mt: { xs: 2, sm: 2.5 },
            pt: { xs: 0.5, sm: 1 },
            mb: { xs: 2, md: 3 },
            px: { xs: 2, md: 0 },
          }}
          aria-label={t('pages.home.hero.trustedBy')}
        >
          <Stack direction="row" alignItems="center">
            {HERO_CIRCLE_AVATARS.map((src, index) => (
              <Box
                key={src}
                sx={{
                  position: 'relative',
                  width: 48,
                  height: 48,
                  flexShrink: 0,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: (theme) => `3px solid ${theme.palette.background.default}`,
                  ml: index === 0 ? 0 : -2,
                  zIndex: HERO_CIRCLE_AVATARS.length - index,
                }}
              >
                <Image
                  src={src}
                  alt=""
                  width={48}
                  height={48}
                  sizes="48px"
                  decoding="async"
                  fetchPriority="low"
                  aria-hidden
                  style={{ objectFit: 'cover' }}
                />
              </Box>
            ))}
            <Box
              aria-hidden
              sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                border: (theme) => `3px solid ${theme.palette.background.default}`,
                ml: -2,
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.14),
                color: 'primary.dark',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 0,
              }}
            >
              <Iconify icon={ic.addRounded} width={20} />
            </Box>
          </Stack>
          <Typography
            component="p"
            sx={{
              ml: { sm: 4 },
              textAlign: { xs: 'center', sm: 'left' },
              typography: 'body2',
              fontWeight: 500,
              color: 'text.secondary',
              letterSpacing: '0.02em',
              maxWidth: 300,
              lineHeight: 1.5,
            }}
          >
            {t('pages.home.hero.trustedBy')}
          </Typography>
        </Stack>
      </MotionPart>

      <HomeHeroShowcase />
    </Stack>
  );

  return (
    <StyledRoot ref={heroRef}>
      <HeroBlobs />
      <HomeHeroFloats />
      <StyledWrapper>
        <Container component={MotionContainer} maxWidth="lg">
          <Grid container>
            <Grid
              size={{ xs: 12 }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                py: { xs: 1, sm: 1.5 },
              }}
            >
              {renderDescription}
            </Grid>
          </Grid>
        </Container>
      </StyledWrapper>
    </StyledRoot>
  );
}
