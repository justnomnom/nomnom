'use client';

import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';

import { paths } from 'src/routes/paths';

import { useTranslate } from 'src/locales';
import { useSkeletonThemeColors } from 'src/theme/use-skeleton-theme';

import SettingsDrillShell from 'src/sections/profile/view/settings-drill-shell';
import {
  dashboardPageRootSx,
  dashboardSubsectionStackProps,
  settingsDrillFullBleedStripSx,
  dashboardPageSectionStackProps,
} from 'src/sections/profile/view/settings-shell-shared';

import DiscoverLocatingSkeleton from './discover-locating-skeleton';
import DiscoverListsLeaderboardSkeleton from './discover-lists-leaderboard-skeleton';

// ----------------------------------------------------------------------

/**
 * Placeholder for `DiscoverView`. Mirrors the live structure:
 *   1. Market context hint (label + use-location IconButton + change Button)
 *   2. Lists leaderboard (avatars row)
 *   3. Vibe chip strip (overline + 4 chips)
 *   4. Roulette promo card (divider kicker + outlined button)
 *   5. Restaurant feed (locating skeleton cards)
 */
export default function DiscoverPageLoadingSkeleton() {
  const { t } = useTranslate();

  const skeletonTheme = useSkeletonThemeColors();

  const leading = (
    <Box sx={{ display: 'flex', alignItems: 'center', py: 0.5, minWidth: 0, alignSelf: 'stretch' }}>
      <Skeleton height={26} width={140} borderRadius={4} />
    </Box>
  );

  const toolbarFooter = (
    <Box sx={{ width: 1 }}>
      <Skeleton height={48} borderRadius={8} />
    </Box>
  );

  return (
    <SkeletonTheme
      baseColor={skeletonTheme.baseColor}
      highlightColor={skeletonTheme.highlightColor}
    >
      <Box data-testid="e2e-discover-loading" sx={{ width: 1 }}>
        <SettingsDrillShell
          title=""
          compactToolbar
          leadingSlot={leading}
          toolbarFooter={toolbarFooter}
          backHref={paths.dashboard.discover}
          backAriaLabel={t('pages.dashboard.discover.document_title')}
        >
          <Box sx={dashboardPageRootSx}>
            <Stack {...dashboardPageSectionStackProps}>
              {/* Market context hint */}
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={1}
                sx={{ flexWrap: 'wrap', gap: 0.5 }}
              >
                <Skeleton height={18} width="55%" borderRadius={4} />
                <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>
                  <Skeleton circle width={36} height={36} />
                  <Skeleton height={20} width={72} borderRadius={4} />
                </Stack>
              </Stack>

              {/* Lists leaderboard */}
              <DiscoverListsLeaderboardSkeleton />

              {/* Vibe chip strip */}
              <Stack {...dashboardSubsectionStackProps}>
                <Skeleton height={14} width={120} borderRadius={4} style={{ marginLeft: 4 }} />
                <Stack
                  direction="row"
                  gap={{ xs: 1, sm: 1.5 }}
                  sx={{
                    ...settingsDrillFullBleedStripSx,
                    flexWrap: 'nowrap',
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    overscrollBehaviorX: 'contain',
                    WebkitOverflowScrolling: 'touch',
                    scrollbarWidth: 'none',
                    touchAction: 'pan-x',
                    '&::-webkit-scrollbar': { display: 'none' },
                  }}
                >
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} height={40} width={108} borderRadius={20} />
                  ))}
                </Stack>
              </Stack>

              {/* Roulette promo */}
              <Stack {...dashboardSubsectionStackProps}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
                  <Skeleton height={14} width={120} borderRadius={4} />
                  <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
                </Stack>
                <Box
                  sx={{
                    borderRadius: 4,
                    px: { xs: 1.5, sm: 2 },
                    py: { xs: 1.25, sm: 1.5 },
                    border: (th) => `2px solid ${alpha(th.palette.primary.main, 0.15)}`,
                    bgcolor: (th) => alpha(th.palette.primary.main, 0.06),
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={2} sx={{ minWidth: 0 }}>
                    <Skeleton width={48} height={48} borderRadius={8} />
                    <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
                      <Skeleton height={20} width="62%" borderRadius={4} />
                      <Skeleton height={14} width="40%" borderRadius={4} />
                    </Stack>
                    <Skeleton width={22} height={22} borderRadius={1} />
                  </Stack>
                </Box>
              </Stack>

              {/* Restaurant feed */}
              <Stack {...dashboardSubsectionStackProps}>
                <DiscoverLocatingSkeleton count={3} showTip={false} />
              </Stack>
            </Stack>
          </Box>
        </SettingsDrillShell>
      </Box>
    </SkeletonTheme>
  );
}
