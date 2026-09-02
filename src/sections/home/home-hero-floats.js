'use client';

import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import { alpha, styled, useTheme, keyframes } from '@mui/material/styles';

import { ic } from 'src/assets/icons';
import { RADIUS } from 'src/theme/spacing';
import { useTranslate } from 'src/locales';
import { readableAccent } from 'src/theme/readable-accent';

import Iconify from 'src/components/iconify';

import { bob, MapPinSvg, FLOAT_LAYER_CLASS, REDUCED_MOTION_NONE } from './home-motion';

// ----------------------------------------------------------------------

const chipIn = keyframes`
  from { opacity: 0; }
`;

const twinkle = keyframes`
  0%, 100% { opacity: 0; transform: scale(0.4) rotate(0deg); }
  50% { opacity: 0.9; transform: scale(1) rotate(40deg); }
`;

const SPARK_PATH = 'M12 0 L14.5 9.5 L24 12 L14.5 14.5 L12 24 L9.5 14.5 L0 12 L9.5 9.5 Z';

const FloatChip = styled('div')(({ theme }) => ({
  position: 'absolute',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 9,
  padding: '11px 18px 11px 13px',
  borderRadius: RADIUS.pill,
  background: theme.palette.background.paper,
  boxShadow: `0 12px 24px -4px ${alpha(theme.palette.marketing.shadowWarm, 0.16)}, 0 0 0 1px ${alpha(theme.palette.marketing.hairline, 0.6)}`,
  fontSize: 14,
  fontWeight: 700,
  color: theme.palette.text.primary,
  whiteSpace: 'nowrap',
  willChange: 'transform',
}));

// ----------------------------------------------------------------------

function Spark({ size, sx }) {
  return (
    <Box
      component="svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
      sx={{
        position: 'absolute',
        color: (theme) => readableAccent(theme),
        opacity: 0,
        animation: `${twinkle} 2.8s ease-in-out infinite`,
        display: { xs: 'none', lg: 'block' },
        ...REDUCED_MOTION_NONE,
        ...sx,
      }}
    >
      <path d={SPARK_PATH} fill="currentColor" />
    </Box>
  );
}

Spark.propTypes = {
  size: PropTypes.number,
  sx: PropTypes.object,
};

/**
 * Floating product chips around the hero headline (handoff design).
 * Desktop (≥lg) shows the full six-float ensemble + sparkles; smaller screens
 * keep only the single highest-signal float (the saved-list chip) tucked into the
 * top-left corner, clear of the centered hero logo.
 */
export default function HomeHeroFloats() {
  const { t } = useTranslate();
  const theme = useTheme();

  const floatAnimation = (bobDur, bobDelay, inDelay) => ({
    animation: `${bob} ${bobDur}s ease-in-out infinite ${bobDelay}s, ${chipIn} 0.5s ease-out ${inDelay}s backwards`,
    ...REDUCED_MOTION_NONE,
  });

  return (
    <Box
      className={FLOAT_LAYER_CLASS}
      aria-hidden
      sx={{
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'none',
        transition: 'transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1)',
        willChange: 'transform',
      }}
    >
      <FloatChip
        sx={{
          top: '14%',
          left: '4%',
          display: { xs: 'none', lg: 'inline-flex' },
          ...floatAnimation(6, 0, 0.8),
        }}
      >
        <Iconify icon={ic.emojiPizza} width={22} />
        <span>{t('pages.home.hero.floats.pizzeria')}</span>
      </FloatChip>

      <FloatChip
        sx={{
          p: '9px 14px',
          gap: 1.25,
          top: '30%',
          right: '3%',
          // Hidden on mobile: at 375px this chip is too wide to sit in the top-right
          // corner without overlapping the centered hero logo. Desktop only, like the
          // other decorative floats.
          display: { xs: 'none', lg: 'inline-flex' },
          ...floatAnimation(7, 0.6, 0.95),
        }}
      >
        <Box
          component="img"
          src="/assets/home/hero-trusted-2.svg"
          alt=""
          sx={{ width: 30, height: 30, borderRadius: '50%' }}
        />
        <span>Sofia</span>
        <Box
          component="span"
          sx={{
            fontSize: 11,
            fontWeight: 800,
            color: 'primary.contrastText',
            bgcolor: 'primary.main',
            px: '11px',
            py: '4px',
            borderRadius: RADIUS.pill,
          }}
        >
          {t('pages.home.hero.floats.following')}
        </Box>
      </FloatChip>

      <FloatChip
        sx={{
          borderRadius: 2,
          gap: 1.25,
          p: { xs: '9px 13px 9px 11px', lg: '11px 16px 11px 13px' },
          top: { xs: 8, lg: 'auto' },
          bottom: { xs: 'auto', lg: '26%' },
          left: { xs: 10, lg: '7%' },
          right: 'auto',
          ...floatAnimation(6.5, 1.1, 1.1),
        }}
      >
        <Iconify icon={ic.bookmarkBold} width={20} sx={{ color: readableAccent(theme) }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1px', textAlign: 'left' }}>
          <Box
            component="b"
            sx={{ fontSize: { xs: 12, lg: 13 }, fontWeight: 800, lineHeight: 1.3 }}
          >
            {t('pages.home.hero.floats.listTitle')}
          </Box>
          <Box
            component="span"
            sx={{
              fontSize: { xs: 10.5, lg: 11.5 },
              fontWeight: 600,
              color: 'text.secondary',
            }}
          >
            {t('pages.home.hero.floats.listMeta')}
          </Box>
        </Box>
      </FloatChip>

      <FloatChip
        sx={{
          bottom: '16%',
          right: '7%',
          display: { xs: 'none', lg: 'inline-flex' },
          ...floatAnimation(7.5, 0.3, 1.25),
        }}
      >
        <Iconify icon={ic.emojiSushi} width={22} />
        <span>{t('pages.home.hero.floats.sushi')}</span>
      </FloatChip>

      <FloatChip
        sx={{
          p: '9px 14px',
          top: '6%',
          right: '16%',
          display: { xs: 'none', lg: 'inline-flex' },
          ...floatAnimation(6.8, 0.9, 1.4),
        }}
      >
        <Iconify icon={ic.starBold} width={18} sx={{ color: 'warning.main' }} />
        <span>4.7</span>
        <Box component="span" sx={{ fontWeight: 500, color: 'text.secondary', fontSize: 12.5 }}>
          Tasca do Chico
        </Box>
      </FloatChip>

      <Box
        sx={{
          position: 'absolute',
          top: '42%',
          left: '12%',
          display: { xs: 'none', lg: 'block' },
          ...floatAnimation(5.6, 0.4, 1.5),
        }}
      >
        <MapPinSvg
          width={30}
          height={37}
          glow="primary"
          fill={theme.palette.primary.main}
          stroke={theme.palette.primary.dark}
          dotFill={alpha(theme.palette.common.white, 0.9)}
        />
      </Box>

      <Spark size={22} sx={{ top: '21%', left: '21%' }} />
      <Spark size={15} sx={{ top: '16%', left: '25%', animationDelay: '0.9s' }} />
      <Spark size={17} sx={{ top: '30%', right: '22%', animationDelay: '1.7s' }} />
    </Box>
  );
}
