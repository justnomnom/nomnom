'use client';

import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';

import { useTranslate } from 'src/locales';
import { useSkeletonThemeColors } from 'src/theme/use-skeleton-theme';

import CompactToolbarIconSkeleton from 'src/components/loading-screen/compact-toolbar-icon-skeleton';

import SettingsDrillShell from 'src/sections/profile/view/settings-drill-shell';
import MapSheetListPlaceRowsSkeleton from 'src/sections/map/map-sheet-list-place-rows-skeleton';

// ----------------------------------------------------------------------

/** `/dashboard/lists/[id]` read view — toolbar title + `ListPublicView` dashboard body. */
export default function DashboardListPublicSkeleton() {
  const { t } = useTranslate();

  const skeletonTheme = useSkeletonThemeColors();

  const endAdornment = <CompactToolbarIconSkeleton />;

  return (
    <SkeletonTheme
      baseColor={skeletonTheme.baseColor}
      highlightColor={skeletonTheme.highlightColor}
    >
      <SettingsDrillShell
        title="…"
        compactToolbar
        useHistoryBack
        backAriaLabel={t('common.a11y.back')}
        endAdornment={endAdornment}
      >
        <Box
          sx={{
            maxWidth: 560,
            mx: 'auto',
            minWidth: 0,
            overflowX: 'hidden',
            pb: { xs: 'max(24px, env(safe-area-inset-bottom, 0px))', md: 3 },
          }}
          aria-busy="true"
        >
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', justifyContent: 'center', width: 1 }}>
              <Skeleton height={18} width={140} borderRadius={4} />
            </Box>
            <Skeleton height={16} width="100%" borderRadius={4} />
            <Skeleton height={16} width="88%" borderRadius={4} />

            <Skeleton height={36} width="100%" borderRadius={8} />

            <MapSheetListPlaceRowsSkeleton count={4} sx={{ mx: -0.5 }} />
          </Stack>
        </Box>
      </SettingsDrillShell>
    </SkeletonTheme>
  );
}
