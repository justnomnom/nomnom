'use client';

import PropTypes from 'prop-types';
import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import { usePrefersReducedMotion } from 'src/hooks/use-prefers-reduced-motion';

import { RADIUS } from 'src/theme/spacing';
import { useTranslate } from 'src/locales/use-locales';

// ----------------------------------------------------------------------

const MESSAGE_KEYS = [
  'components.loading_screen.message_1',
  'components.loading_screen.message_2',
  'components.loading_screen.message_3',
  'components.loading_screen.message_4',
  'components.loading_screen.message_5',
];

export default function LoadingScreen({ sx, ...other }) {
  const { t } = useTranslate();
  const prefersReducedMotion = usePrefersReducedMotion();
  const startIndex = useMemo(() => Math.floor(Math.random() * MESSAGE_KEYS.length), []);
  const [index, setIndex] = useState(startIndex);

  useEffect(() => {
    if (prefersReducedMotion) return undefined;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % MESSAGE_KEYS.length);
    }, 2200);
    return () => window.clearInterval(id);
  }, [prefersReducedMotion]);

  return (
    <Box
      role="status"
      aria-live="polite"
      aria-label={t('components.loading_screen.aria_label')}
      sx={{
        px: 5,
        gap: 2,
        width: 1,
        flexGrow: 1,
        minHeight: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        ...sx,
      }}
      {...other}
    >
      <LinearProgress
        color="primary"
        sx={{
          width: 1,
          maxWidth: 360,
          height: 4,
          borderRadius: RADIUS.pill,
          bgcolor: (theme) =>
            theme.palette.mode === 'light'
              ? (theme.palette.marketing?.parchmentDeep ?? theme.palette.action.hover)
              : theme.palette.action.hover,
        }}
      />
      <Box sx={{ position: 'relative', minHeight: 20, width: 1, maxWidth: 360 }}>
        {MESSAGE_KEYS.map((key, i) => (
          <Typography
            key={key}
            variant="caption"
            aria-hidden={i !== index}
            sx={{
              position: 'absolute',
              inset: 0,
              textAlign: 'center',
              color: 'text.secondary',
              opacity: i === index ? 1 : 0,
              transform: i === index ? 'translateY(0)' : 'translateY(4px)',
              transition: prefersReducedMotion
                ? 'opacity 120ms linear'
                : 'opacity 360ms cubic-bezier(0.16, 1, 0.3, 1), transform 360ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {t(key)}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}

LoadingScreen.propTypes = {
  sx: PropTypes.object,
};
