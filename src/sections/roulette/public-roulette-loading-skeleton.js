'use client';

import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';

import { RADIUS } from 'src/theme/spacing';
import { useSkeletonThemeColors } from 'src/theme/use-skeleton-theme';

import { MARKETING_SPACE_HERO_TO_CONTENT } from 'src/sections/profile/view/settings-shell-shared';

// ----------------------------------------------------------------------

export default function PublicRouletteLoadingSkeleton() {
  const skeletonTheme = useSkeletonThemeColors();

  return (
    <SkeletonTheme
      baseColor={skeletonTheme.baseColor}
      highlightColor={skeletonTheme.highlightColor}
    >
      <Container
        maxWidth="sm"
        sx={{
          py: MARKETING_SPACE_HERO_TO_CONTENT,
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <Card variant="outlined" sx={{ width: 1, borderRadius: 2, px: 3, py: 4 }}>
          <Stack alignItems="center" spacing={3} aria-busy="true">
            <Skeleton width={96} height={96} borderRadius={RADIUS.tight} />
            <Box sx={{ width: 1, maxWidth: 360 }}>
              <Skeleton height={32} width="80%" borderRadius={6} />
              <Skeleton height={18} width="100%" borderRadius={4} style={{ marginTop: 8 }} />
              <Skeleton height={18} width="90%" borderRadius={4} style={{ marginTop: 8 }} />
            </Box>
            <Box sx={{ width: 1, maxWidth: 360 }}>
              <Skeleton height={48} width="100%" borderRadius={RADIUS.tight} />
            </Box>
          </Stack>
        </Card>
      </Container>
    </SkeletonTheme>
  );
}
