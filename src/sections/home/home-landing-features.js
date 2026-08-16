'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { alpha, useTheme, keyframes } from '@mui/material/styles';

import { ic } from 'src/assets/icons';
import { RADIUS } from 'src/theme/spacing';
import { useLocales, useTranslate } from 'src/locales';
import { getLocaleBodyMaxWidthCh } from 'src/theme/locale-prose';

import Iconify from 'src/components/iconify';
import { varFade, MotionPart, MotionViewport } from 'src/components/animate';

import {
  dashboardSubsectionStackProps,
  marketingPageSectionStackProps,
} from 'src/sections/profile/view/settings-shell-shared';

import { MapPin } from './home-motion';

// ----------------------------------------------------------------------

const FEATURE_ICONS = [
  {
    // Lead card: social feed from people you follow
    icon: ic.usersGroupRoundedBold,
    sx: {
      bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
      color: 'primary.dark',
    },
  },
  {
    // Card 2: curated lists from creators you follow
    icon: ic.bookmarkBold,
    sx: { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.14), color: 'primary.main' },
  },
  {
    // Card 3: map, save, share
    icon: ic.mapPointBold,
    sx: {
      bgcolor: (theme) => alpha(theme.palette.success.main, 0.12),
      color: 'success.dark',
    },
  },
];

// ----------------------------------------------------------------------

const FEATURE_AVATARS = [
  '/assets/home/hero-trusted-1.svg',
  '/assets/home/hero-trusted-2.svg',
  '/assets/home/hero-trusted-3.svg',
];

/** Lead card visual: avatar stack + DS vibe chips scattered at playful angles. */
function FeaturePeopleVisual() {
  const { t } = useTranslate();

  const vibeSx = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 0.5,
    px: '13px',
    minHeight: 36,
    borderRadius: RADIUS.pill,
    fontSize: '0.72rem',
    fontWeight: 800,
    whiteSpace: 'nowrap',
    border: '1px solid',
    transition: 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
  };

  return (
    <Box
      aria-hidden
      sx={{
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '9px',
        flexShrink: 0,
        pl: 2,
      }}
    >
      <Box sx={{ display: 'flex', mb: '2px' }}>
        {FEATURE_AVATARS.map((src, index) => (
          <Box
            key={src}
            component="img"
            src={src}
            alt=""
            sx={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: (th) => `3px solid ${th.palette.marketing.paper}`,
              boxShadow: (th) => `0 1px 3px ${alpha(th.palette.marketing.shadowWarm, 0.16)}`,
              ml: index === 0 ? 0 : '-10px',
            }}
          />
        ))}
      </Box>
      <Box
        className="fv-vibe-date"
        sx={{
          ...vibeSx,
          bgcolor: (th) => alpha(th.palette.error.main, 0.08),
          borderColor: (th) => alpha(th.palette.error.main, 0.22),
          color: 'error.main',
          transform: 'rotate(-2.5deg)',
        }}
      >
        <Iconify icon={ic.heartBold} width={15} />
        {t('pages.home.landing.features.visuals.vibeDate')}
      </Box>
      <Box
        className="fv-vibe-friends"
        sx={{
          ...vibeSx,
          bgcolor: (th) => alpha(th.palette.info.main, 0.1),
          borderColor: (th) => alpha(th.palette.info.main, 0.22),
          color: 'info.main',
          transform: 'rotate(1.8deg) translateX(10px)',
        }}
      >
        <Iconify icon={ic.usersGroupTwoRoundedBold} width={15} />
        {t('pages.home.landing.features.visuals.vibeFriends')}
      </Box>
      <Box
        className="fv-vibe-cheap"
        sx={{
          ...vibeSx,
          bgcolor: (th) => alpha(th.palette.success.main, 0.1),
          borderColor: (th) => alpha(th.palette.success.main, 0.22),
          color: 'success.dark',
          transform: 'rotate(-1.5deg) translateX(2px)',
        }}
      >
        <Iconify icon={ic.walletBold} width={15} />
        {t('pages.home.landing.features.visuals.vibeCheap')}
      </Box>
    </Box>
  );
}

/** Card 2 visual: two tilted mini list cards that splay apart on hover. */
function FeatureListsVisual() {
  const { t } = useTranslate();

  const lists = [
    {
      className: 'fv-list-1',
      icon: ic.bookmarkBold,
      title: t('pages.home.landing.features.visuals.list1Title'),
      meta: t('pages.home.landing.features.visuals.list1Meta'),
      action: t('pages.home.landing.features.visuals.following'),
      active: true,
      tilt: 'rotate(-1deg)',
    },
    {
      className: 'fv-list-2',
      icon: ic.bookmarkLinear,
      title: t('pages.home.landing.features.visuals.list2Title'),
      meta: t('pages.home.landing.features.visuals.list2Meta'),
      action: t('pages.home.landing.features.visuals.follow'),
      active: false,
      tilt: 'rotate(0.8deg)',
    },
  ];

  return (
    <Stack aria-hidden spacing="9px" sx={{ mt: 2.75, position: 'relative', zIndex: 1 }}>
      {lists.map((list) => (
        <Stack
          key={list.className}
          className={list.className}
          direction="row"
          alignItems="center"
          spacing="11px"
          sx={{
            p: '12px 14px',
            borderRadius: 2,
            bgcolor: 'background.paper',
            boxShadow: (th) =>
              `0 0 0 1px ${alpha(th.palette.marketing.hairline, 0.6)}, 0 1px 3px ${alpha(th.palette.marketing.shadowWarm, 0.12)}`,
            transform: list.tilt,
            transition: 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
        >
          <Iconify icon={list.icon} width={18} sx={{ color: 'primary.main', flexShrink: 0 }} />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Box
              component="b"
              sx={{ display: 'block', fontSize: 13, fontWeight: 800, lineHeight: 1.3 }}
            >
              {list.title}
            </Box>
            <Box
              component="span"
              sx={{
                display: 'block',
                fontSize: 11.5,
                fontWeight: 600,
                color: 'text.secondary',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {list.meta}
            </Box>
          </Box>
          <Box
            component="span"
            sx={{
              flexShrink: 0,
              fontSize: 11,
              fontWeight: 800,
              px: 1.5,
              py: 0.75,
              borderRadius: RADIUS.pill,
              ...(list.active
                ? {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    boxShadow: (th) => `0 4px 14px -4px ${alpha(th.palette.primary.main, 0.45)}`,
                  }
                : {
                    bgcolor: (th) => alpha(th.palette.primary.main, 0.12),
                    color: 'primary.main',
                  }),
            }}
          >
            {list.action}
          </Box>
        </Stack>
      ))}
    </Stack>
  );
}

const pinHop = keyframes`
  0%, 100% { transform: translateY(0); }
  45% { transform: translateY(-8px); }
`;

/** Card 3 visual: tiny live map — gradient terrain, roads, grid, terracotta pins.
 *  Terrain greens are one-off illustration fills (no semantic token); pins and
 *  road strokes use theme palette tokens. */
function FeatureMapVisual() {
  const theme = useTheme();

  return (
    <Box
      aria-hidden
      sx={{
        mt: 2.75,
        position: 'relative',
        height: 120,
        borderRadius: 2,
        overflow: 'hidden',
        background: (th) =>
          `linear-gradient(160deg, ${alpha(th.palette.background.neutral, 0.95)} 0%, ${alpha(th.palette.success.light, 0.28)} 45%, ${th.palette.marketing.parchmentDeep} 100%)`,
        boxShadow: (th) => `inset 0 0 0 1px ${alpha(th.palette.marketing.outlineMuted, 0.14)}`,
        zIndex: 1,
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(150,160,140,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(150,160,140,0.15) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        },
      }}
    >
      <Box
        component="svg"
        viewBox="0 0 260 120"
        preserveAspectRatio="none"
        sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <path
          d="M0,62 Q130,42 260,66"
          stroke={theme.palette.common.white}
          strokeWidth="9"
          fill="none"
          opacity="0.8"
        />
        <path
          d="M92,0 Q104,60 96,120"
          stroke={theme.palette.common.white}
          strokeWidth="7"
          fill="none"
          opacity="0.7"
        />
        <path
          d="M186,0 Q176,64 192,120"
          stroke={theme.palette.common.white}
          strokeWidth="5"
          fill="none"
          opacity="0.6"
        />
        <rect
          x="24"
          y="14"
          width="38"
          height="28"
          rx="5"
          fill={alpha(theme.palette.success.light, 0.55)}
          opacity="0.7"
        />
        <rect
          x="206"
          y="76"
          width="36"
          height="26"
          rx="5"
          fill={alpha(theme.palette.marketing.parchmentDeep, 0.85)}
          opacity="0.6"
        />
      </Box>
      <MapPin
        width={26}
        height={32}
        fill={theme.palette.primary.main}
        stroke={theme.palette.primary.dark}
        dotFill={alpha(theme.palette.common.white, 0.9)}
        sx={{ top: '58%', left: '32%' }}
      />
      <MapPin
        width={22}
        height={27}
        fill={theme.palette.common.white}
        stroke={theme.palette.grey[400]}
        dotFill={theme.palette.primary.main}
        sx={{ top: '44%', left: '62%', '& svg': { animationDelay: '0.08s' } }}
      />
      <MapPin
        width={22}
        height={27}
        fill={theme.palette.primary.main}
        stroke={theme.palette.primary.dark}
        dotFill={alpha(theme.palette.common.white, 0.35)}
        sx={{ top: '82%', left: '80%', '& svg': { animationDelay: '0.16s' } }}
      />
    </Box>
  );
}

// ----------------------------------------------------------------------

export default function HomeLandingFeatures() {
  const theme = useTheme();
  const { t } = useTranslate();
  const { currentLang } = useLocales();
  const featureBodyMaxWidth = getLocaleBodyMaxWidthCh(currentLang?.value);

  const features = [
    {
      titleKey: 'pages.home.landing.features.vibe.title',
      bodyKey: 'pages.home.landing.features.vibe.body',
      ...FEATURE_ICONS[0],
    },
    {
      titleKey: 'pages.home.landing.features.roulette.title',
      bodyKey: 'pages.home.landing.features.roulette.body',
      visual: <FeatureListsVisual />,
      ...FEATURE_ICONS[1],
    },
    {
      titleKey: 'pages.home.landing.features.creator.title',
      bodyKey: 'pages.home.landing.features.creator.body',
      visual: <FeatureMapVisual />,
      ...FEATURE_ICONS[2],
    },
  ];

  const featureCardSx = {
    height: '100%',
    p: { xs: 3, sm: 4, md: 5 },
    borderRadius: 3,
    border: '1px solid',
    borderColor: alpha(
      theme.palette.marketing.dividerWarm,
      theme.palette.mode === 'dark' ? 0.35 : 1
    ),
    bgcolor: (th) =>
      th.palette.mode === 'light'
        ? alpha(th.palette.marketing.paper, 1)
        : th.palette.background.paper,
    boxShadow: (th) =>
      `${alpha(th.palette.marketing.hairline, th.palette.mode === 'light' ? 0.45 : 0.2)} 0px 0px 0px 1px`,
    transition: (th) =>
      th.transitions.create(['border-color', 'transform', 'box-shadow'], {
        duration: th.transitions.duration.shorter,
      }),
    '&:hover': {
      borderColor: alpha(theme.palette.primary.main, 0.55),
      boxShadow: (th) => `${alpha(th.palette.primary.main, 0.2)} 0px 0px 0px 1px`,
      '& .feature-icon-wrap': { transform: 'scale(1.06)' },
      '& .fv-vibe-date': { transform: 'rotate(-5deg) translateY(-3px)' },
      '& .fv-vibe-friends': { transform: 'rotate(3.5deg) translateX(13px) translateY(-2px)' },
      '& .fv-vibe-cheap': { transform: 'rotate(-3deg) translateX(4px) translateY(-3px)' },
      '& .fv-list-1': { transform: 'rotate(-2deg) translateX(-4px)' },
      '& .fv-list-2': { transform: 'rotate(1.8deg) translateX(4px)' },
      '& .fv-map-pin svg': {
        // Longhands (not the `animation` shorthand) so each pin's own
        // animationDelay survives the cascade and staggers the hop.
        animationName: `${pinHop}`,
        animationDuration: '0.55s',
        animationTimingFunction: 'cubic-bezier(0.3, 0.8, 0.3, 1.2)',
      },
    },
    '@media (prefers-reduced-motion: reduce)': {
      '&:hover .fv-vibe-date, &:hover .fv-vibe-friends, &:hover .fv-vibe-cheap, &:hover .fv-list-1, &:hover .fv-list-2':
        { transform: 'none' },
      '&:hover .fv-map-pin svg': { animation: 'none' },
    },
  };

  const [leadFeature, ...supportingFeatures] = features;

  return (
    <Box
      component="section"
      sx={{
        py: { xs: 5, sm: 7, md: 12 },
        px: { xs: 0 },
        bgcolor: (th) =>
          th.palette.mode === 'light'
            ? alpha(th.palette.marketing.parchment, 1)
            : alpha(th.palette.grey[500], 0.1),
      }}
    >
      <Container component={MotionViewport} maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
        <Stack
          {...dashboardSubsectionStackProps}
          sx={{
            textAlign: { xs: 'center', md: 'left' },
            mb: { xs: 4, sm: 5, md: 7 },
            maxWidth: { md: 'min(100%, 52rem)' },
            mx: { xs: undefined, md: 0 },
          }}
        >
          <MotionPart variants={varFade().inUp}>
            <Typography
              variant="h2"
              sx={(th) => ({
                fontFamily: th.typography.fontSecondaryFamily,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                textTransform: 'none',
                fontStyle: 'normal',
                fontSize: { xs: '1.625rem', sm: '2rem', md: '2.25rem' },
                lineHeight: { xs: 1.2, md: 1.22 },
                overflowWrap: 'anywhere',
                color: 'text.primary',
              })}
            >
              {t('pages.home.landing.features.sectionTitle')}
            </Typography>
          </MotionPart>
          <MotionPart variants={varFade().inDown}>
            <Typography
              variant="body1"
              sx={{
                color: 'text.secondary',
                maxWidth: 640,
                mx: { xs: 'auto', md: 0 },
                fontWeight: 500,
                fontSize: { xs: '0.9375rem', sm: undefined },
                lineHeight: 1.6,
              }}
            >
              {t('pages.home.landing.features.sectionSubtitle')}
            </Typography>
          </MotionPart>
        </Stack>

        <Stack {...marketingPageSectionStackProps}>
          <Grid container>
            <Grid key={leadFeature.titleKey} size={{ xs: 12 }}>
              <MotionPart variants={varFade().inUp}>
                <Card
                  sx={{
                    ...featureCardSx,
                    display: { xs: 'block', md: 'flex' },
                    flexDirection: { md: 'row' },
                    alignItems: { md: 'flex-start' },
                    gap: { md: 3 },
                  }}
                >
                  <Box
                    className="feature-icon-wrap"
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: { xs: 3, md: 0 },
                      flexShrink: 0,
                      transition: (th) => th.transitions.create('transform'),
                      ...leadFeature.sx,
                    }}
                  >
                    <Iconify icon={leadFeature.icon} width={36} />
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      variant="h5"
                      component="h3"
                      sx={(th) => ({
                        fontFamily: th.typography.fontSecondaryFamily,
                        fontWeight: 700,
                        mb: 2,
                        letterSpacing: '-0.01em',
                        fontSize: { xs: '1.125rem', sm: '1.25rem' },
                        lineHeight: 1.28,
                      })}
                    >
                      {t(leadFeature.titleKey)}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'text.secondary',
                        fontWeight: 400,
                        lineHeight: 1.65,
                        maxWidth: featureBodyMaxWidth,
                      }}
                    >
                      {t(leadFeature.bodyKey)}
                    </Typography>
                  </Box>
                  <FeaturePeopleVisual />
                </Card>
              </MotionPart>
            </Grid>
          </Grid>

          <Grid container spacing={{ xs: 2.5, sm: 3 }}>
            {supportingFeatures.map((item) => (
              <Grid key={item.titleKey} size={{ xs: 12, sm: 6 }}>
                <MotionPart variants={varFade().inUp}>
                  <Card
                    sx={{
                      ...featureCardSx,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        alignItems: { sm: 'flex-start' },
                        gap: { xs: 2, sm: 2.5 },
                        position: 'relative',
                        zIndex: 1,
                      }}
                    >
                      <Box
                        className="feature-icon-wrap"
                        sx={{
                          width: { xs: 56, sm: 52 },
                          height: { xs: 56, sm: 52 },
                          borderRadius: 1.5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          transition: (th) => th.transitions.create('transform'),
                          ...item.sx,
                        }}
                      >
                        <Iconify icon={item.icon} width={32} />
                      </Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
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
                          {t(item.titleKey)}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            color: 'text.secondary',
                            fontWeight: 400,
                            lineHeight: 1.65,
                            maxWidth: featureBodyMaxWidth,
                          }}
                        >
                          {t(item.bodyKey)}
                        </Typography>
                      </Box>
                    </Box>
                    {item.visual}
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
