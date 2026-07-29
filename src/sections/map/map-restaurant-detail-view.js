'use client';

import dynamic from 'next/dynamic';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';

import { RADIUS } from 'src/theme/spacing';
import { useSkeletonThemeColors } from 'src/theme/use-skeleton-theme';

/**
 * Loading shell while `RestaurantDetailView` chunk loads (map sheet / list map).
 */
export function RestaurantDetailViewMapSheetLoading() {
  const skeletonTheme = useSkeletonThemeColors();

  return (
    <Box role="status" aria-live="polite" aria-busy="true" sx={{ width: 1, overflow: 'hidden' }}>
      <SkeletonTheme
        baseColor={skeletonTheme.baseColor}
        highlightColor={skeletonTheme.highlightColor}
        borderRadius={8}
        duration={1.2}
      >
        <Skeleton
          height={200}
          style={{
            borderRadius: '0 0 16px 16px',
            display: 'block',
            width: '100%',
          }}
        />
        <Stack spacing={1.25} sx={{ px: 2, pt: 2.5, pb: 2 }}>
          <Skeleton height={26} width="78%" style={{ borderRadius: 8 }} />
          <Skeleton height={16} width="44%" style={{ borderRadius: 6 }} />
          <Stack direction="row" spacing={1} sx={{ pt: 0.25 }}>
            <Skeleton height={28} width={72} style={{ borderRadius: RADIUS.pill }} />
            <Skeleton height={28} width={96} style={{ borderRadius: RADIUS.pill }} />
            <Skeleton height={28} width={64} style={{ borderRadius: RADIUS.pill }} />
          </Stack>
          <Skeleton height={44} width="100%" style={{ borderRadius: 12 }} />
          <Skeleton height={14} style={{ borderRadius: 6 }} />
          <Skeleton height={14} width="92%" style={{ borderRadius: 6 }} />
          <Skeleton height={14} width="88%" style={{ borderRadius: 6 }} />
        </Stack>
      </SkeletonTheme>
    </Box>
  );
}

export const RestaurantDetailViewMapSheet = dynamic(
  () =>
    import('src/sections/restaurant/view').then((m) => ({
      default: m.RestaurantDetailView,
    })),
  {
    ssr: false,
    loading: () => <RestaurantDetailViewMapSheetLoading />,
  }
);
