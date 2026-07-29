'use client';

import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';

import { useSkeletonThemeColors } from 'src/theme/use-skeleton-theme';

import { ICON_TILE, hubCardShellSx, HUB_ROW_MIN_HEIGHT } from './view/settings-shell-shared';

// ----------------------------------------------------------------------

/** Matches `SettingsDeleteView`: description body + error-tinted destructive row. */
export default function SettingsDeleteAccountSkeleton() {
  const theme = useTheme();

  const skeletonTheme = useSkeletonThemeColors();

  return (
    <SkeletonTheme
      baseColor={skeletonTheme.baseColor}
      highlightColor={skeletonTheme.highlightColor}
    >
      <Stack spacing={4} sx={{ width: 1, pt: { xs: 2, sm: 2.5 } }}>
        <Stack spacing={1} sx={{ px: 0.5 }}>
          <Skeleton height={14} width="92%" borderRadius={4} />
          <Skeleton height={14} width="86%" borderRadius={4} />
          <Skeleton height={14} width="64%" borderRadius={4} />
        </Stack>

        <Box
          sx={{
            ...hubCardShellSx(theme),
            border: `1px solid ${alpha(theme.palette.error.main, 0.22)}`,
            bgcolor: alpha(theme.palette.error.main, 0.06),
          }}
        >
          <Box
            sx={{
              px: 2,
              py: 2.25,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              minHeight: HUB_ROW_MIN_HEIGHT,
            }}
          >
            <Skeleton width={ICON_TILE} height={ICON_TILE} borderRadius={8} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Skeleton height={16} width="46%" borderRadius={4} />
            </Box>
            <Skeleton width={20} height={20} borderRadius={4} />
          </Box>
        </Box>
      </Stack>
    </SkeletonTheme>
  );
}
