'use client';

import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import { useTheme } from '@mui/material/styles';

import { useSkeletonThemeColors } from 'src/theme/use-skeleton-theme';

import { hubCardShellSx } from './view/settings-shell-shared';

// ----------------------------------------------------------------------

/** Placeholder while payout account status is loading. */
export function SettingsBillingStripeCardSkeleton() {
  const theme = useTheme();
  const skeletonTheme = useSkeletonThemeColors();

  return (
    <SkeletonTheme
      baseColor={skeletonTheme.baseColor}
      highlightColor={skeletonTheme.highlightColor}
    >
      <Box sx={hubCardShellSx(theme)}>
        <Stack spacing={2.5} sx={{ p: 2, py: 2.25 }}>
          <Skeleton height={22} width={220} borderRadius={4} />
          <Skeleton height={18} width="88%" borderRadius={4} />
          <Skeleton height={18} width="100%" borderRadius={4} />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 0.25 }}>
            <Skeleton height={32} width={132} borderRadius={6} />
          </Box>
        </Stack>
      </Box>
    </SkeletonTheme>
  );
}

/** Placeholder while owned lists + Connect (for paid lists) are loading. */
export function SettingsBillingPaidListsCardSkeleton() {
  const theme = useTheme();
  const skeletonTheme = useSkeletonThemeColors();

  return (
    <SkeletonTheme
      baseColor={skeletonTheme.baseColor}
      highlightColor={skeletonTheme.highlightColor}
    >
      <Box sx={hubCardShellSx(theme)}>
        <Stack spacing={2.5} sx={{ p: 2, py: 2.25 }}>
          <Skeleton height={22} width={220} borderRadius={4} />
          <Stack spacing={2}>
            <Stack spacing={0.75}>
              <Skeleton height={18} width="92%" borderRadius={4} />
              <Skeleton height={18} width="76%" borderRadius={4} />
            </Stack>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              alignItems={{ sm: 'flex-end' }}
            >
              <Box sx={{ flex: 1, minWidth: 0, maxWidth: { sm: 300 }, width: 1 }}>
                <Skeleton height={40} style={{ width: '100%', borderRadius: 8 }} />
              </Box>
              <Skeleton height={32} width={132} borderRadius={6} style={{ alignSelf: 'stretch' }} />
            </Stack>
            <Divider sx={{ opacity: 0.65 }} />
            <Stack spacing={1.5}>
              <Skeleton height={18} width={200} borderRadius={4} />
              <Stack direction="row" flexWrap="wrap" useFlexGap columnGap={1} rowGap={0.5}>
                <Skeleton height={18} width={72} borderRadius={4} />
                <Skeleton height={18} width={88} borderRadius={4} />
                <Skeleton height={18} width={64} borderRadius={4} />
              </Stack>
            </Stack>
            <Skeleton height={14} width="88%" borderRadius={4} />
          </Stack>
        </Stack>
      </Box>
    </SkeletonTheme>
  );
}
