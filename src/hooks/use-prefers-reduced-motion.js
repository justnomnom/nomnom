'use client';

import useMediaQuery from '@mui/material/useMediaQuery';

/**
 * `prefers-reduced-motion: reduce` — use to shorten/disable non-essential motion (sheet height, smooth scroll).
 * Defaults to `false` on the server and until the media query runs (`noSsr`).
 */
export function usePrefersReducedMotion() {
  return useMediaQuery('(prefers-reduced-motion: reduce)', { defaultMatches: false, noSsr: true });
}
