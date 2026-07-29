'use client';

import Link from 'next/link';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { alpha, useTheme, keyframes } from '@mui/material/styles';

import { paths } from 'src/routes/paths';

import { ic } from 'src/assets/icons';
import { RADIUS } from 'src/theme/spacing';
import { useTranslate } from 'src/locales';
import { useAuthContext } from 'src/auth/hooks/use-auth-context';
import { useAnalytics } from 'src/libs/analytics/analytics-provider';

import Iconify from 'src/components/iconify';
import { varFade, MotionPart, MotionViewport } from 'src/components/animate';

import { bob, REDUCED_MOTION_NONE } from './home-motion';

// ----------------------------------------------------------------------

const tickScroll = keyframes`
  to { transform: translateX(-50%); }
`;

const adGlow = keyframes`
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
`;

const TICKER_TAGS = [
  { key: 'seafood', icon: 'emojiShrimp' },
  { key: 'petiscos', icon: 'emojiForkKnifePlate' },
  { key: 'brunch', icon: 'emojiHotBeverage' },
  { key: 'wine', icon: 'emojiWineGlass' },
  { key: 'grill', icon: 'emojiCutOfMeat' },
  { key: 'dateNight', icon: 'emojiSparklingHeart' },
  { key: 'pizza', icon: 'emojiPizza' },
  { key: 'sushi', icon: 'emojiSushi' },
  { key: 'lateNight', icon: 'emojiCrescentMoon' },
];

const EMOJI_ROW = [
  'emojiHamburger',
  'emojiPizza',
  'emojiSushi',
  'emojiCurryRice',
  'emojiHotBeverage',
];

/** Tag-chip marquee drifting across the top of the dark CTA, edges faded. */
function AdTicker() {
  const theme = useTheme();
  const { t } = useTranslate();

  const renderTags = (duplicate) =>
    TICKER_TAGS.map((tag) => (
      <Box
        key={`${tag.key}${duplicate ? '-dup' : ''}`}
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1,
          p: '9px 17px',
          borderRadius: RADIUS.pill,
          bgcolor: alpha(theme.palette.marketing.onDark, 0.07),
          border: `1px solid ${alpha(theme.palette.marketing.outlineMuted, 0.7)}`,
          color: alpha(theme.palette.marketing.onDark, 0.85),
          fontSize: 13,
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}
      >
        <Iconify icon={ic[tag.icon]} width={17} />
        {t(`pages.home.advertisement.ticker.${tag.key}`)}
      </Box>
    ));

  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        py: '22px',
        overflow: 'hidden',
        zIndex: 1,
        maskImage: 'linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent)',
        WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent)',
      }}
    >
      <Stack
        direction="row"
        spacing={1.25}
        sx={{
          width: 'max-content',
          animation: `${tickScroll} 36s linear infinite`,
          ...REDUCED_MOTION_NONE,
        }}
      >
        {renderTags(false)}
        {renderTags(true)}
      </Stack>
    </Box>
  );
}

// ----------------------------------------------------------------------

export default function HomeAdvertisement() {
  const theme = useTheme();
  const { t } = useTranslate();
  const { user } = useAuthContext();
  const analytics = useAnalytics();

  const headlineLinesRaw = t('pages.home.advertisement.headlineLines', { returnObjects: true });
  const headlineLines = Array.isArray(headlineLinesRaw)
    ? headlineLinesRaw
    : ['Ready to join', 'the', 'NomNom', 'Circle?'];

  const getStartedHref = user
    ? paths.dashboard.discover
    : `${paths.auth.supabase.register}?returnTo=${encodeURIComponent(paths.dashboard.discover)}`;

  const onCtaClick = () => {
    if (user) {
      analytics.trackEvent('homepage_start_plan_generation', {
        action_type: 'get_started',
        button_label: t('pages.home.advertisement.ctaLabel'),
        destination: paths.dashboard.discover,
        section: 'advertisement',
        page_location: typeof window !== 'undefined' ? window.location.href : '',
        page_title: typeof window !== 'undefined' ? document.title : '',
        is_authenticated: true,
        is_subscriber: false,
        user_id: user?.id || null,
      });
    } else {
      analytics.trackEvent('homepage_signup_cta', {
        action_type: 'signup',
        button_label: t('pages.home.advertisement.ctaLabel'),
        destination: paths.auth.supabase.register,
        section: 'advertisement',
        page_location: typeof window !== 'undefined' ? window.location.href : '',
        page_title: typeof window !== 'undefined' ? document.title : '',
        is_authenticated: false,
      });
    }
  };

  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        pt: { xs: 9, md: 13 },
        bgcolor: theme.palette.marketing.surfaceDarker,
        borderTop: `1px solid ${alpha(theme.palette.marketing.onDark, 0.08)}`,
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(600px circle at 50% 120%, ${alpha(theme.palette.primary.main, 0.22)}, transparent 60%)`,
          animation: `${adGlow} 8s ease-in-out infinite`,
          ...REDUCED_MOTION_NONE,
        },
      }}
    >
      <AdTicker />
      <Container
        component={MotionViewport}
        maxWidth="lg"
        sx={{
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
          py: { xs: 5, sm: 7, md: 12 },
          px: { xs: 2, md: 3 },
        }}
      >
        <MotionPart variants={varFade().inUp}>
          <Stack
            direction="row"
            justifyContent="center"
            spacing="22px"
            aria-hidden
            sx={{ mb: { xs: 3, md: 5 } }}
          >
            {EMOJI_ROW.map((icon, index) => (
              <Iconify
                key={icon}
                icon={ic[icon]}
                width={30}
                sx={{
                  animation: `${bob} 5s ease-in-out infinite`,
                  animationDelay: `${index * 0.4}s`,
                  ...REDUCED_MOTION_NONE,
                }}
              />
            ))}
          </Stack>
        </MotionPart>

        <MotionPart variants={varFade().inUp}>
          <Typography
            component="h2"
            sx={(th) => ({
              color: th.palette.marketing.onDark,
              fontFamily: th.typography.fontSecondaryFamily,
              fontWeight: 700,
              fontStyle: 'normal',
              textTransform: 'none',
              letterSpacing: '-0.02em',
              lineHeight: { xs: 1.08, sm: 1.05 },
              fontSize: {
                xs: 'clamp(1.65rem, 6vw, 2.35rem)',
                sm: '2.75rem',
                md: '3.5rem',
                lg: '3.5rem',
              },
              mb: { xs: 3, sm: 4, md: 5 },
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
              px: { xs: 0.5, sm: 0 },
            })}
          >
            {headlineLines.map((line, index) => (
              <Box
                key={`${line}-${index}`}
                component="span"
                sx={{
                  display: 'block',
                  ...(index === headlineLines.length - 1 && { color: 'primary.main' }),
                }}
              >
                {line}
              </Box>
            ))}
          </Typography>
        </MotionPart>

        <MotionPart variants={varFade().inUp}>
          <Button
            component={Link}
            href={getStartedHref}
            variant="contained"
            color="primary"
            size="large"
            onClick={onCtaClick}
            sx={{
              width: { xs: '100%', sm: 'auto' },
              maxWidth: { xs: 400, sm: 'none' },
              mx: { xs: 'auto', sm: 0 },
              px: { xs: 3, sm: 4 },
              py: 1.75,
              minHeight: { xs: 48, sm: 50 },
              borderRadius: 2,
              fontSize: { xs: '0.9375rem', sm: '1rem' },
              fontWeight: 600,
              textTransform: 'none',
              letterSpacing: '0.02em',
              bgcolor: 'primary.main',
              boxShadow: (th) =>
                `${th.palette.primary.dark} 0px 0px 0px 0px, ${alpha(th.palette.common.white, 0.12)} 0px 0px 0px 1px`,
              '&:hover': {
                bgcolor: 'primary.dark',
                boxShadow: (th) =>
                  `${th.palette.primary.darker} 0px 0px 0px 0px, ${alpha(th.palette.common.white, 0.18)} 0px 0px 0px 1px`,
              },
              transition: (th) =>
                th.transitions.create(['transform', 'box-shadow', 'background-color'], {
                  duration: 200,
                }),
            }}
          >
            {t('pages.home.advertisement.ctaLabel')}
          </Button>
          <Typography
            variant="caption"
            component="p"
            sx={{
              mt: 2.5,
              maxWidth: 360,
              mx: 'auto',
              color: (th) => alpha(th.palette.marketing.onDark, 0.72),
              fontWeight: 500,
              letterSpacing: '0.03em',
              lineHeight: 1.5,
            }}
          >
            {t('pages.auth.register.trust_line')}
          </Typography>
        </MotionPart>
      </Container>
    </Box>
  );
}
