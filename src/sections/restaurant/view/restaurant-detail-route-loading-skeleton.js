'use client';

import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Container from '@mui/material/Container';

import { RADIUS } from 'src/theme/spacing';
import { useSkeletonThemeColors } from 'src/theme/use-skeleton-theme';

// ----------------------------------------------------------------------

const HERO_HEIGHT = { xs: 'clamp(228px, 42dvh, 420px)', sm: 320, md: 360 };
const SHEET_TOP_RADIUS = '24px';

export default function RestaurantDetailRouteLoadingSkeleton() {
  const skeletonTheme = useSkeletonThemeColors();

  return (
    <SkeletonTheme
      baseColor={skeletonTheme.baseColor}
      highlightColor={skeletonTheme.highlightColor}
    >
      <Container
        maxWidth="sm"
        disableGutters
        sx={{
          px: { xs: 2, sm: 3 },
          overflowX: 'hidden',
          maxWidth: '100%',
          pb: { xs: 2, sm: 3, lg: 2 },
        }}
        aria-busy="true"
      >
        <Box sx={{ mx: { xs: -2, sm: -3 } }}>
          <Box
            sx={{
              position: 'relative',
              width: 1,
              height: HERO_HEIGHT,
              borderRadius: { xs: 0, sm: '0 0 16px 16px' },
              overflow: 'hidden',
              bgcolor: (tt) => alpha(tt.palette.grey[500], 0.12),
            }}
          >
            <Skeleton height="100%" width="100%" style={{ display: 'block' }} />
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{
                position: 'absolute',
                top: { xs: 10, sm: 16 },
                left: 12,
                right: 12,
                zIndex: 1,
              }}
            >
              <Skeleton circle width={48} height={48} />
              <Stack direction="row" spacing={0.5}>
                <Skeleton circle width={48} height={48} />
                <Skeleton circle width={48} height={48} />
                <Skeleton circle width={48} height={48} />
              </Stack>
            </Stack>
          </Box>
        </Box>

        <Card
          elevation={0}
          sx={{
            mx: { xs: -2, sm: -3 },
            mt: { xs: -3, sm: -4 },
            position: 'relative',
            borderRadius: {
              xs: `${SHEET_TOP_RADIUS} ${SHEET_TOP_RADIUS} 0 0`,
              sm: `${SHEET_TOP_RADIUS} ${SHEET_TOP_RADIUS} 16px 16px`,
            },
            px: { xs: 2.5, sm: 3 },
            py: { xs: 3, sm: 4 },
            boxShadow: (tt) =>
              tt.palette.mode === 'light'
                ? `0 -4px 24px ${alpha(tt.palette.common.black, 0.08)}`
                : tt.shadows[4],
          }}
        >
          <Stack spacing={{ xs: 3.5, sm: 4 }}>
            <Box>
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ mb: 1, width: 1, minWidth: 0 }}
              >
                <Skeleton height={32} width="62%" borderRadius={6} />
                <Skeleton height={28} width={56} borderRadius={12} />
              </Stack>
              <Box sx={{ mb: { xs: 2.5, sm: 3 } }}>
                <Skeleton height={14} width="48%" borderRadius={4} />
              </Box>
              <Stack
                direction="row"
                flexWrap="wrap"
                useFlexGap
                gap={0.75}
                sx={{ mb: { xs: 2.5, sm: 3 }, width: 1 }}
              >
                {[64, 88, 72, 96, 60, 84].map((w, i) => (
                  <Skeleton
                    key={`${w}-${i}`}
                    height={24}
                    width={w}
                    style={{ borderRadius: RADIUS.pill }}
                  />
                ))}
              </Stack>

              <Box
                sx={{
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: { xs: '24px', sm: '32px' },
                  p: { xs: 2, sm: 3 },
                  border: (tt) => `1px solid ${alpha(tt.palette.primary.main, 0.2)}`,
                  bgcolor: (tt) => alpha(tt.palette.primary.main, 0.05),
                }}
              >
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  alignItems={{ xs: 'stretch', sm: 'center' }}
                  justifyContent="space-between"
                  spacing={2}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={{ xs: 1.5, sm: 2 }}
                    sx={{ minWidth: 0, flex: 1 }}
                  >
                    <Stack direction="row" alignItems="center" sx={{ pl: 0.5 }}>
                      <Skeleton circle width={36} height={36} />
                      <Box sx={{ ml: -1 }}>
                        <Skeleton circle width={36} height={36} />
                      </Box>
                      <Box sx={{ ml: -1 }}>
                        <Skeleton circle width={36} height={36} />
                      </Box>
                    </Stack>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Skeleton height={11} width="60%" borderRadius={4} />
                      <Skeleton height={10} width="45%" borderRadius={4} style={{ marginTop: 4 }} />
                    </Box>
                  </Stack>
                </Stack>
              </Box>
            </Box>

            <Stack spacing={1.25}>
              <Skeleton height={16} width="32%" borderRadius={4} />
              <Skeleton height={14} width="100%" borderRadius={4} />
              <Skeleton height={14} width="92%" borderRadius={4} />
              <Skeleton height={14} width="68%" borderRadius={4} />
            </Stack>

            <Stack spacing={1.5}>
              <Skeleton height={18} width="40%" borderRadius={4} />
              <Stack direction="row" spacing={1}>
                <Skeleton height={96} borderRadius={12} style={{ flex: 1 }} />
                <Skeleton height={96} borderRadius={12} style={{ flex: 1 }} />
                <Skeleton height={96} borderRadius={12} style={{ flex: 1 }} />
              </Stack>
            </Stack>
          </Stack>
        </Card>
      </Container>
    </SkeletonTheme>
  );
}
