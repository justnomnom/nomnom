'use client';

import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';

import { useTranslate } from 'src/locales';
import { useSkeletonThemeColors } from 'src/theme/use-skeleton-theme';

import { settingsDrillFullBleedStripSx } from 'src/sections/profile/view/settings-shell-shared';

// ----------------------------------------------------------------------

/** Placeholder matching `DiscoverListsLeaderboard` discover variant (title + mode toggles + avatar row). */
export default function DiscoverListsLeaderboardSkeleton() {
  const theme = useTheme();
  const { t } = useTranslate();

  const skeletonTheme = useSkeletonThemeColors();

  const ringBg = alpha(theme.palette.primary.main, theme.palette.mode === 'light' ? 0.22 : 0.42);

  return (
    <SkeletonTheme
      baseColor={skeletonTheme.baseColor}
      highlightColor={skeletonTheme.highlightColor}
    >
      <Stack
        spacing={1.5}
        aria-busy="true"
        aria-label={t('pages.dashboard.discover.lists_leaderboard_title')}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ gap: 1, minWidth: 0 }}
        >
          <Skeleton height={22} width="52%" borderRadius={4} style={{ maxWidth: 280 }} />
          <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
            <Skeleton height={32} width={88} borderRadius={1} />
            <Skeleton height={32} width={96} borderRadius={1} />
          </Stack>
        </Stack>
        <Stack
          direction="row"
          gap={1.5}
          sx={{
            ...settingsDrillFullBleedStripSx,
            flexWrap: 'nowrap',
            py: 0.5,
            overflowX: 'auto',
            overflowY: 'hidden',
            overscrollBehaviorX: 'contain',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            touchAction: 'pan-x',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Box
              key={i}
              sx={{
                flexShrink: 0,
                textAlign: 'center',
                width: 88,
              }}
            >
              <Box
                sx={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  p: '3px',
                  bgcolor: ringBg,
                  mx: 'auto',
                  mb: 0.75,
                }}
              >
                <Skeleton
                  circle
                  width={66}
                  height={66}
                  style={{ display: 'block', margin: '0 auto' }}
                />
              </Box>
              <Skeleton height={12} width={64} style={{ margin: '0 auto 4px' }} borderRadius={4} />
              <Skeleton height={12} width={40} style={{ margin: '0 auto' }} borderRadius={4} />
            </Box>
          ))}
        </Stack>
      </Stack>
    </SkeletonTheme>
  );
}
