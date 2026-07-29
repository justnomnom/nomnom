'use client';

import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';

import { useSkeletonThemeColors } from 'src/theme/use-skeleton-theme';

import MapSheetListPlaceRowsSkeleton from 'src/sections/map/map-sheet-list-place-rows-skeleton';

// ----------------------------------------------------------------------

/** Public `/lists/[id]` — cover, title block, `MapSpotSheetListRow`-shaped places (MainLayout). */
export default function PublicListPageSkeleton() {
  const skeletonTheme = useSkeletonThemeColors();

  return (
    <SkeletonTheme
      baseColor={skeletonTheme.baseColor}
      highlightColor={skeletonTheme.highlightColor}
    >
      <Container maxWidth="sm" sx={{ py: 4, pb: 8 }} aria-busy="true">
        <Stack spacing={2}>
          <Skeleton height={36} width="72%" borderRadius={4} />
          <Box sx={{ display: 'flex', justifyContent: 'center', width: 1 }}>
            <Skeleton height={18} width={140} borderRadius={4} />
          </Box>
          <Skeleton height={16} width="100%" borderRadius={4} />
          <Skeleton height={16} width="88%" borderRadius={4} />

          <MapSheetListPlaceRowsSkeleton count={5} sx={{ mx: -0.5, pt: 0.5 }} />
        </Stack>
      </Container>
    </SkeletonTheme>
  );
}
