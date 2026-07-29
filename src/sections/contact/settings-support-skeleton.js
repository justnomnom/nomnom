'use client';

import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';

import { useSkeletonThemeColors } from 'src/theme/use-skeleton-theme';

import { hubCardShellSx } from 'src/sections/profile/view/settings-shell-shared';

// ----------------------------------------------------------------------

/** Matches `ContactView` (settings variant): subtitle + topic chips + fields. */
export default function SettingsSupportSkeleton() {
  const theme = useTheme();

  const skeletonTheme = useSkeletonThemeColors();

  return (
    <SkeletonTheme
      baseColor={skeletonTheme.baseColor}
      highlightColor={skeletonTheme.highlightColor}
    >
      <Stack spacing={2} sx={{ width: 1, pt: { xs: 2, sm: 2.5 } }}>
        <Stack spacing={1}>
          <Skeleton height={14} width="92%" borderRadius={4} />
          <Skeleton height={14} width="76%" borderRadius={4} />
        </Stack>

        <Box sx={{ width: 1, maxWidth: { xs: '100%', md: 600 }, mx: 'auto' }}>
          <Stack spacing={2} sx={{ width: 1, alignItems: 'stretch' }}>
            <Skeleton height={14} width={160} borderRadius={4} />
            <Stack direction="row" spacing={1}>
              <Skeleton height={40} width={88} borderRadius={20} />
              <Skeleton height={40} width={104} borderRadius={20} />
              <Skeleton height={40} width={96} borderRadius={20} />
            </Stack>
            <Box sx={hubCardShellSx(theme)}>
              <Skeleton height={48} style={{ display: 'block', borderRadius: 8 }} />
            </Box>
            <Box sx={hubCardShellSx(theme)}>
              <Skeleton height={48} style={{ display: 'block', borderRadius: 8 }} />
            </Box>
            <Box sx={hubCardShellSx(theme)}>
              <Skeleton height={120} style={{ display: 'block', borderRadius: 8 }} />
            </Box>
            <Skeleton height={48} borderRadius={8} />
            <Skeleton height={12} width="85%" borderRadius={4} style={{ margin: '0 auto' }} />
          </Stack>
        </Box>
      </Stack>
    </SkeletonTheme>
  );
}
