'use client';

import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha, keyframes } from '@mui/material/styles';

import { usePrefersReducedMotion } from 'src/hooks/use-prefers-reduced-motion';

import { RADIUS, Z_INDEX } from 'src/theme/spacing';
import { useTranslate } from 'src/locales/use-locales';

// ----------------------------------------------------------------------

// Breathing splash (design "01 · Breathing splash"): the round NomNom mark gently
// inhales/exhales over softly expanding terracotta rings, a slim progress bar shuttles
// underneath, and the food-themed loading copy crossfades through. Only `transform` and
// `opacity` animate (DESIGN.md §9); motion is suppressed under `prefers-reduced-motion`.

const MESSAGE_KEYS = [
  'components.loading_screen.message_1',
  'components.loading_screen.message_2',
  'components.loading_screen.message_3',
  'components.loading_screen.message_4',
  'components.loading_screen.message_5',
];

const PULSE_DELAYS = ['0s', '0.9s', '1.8s'];
// Crossfade window per line; the message cycle length is MESSAGE_KEYS.length * step.
const MESSAGE_STEP = 2.2; // seconds between messages
const MESSAGE_CYCLE = MESSAGE_KEYS.length * MESSAGE_STEP; // 11s

const breathe = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.07); }
`;

const pulse = keyframes`
  0% { transform: scale(0.55); opacity: 0.55; }
  70% { opacity: 0; }
  100% { transform: scale(1.9); opacity: 0; }
`;

const shuttle = keyframes`
  0% { transform: translateX(-110%); }
  100% { transform: translateX(360%); }
`;

const fadeThrough = keyframes`
  0% { opacity: 0; transform: translateY(7px); }
  4% { opacity: 1; transform: translateY(0); }
  16% { opacity: 1; transform: translateY(0); }
  20% { opacity: 0; transform: translateY(-7px); }
  100% { opacity: 0; transform: translateY(-7px); }
`;

export default function SplashScreen({ sx, ...other }) {
  const { t } = useTranslate();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Render nothing until mounted so the client-only motion never mismatches SSR.
  if (!mounted) {
    return null;
  }

  const reduce = prefersReducedMotion;

  return (
    <Box
      role="status"
      aria-live="polite"
      aria-label={t('components.loading_screen.aria_label')}
      sx={{
        right: 0,
        width: 1,
        bottom: 0,
        height: 1,
        zIndex: Z_INDEX.splashScreen,
        display: 'flex',
        position: 'absolute',
        alignItems: 'center',
        flexDirection: 'column',
        justifyContent: 'center',
        bgcolor: 'background.default',
        ...sx,
      }}
      {...other}
    >
      {/* Breathing mark + expanding rings */}
      <Box
        sx={{
          width: 150,
          height: 150,
          mb: '42px',
          display: 'flex',
          position: 'relative',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {!reduce &&
          PULSE_DELAYS.map((delay) => (
            <Box
              key={delay}
              aria-hidden
              sx={{
                width: 120,
                height: 120,
                opacity: 0.18,
                position: 'absolute',
                borderRadius: '50%',
                bgcolor: 'primary.main',
                animation: `${pulse} 2.6s ease-out infinite`,
                animationDelay: delay,
              }}
            />
          ))}

        <Box
          component="img"
          src="/logo/logo_circle.png"
          alt=""
          sx={{
            width: 104,
            height: 104,
            position: 'relative',
            filter: (theme) => `drop-shadow(0 8px 20px ${alpha(theme.palette.primary.dark, 0.28)})`,
            ...(!reduce && { animation: `${breathe} 2.6s ease-in-out infinite` }),
          }}
        />
      </Box>

      {/* Shuttling progress bar */}
      <Box
        aria-hidden
        sx={{
          width: 150,
          height: 5,
          mb: '20px',
          overflow: 'hidden',
          position: 'relative',
          borderRadius: RADIUS.pill,
          bgcolor: (theme) =>
            theme.palette.mode === 'light'
              ? (theme.palette.marketing?.parchmentDeep ?? theme.palette.action.hover)
              : theme.palette.action.hover,
        }}
      >
        <Box
          sx={{
            top: 0,
            left: 0,
            height: 1,
            width: '34%',
            position: 'absolute',
            borderRadius: RADIUS.pill,
            bgcolor: 'primary.main',
            ...(reduce
              ? { left: '33%', width: '34%' }
              : { animation: `${shuttle} 1.5s ease-in-out infinite` }),
          }}
        />
      </Box>

      {/* Rotating food-themed copy */}
      {reduce ? (
        <Typography
          aria-hidden
          sx={{
            height: 18,
            width: 220,
            fontSize: 14,
            fontWeight: 500,
            textAlign: 'center',
            color: 'text.secondary',
          }}
        >
          {t(MESSAGE_KEYS[0])}
        </Typography>
      ) : (
        <Box aria-hidden sx={{ height: 18, width: 220, position: 'relative' }}>
          {MESSAGE_KEYS.map((key, i) => (
            <Typography
              key={key}
              sx={{
                inset: 0,
                opacity: 0,
                fontSize: 14,
                fontWeight: 500,
                position: 'absolute',
                textAlign: 'center',
                color: 'text.secondary',
                animation: `${fadeThrough} ${MESSAGE_CYCLE}s linear infinite backwards`,
                animationDelay: `${i * MESSAGE_STEP}s`,
              }}
            >
              {t(key)}
            </Typography>
          ))}
        </Box>
      )}
    </Box>
  );
}

SplashScreen.propTypes = {
  sx: PropTypes.object,
};
