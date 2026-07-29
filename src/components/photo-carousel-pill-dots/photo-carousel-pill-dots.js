'use client';

import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';

import { RADIUS } from 'src/theme/spacing';

/**
 * Pill-backed dot row matching the restaurant detail hero (and compact variant for small thumbs).
 */
export default function PhotoCarouselPillDots({ total, activeIndex = 0, variant = 'hero', sx }) {
  const theme = useTheme();
  if (total <= 1) return null;

  const dotPx = variant === 'compact' ? 4 : 6;
  const bottom = variant === 'compact' ? 4 : 'max(20px, env(safe-area-inset-bottom, 0px))';
  const px = variant === 'compact' ? 1 : 1.5;
  const py = variant === 'compact' ? 0.5 : 0.75;

  return (
    <Stack
      direction="row"
      spacing={variant === 'compact' ? 0.5 : 0.75}
      sx={{
        position: 'absolute',
        bottom,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 2,
        maxWidth: variant === 'compact' ? 'calc(100% - 8px)' : 'calc(100% - 32px)',
        px,
        py,
        borderRadius: RADIUS.pill,
        bgcolor: alpha(theme.palette.common.black, 0.34),
        border: (th) => `1px solid ${alpha(th.palette.common.white, 0.1)}`,
        pointerEvents: 'none',
        ...sx,
      }}
    >
      {Array.from({ length: total }, (_, i) => (
        <Box
          key={String(i)}
          sx={{
            width: dotPx,
            height: dotPx,
            borderRadius: '50%',
            bgcolor:
              i === activeIndex ? 'common.white' : (th) => alpha(th.palette.common.white, 0.4),
          }}
        />
      ))}
    </Stack>
  );
}

PhotoCarouselPillDots.propTypes = {
  total: PropTypes.number.isRequired,
  activeIndex: PropTypes.number,
  variant: PropTypes.oneOf(['hero', 'compact']),
  sx: PropTypes.object,
};
