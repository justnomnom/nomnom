'use client';

import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

import { useTranslate } from 'src/locales';
import { RADIUS } from 'src/theme/spacing';
import { useSkeletonThemeColors } from 'src/theme/use-skeleton-theme';

// ----------------------------------------------------------------------

/** Matches `AdminHubView`: heading + 2-column card grid. */
export default function AdminHubRouteLoadingSkeleton() {
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'));
  const { t } = useTranslate();

  const skeletonTheme = useSkeletonThemeColors();

  return (
    <SkeletonTheme
      baseColor={skeletonTheme.baseColor}
      highlightColor={skeletonTheme.highlightColor}
    >
      <Stack
        spacing={isNarrow ? 2.5 : 3}
        sx={{
          p: { xs: 1.5, sm: 2, md: 3 },
          maxWidth: 960,
          mx: 'auto',
          width: 1,
          pb: { xs: 4, md: 3 },
        }}
        aria-busy="true"
        aria-label={t('pages.dashboard.admin.hub.document_title')}
      >
        <Box>
          <Skeleton
            height={isNarrow ? 28 : 34}
            width={280}
            borderRadius={4}
            style={{ marginBottom: 8 }}
          />
          <Skeleton height={18} width="min(100%, 480px)" borderRadius={4} />
        </Box>
        <Grid container spacing={2}>
          {[0, 1].map((i) => (
            <Grid key={i} size={{ xs: 12, sm: 6 }}>
              <Card variant="outlined" sx={{ height: 1, borderRadius: 2 }}>
                <Stack direction="row" spacing={2} sx={{ p: 2, alignItems: 'flex-start' }}>
                  <Skeleton
                    width={48}
                    height={48}
                    style={{ borderRadius: RADIUS.base, flexShrink: 0 }}
                  />
                  <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
                    <Skeleton height={22} width="55%" borderRadius={4} />
                    <Skeleton height={16} width="92%" borderRadius={4} />
                    <Skeleton height={16} width="78%" borderRadius={4} />
                  </Stack>
                </Stack>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Stack>
    </SkeletonTheme>
  );
}
