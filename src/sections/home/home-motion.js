'use client';

import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import { alpha, keyframes } from '@mui/material/styles';

// ----------------------------------------------------------------------
// Shared motion primitives for the marketing homepage sections.
// Centralised so the `bob` float animation, the reduced-motion guard, and the
// map-pin SVG are defined once instead of copy-pasted across hero/showcase/
// features/advertisement (a divergent copy of the reduced-motion media query
// would silently break the accessibility fallback for that element).
// ----------------------------------------------------------------------

/** Gentle vertical float used by hero chips, the showcase pop, and CTA emoji. */
export const bob = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
`;

/** Spread into any `sx` that declares an `animation` to honour reduced-motion. */
export const REDUCED_MOTION_NONE = {
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
};

/** Class on the hero floating-chip layer — shared so the parallax effect in
 *  HomeHero can find it without a hard-coded string in two places. */
export const FLOAT_LAYER_CLASS = 'hero-float-layer';

// ----------------------------------------------------------------------

/** Teardrop map-pin SVG (warm or primary glow). Colours are passed in by the
 *  caller from `theme.palette.*` — no hard-coded hex here. */
export function MapPinSvg({ width, height, fill, stroke, dotFill, glow = 'soft', sx }) {
  return (
    <Box
      component="svg"
      width={width}
      height={height}
      viewBox="0 0 34 42"
      fill="none"
      sx={[
        (theme) => ({
          display: 'block',
          filter:
            glow === 'primary'
              ? `drop-shadow(0 6px 12px ${alpha(theme.palette.primary.dark, 0.4)})`
              : `drop-shadow(0 2px 4px ${alpha(theme.palette.marketing.shadowWarm, 0.25)})`,
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <path
        d="M17 0C7.6 0 0 7.6 0 17c0 12.7 17 25 17 25S34 29.7 34 17C34 7.6 26.4 0 17 0z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
      />
      <circle cx="17" cy="17" r="7" fill={dotFill} />
    </Box>
  );
}

MapPinSvg.propTypes = {
  width: PropTypes.number,
  height: PropTypes.number,
  fill: PropTypes.string,
  stroke: PropTypes.string,
  dotFill: PropTypes.string,
  glow: PropTypes.oneOf(['soft', 'primary']),
  sx: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.func]),
};

/** Absolutely-positioned map pin (anchored at its tip) for the feature map. */
export function MapPin({ width, height, fill, stroke, dotFill, sx }) {
  return (
    <Box
      component="span"
      className="fv-map-pin"
      sx={{ position: 'absolute', transform: 'translate(-50%, -100%)', ...sx }}
    >
      <MapPinSvg width={width} height={height} fill={fill} stroke={stroke} dotFill={dotFill} />
    </Box>
  );
}

MapPin.propTypes = {
  width: PropTypes.number,
  height: PropTypes.number,
  fill: PropTypes.string,
  stroke: PropTypes.string,
  dotFill: PropTypes.string,
  sx: PropTypes.object,
};
