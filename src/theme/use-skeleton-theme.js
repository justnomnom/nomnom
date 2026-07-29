'use client';

import { useMemo } from 'react';

import { alpha, useTheme } from '@mui/material/styles';

/**
 * Memoized base/highlight colors for `react-loading-skeleton`'s `SkeletonTheme`,
 * derived from the current MUI theme mode. Matches DESIGN.md §7 loading-state rules:
 *
 *   light: black @ 0.07 base, @ 0.12 highlight
 *   dark:  white @ 0.09 base, @ 0.18 highlight
 *
 * Usage:
 *   const skeletonTheme = useSkeletonThemeColors();
 *   <SkeletonTheme baseColor={skeletonTheme.baseColor} highlightColor={skeletonTheme.highlightColor}>
 */
export function useSkeletonThemeColors() {
  const theme = useTheme();
  return useMemo(() => {
    const isDark = theme.palette.mode === 'dark';
    return {
      baseColor: isDark
        ? alpha(theme.palette.common.white, 0.09)
        : alpha(theme.palette.common.black, 0.07),
      highlightColor: isDark
        ? alpha(theme.palette.common.white, 0.18)
        : alpha(theme.palette.common.black, 0.12),
    };
  }, [theme]);
}
