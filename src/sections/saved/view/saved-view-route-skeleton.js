'use client';

import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';

import { paths } from 'src/routes/paths';

import { useTranslate } from 'src/locales';
import { useSkeletonThemeColors } from 'src/theme/use-skeleton-theme';

import { SCROLLABLE_CHIP_PILL_BORDER_RADIUS } from 'src/components/scrollable-chip-select';
import CompactToolbarIconSkeleton from 'src/components/loading-screen/compact-toolbar-icon-skeleton';

import { SettingsDrillShell, dashboardPageRootSx } from 'src/sections/profile/view';
import { NOM_NOM_LIST_COMPACT_THUMB_PX } from 'src/sections/lists/nom-nom-list-tile';

// ----------------------------------------------------------------------

const LIST_SKELETON_ROWS = 5;
const listTitleSkeletonWidths = ['58%', '72%', '64%', '68%', '78%'];
/** Compact tile thumb (96px) + 3px ring padding on each side — matches `CompactThumb`. */
const LIST_THUMB_SKELETON_H = NOM_NOM_LIST_COMPACT_THUMB_PX + 6;

/** Route `loading.js` for `/dashboard/lists` — matches `SavedView` shell + 2-column tile grid. */
export default function SavedViewRouteSkeleton() {
  const { t } = useTranslate();

  const skeletonTheme = useSkeletonThemeColors();

  return (
    <SkeletonTheme
      baseColor={skeletonTheme.baseColor}
      highlightColor={skeletonTheme.highlightColor}
      borderRadius={16}
      duration={1.2}
    >
      <SettingsDrillShell
        title="…"
        backHref={paths.dashboard.discover}
        backAriaLabel={t('pages.dashboard.title')}
        endAdornment={<CompactToolbarIconSkeleton />}
      >
        <Box sx={{ ...dashboardPageRootSx, minWidth: 0, overflowX: 'hidden' }} aria-busy="true">
          <Skeleton
            height={18}
            width="min(100%, 420px)"
            borderRadius={4}
            style={{ marginBottom: 16 }}
          />

          <Box
            sx={{
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
            <Stack direction="row" spacing={1} sx={{ width: 'max-content' }}>
              <Skeleton height={44} width={56} borderRadius={SCROLLABLE_CHIP_PILL_BORDER_RADIUS} />
              <Skeleton height={44} width={72} borderRadius={SCROLLABLE_CHIP_PILL_BORDER_RADIUS} />
              <Skeleton height={44} width={104} borderRadius={SCROLLABLE_CHIP_PILL_BORDER_RADIUS} />
              <Skeleton height={44} width={124} borderRadius={SCROLLABLE_CHIP_PILL_BORDER_RADIUS} />
              <Skeleton height={44} width={88} borderRadius={SCROLLABLE_CHIP_PILL_BORDER_RADIUS} />
            </Stack>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.5 }}>
            {Array.from({ length: LIST_SKELETON_ROWS }, (_, i) => (
              <Box key={i} sx={{ width: 1, minWidth: 0 }}>
                <Skeleton
                  height={LIST_THUMB_SKELETON_H}
                  style={{ borderRadius: 12, marginBottom: 8 }}
                />
                <Box sx={{ px: 0.5 }}>
                  <Skeleton
                    height={14}
                    width={listTitleSkeletonWidths[i % listTitleSkeletonWidths.length]}
                    style={{ borderRadius: 6, marginBottom: 4 }}
                  />
                  <Skeleton height={11} width="50%" style={{ borderRadius: 6 }} />
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </SettingsDrillShell>
    </SkeletonTheme>
  );
}
