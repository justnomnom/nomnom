'use client';

import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';

import { paths } from 'src/routes/paths';

import { useTranslate } from 'src/locales';
import { useSkeletonThemeColors } from 'src/theme/use-skeleton-theme';

import CompactToolbarIconSkeleton from 'src/components/loading-screen/compact-toolbar-icon-skeleton';

import SettingsDrillShell from 'src/sections/profile/view/settings-drill-shell';
import {
  dashboardPageRootSx,
  settingsDrillFullBleedStripSx,
} from 'src/sections/profile/view/settings-shell-shared';

// ----------------------------------------------------------------------

export default function ListManagePageSkeleton() {
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
        backHref={paths.dashboard.lists}
        backAriaLabel={t('navigation.lists')}
        endAdornment={endAdornment}
      >
        <Box sx={{ ...dashboardPageRootSx, minWidth: 0, overflowX: 'hidden' }} aria-busy="true">
          <Stack
            direction="row"
            spacing={1.5}
            sx={{
              ...settingsDrillFullBleedStripSx,
              borderBottom: 1,
              borderColor: 'divider',
              pb: 0,
              mb: 2,
              minWidth: 0,
              width: 1,
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              overscrollBehaviorX: 'contain',
              '&::-webkit-scrollbar': { display: 'none' },
            }}
          >
            {[95, 72, 78, 82, 70].map((w) => (
              <Box
                key={w}
                sx={{
                  minHeight: 48,
                  display: 'flex',
                  alignItems: 'center',
                  px: 0.5,
                  flexShrink: 0,
                }}
              >
                <Skeleton width={w} height={22} borderRadius={4} />
              </Box>
            ))}
          </Stack>

          <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Box sx={{ mb: 2 }}>
              <Skeleton width={120} height={18} borderRadius={4} />
            </Box>
            <Stack spacing={2}>
              <Skeleton height={56} borderRadius={8} />
              <Skeleton height={80} borderRadius={8} />
              <Skeleton height={56} borderRadius={8} />
              <Box sx={{ width: '100%', maxWidth: 480, mx: 'auto' }}>
                <Box sx={{ width: 1, aspectRatio: '16 / 9', borderRadius: 2, overflow: 'hidden' }}>
                  <Skeleton height="100%" width="100%" />
                </Box>
                <Box sx={{ mt: 1.5 }}>
                  <Skeleton width={140} height={36} borderRadius={4} />
                </Box>
              </Box>
              <Stack direction="row" spacing={1} sx={{ pt: 0.5 }}>
                <Skeleton height={36} width={120} borderRadius={4} />
                <Skeleton height={36} width={120} borderRadius={4} />
              </Stack>
            </Stack>
          </Card>
        </Box>
      </SettingsDrillShell>
    </SkeletonTheme>
  );
}
