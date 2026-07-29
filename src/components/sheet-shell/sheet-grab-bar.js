'use client';

import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';

import { RADIUS } from 'src/theme/spacing';

// ----------------------------------------------------------------------

const SIZES = {
  /** Mobile bottom sheets, map handle (mobile). */
  sm: { width: 40, height: 5 },
  /** Wider map panel / desktop handle rail. */
  md: { width: 48, height: 6 },
};

/**
 * iOS-style grab pill for bottom sheets and draggable panels.
 * Use everywhere a sheet opens from the bottom so the top chrome stays consistent.
 */
export default function SheetGrabBar({ size = 'sm', sx, ...other }) {
  const dim = SIZES[size] ?? SIZES.sm;

  return (
    <Box
      aria-hidden
      sx={{
        width: dim.width,
        height: dim.height,
        borderRadius: RADIUS.pill,
        flexShrink: 0,
        touchAction: 'none',
        bgcolor: (t) => alpha(t.palette.divider, t.palette.mode === 'dark' ? 0.55 : 0.4),
        ...sx,
      }}
      {...other}
    />
  );
}

SheetGrabBar.propTypes = {
  size: PropTypes.oneOf(['sm', 'md']),
  sx: PropTypes.object,
};
