'use client';

import PropTypes from 'prop-types';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';

import { useSkeletonThemeColors } from 'src/theme/use-skeleton-theme';

import { SETTINGS_PAGE_GUTTER_PX } from 'src/sections/profile/view/settings-shell-shared';

// ----------------------------------------------------------------------

export function PostItemSkeleton({ sx, ...other }) {
  const skeletonTheme = useSkeletonThemeColors();

  return (
    <SkeletonTheme
      baseColor={skeletonTheme.baseColor}
      highlightColor={skeletonTheme.highlightColor}
    >
      <Stack
        component={Paper}
        variant="outlined"
        sx={{
          borderRadius: 2,
          ...sx,
        }}
        {...other}
      >
        <Box sx={{ p: 1 }}>
          <Skeleton height={220} style={{ width: '100%', display: 'block', borderRadius: 8 }} />
        </Box>

        <Stack spacing={2} direction="row" alignItems="center" sx={{ p: 3, pt: 2 }}>
          <Skeleton circle width={40} height={40} style={{ flexShrink: 0 }} />
          <Stack flexGrow={1} spacing={1} sx={{ minWidth: 0 }}>
            <Skeleton height={10} width="100%" borderRadius={4} />
            <Skeleton height={10} width="50%" borderRadius={4} />
          </Stack>
        </Stack>
      </Stack>
    </SkeletonTheme>
  );
}

PostItemSkeleton.propTypes = {
  sx: PropTypes.object,
};

// ----------------------------------------------------------------------

export function PostDetailsSkeleton({ ...other }) {
  const skeletonTheme = useSkeletonThemeColors();

  return (
    <SkeletonTheme
      baseColor={skeletonTheme.baseColor}
      highlightColor={skeletonTheme.highlightColor}
    >
      <Stack {...other}>
        <Box sx={{ width: 1, height: { xs: 300, md: 360 } }}>
          <Skeleton height="100%" style={{ width: '100%', display: 'block' }} />
        </Box>

        <Container maxWidth={false} disableGutters>
          <Stack sx={{ maxWidth: 720, mx: 'auto', px: SETTINGS_PAGE_GUTTER_PX }}>
            <Stack spacing={2} sx={{ my: 4 }}>
              <Skeleton height={32} width="80%" borderRadius={4} />
              <Skeleton height={24} width="60%" borderRadius={4} />
              <Skeleton height={20} width="40%" borderRadius={4} />
            </Stack>

            <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
              <Skeleton height={20} width={60} borderRadius={4} />
              <Skeleton height={20} width={20} borderRadius={4} />
              <Skeleton height={20} width={80} borderRadius={4} />
              <Skeleton height={20} width={20} borderRadius={4} />
              <Skeleton height={20} width={120} borderRadius={4} />
            </Stack>

            <Stack spacing={1} sx={{ mb: 4 }}>
              <Skeleton height={20} width="100%" borderRadius={4} />
              <Skeleton height={20} width="90%" borderRadius={4} />
              <Skeleton height={20} width="70%" borderRadius={4} />
            </Stack>

            <Stack spacing={2} sx={{ mb: 4 }}>
              {[100, 95, 100, 85, 100, 90, 100, 75, 100, 80].map((w, i) => (
                <Skeleton key={i} height={20} width={`${w}%`} borderRadius={4} />
              ))}
            </Stack>

            <Stack direction="row" spacing={1} sx={{ mb: 4 }}>
              <Skeleton height={32} width={80} borderRadius={16} />
              <Skeleton height={32} width={100} borderRadius={16} />
              <Skeleton height={32} width={70} borderRadius={16} />
            </Stack>
          </Stack>
        </Container>
      </Stack>
    </SkeletonTheme>
  );
}
