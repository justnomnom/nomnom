'use client';

import PropTypes from 'prop-types';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';

import { useResponsive } from 'src/hooks/use-responsive';

import { useTranslate } from 'src/locales';
import { useSkeletonThemeColors } from 'src/theme/use-skeleton-theme';

import { SettingsPageContainer } from './settings-drill-shell';
import { TOUCH_MIN, hubCardShellSx, HUB_ROW_MIN_HEIGHT } from './settings-shell-shared';

// ----------------------------------------------------------------------

function HubNavRowSkeleton() {
  const theme = useTheme();
  return (
    <Box sx={hubCardShellSx(theme)}>
      <Box
        sx={{
          px: 2,
          py: 2.25,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          minHeight: HUB_ROW_MIN_HEIGHT,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2} sx={{ minWidth: 0, flex: 1 }}>
          <Skeleton circle width={44} height={44} />
          <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
            <Skeleton height={18} width="48%" borderRadius={4} />
            <Skeleton height={14} width="78%" borderRadius={4} />
          </Stack>
        </Stack>
        <Skeleton width={22} height={22} borderRadius={1} />
      </Box>
    </Box>
  );
}

function SectionBlock({ children }) {
  return (
    <Box>
      <Skeleton
        height={14}
        width={120}
        borderRadius={4}
        sx={{ mb: 2, ml: 0.5, display: 'block' }}
      />
      <Stack spacing={2}>{children}</Stack>
    </Box>
  );
}

SectionBlock.propTypes = {
  children: PropTypes.node,
};

/** `/dashboard/settings` hub — matches `SettingsHubView` sections + `HubNavRow` cards. */
export default function SettingsHubLoadingSkeleton() {
  const theme = useTheme();
  const mdUp = useResponsive('up', 'md');
  const { t } = useTranslate();

  const skeletonTheme = useSkeletonThemeColors();

  const mobileHeader = !mdUp ? (
    <Box
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 12,
        mx: { xs: -2, sm: -3 },
        px: { xs: 2, sm: 3 },
        pt: 'env(safe-area-inset-top, 0px)',
        pb: 0,
        mb: 1,
        minHeight: TOUCH_MIN,
        display: 'flex',
        alignItems: 'center',
        bgcolor: alpha(theme.palette.background.default, 0.98),
      }}
      aria-busy="true"
      aria-label={t('pages.dashboard.settings.title')}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `${TOUCH_MIN}px minmax(0, 1fr)`,
          alignItems: 'center',
          columnGap: 1,
          width: 1,
          minHeight: TOUCH_MIN,
        }}
      >
        <Skeleton circle width={TOUCH_MIN} height={TOUCH_MIN} />
        <Box sx={{ display: 'flex', justifyContent: 'center', minWidth: 0 }}>
          <Skeleton height={22} width={160} borderRadius={4} />
        </Box>
      </Box>
    </Box>
  ) : null;

  const desktopHeader = mdUp ? (
    <Box
      sx={{
        mb: { xs: 3, md: 5 },
        pb: 1,
        borderBottom: (th) => `1px solid ${alpha(th.palette.divider, 0.45)}`,
      }}
      aria-busy="true"
      aria-label={t('pages.dashboard.settings.title')}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2, flexWrap: 'wrap' }}>
        <Skeleton height={18} width={72} borderRadius={4} />
        <Skeleton height={14} width={14} borderRadius={2} />
        <Skeleton height={18} width={96} borderRadius={4} />
      </Stack>
      <Skeleton height={32} width={280} borderRadius={4} />
    </Box>
  ) : null;

  return (
    <SkeletonTheme
      baseColor={skeletonTheme.baseColor}
      highlightColor={skeletonTheme.highlightColor}
    >
      <SettingsPageContainer>
        {mobileHeader}
        {desktopHeader}

        <Stack spacing={{ xs: 3, sm: 4 }} sx={{ position: 'relative', pt: mdUp ? 2.5 : 0 }}>
          {/* Account section — 7 rows (edit, appearance, preferences, notifications, billing, subscribers, my-subscriptions) */}
          <SectionBlock>
            <HubNavRowSkeleton />
            <HubNavRowSkeleton />
            <HubNavRowSkeleton />
            <HubNavRowSkeleton />
            <HubNavRowSkeleton />
            <HubNavRowSkeleton />
            <HubNavRowSkeleton />
          </SectionBlock>
          {/* Help section — 4 rows (home, feedback, faqs, support) */}
          <SectionBlock>
            <HubNavRowSkeleton />
            <HubNavRowSkeleton />
            <HubNavRowSkeleton />
            <HubNavRowSkeleton />
          </SectionBlock>
          {/* Danger zone — single error-tinted row */}
          <Box>
            <Skeleton
              height={14}
              width={100}
              borderRadius={4}
              sx={{ mb: 2, ml: 0.5, display: 'block' }}
            />
            <Box
              sx={{
                ...hubCardShellSx(theme),
                px: 2,
                py: 2,
                minHeight: HUB_ROW_MIN_HEIGHT,
                border: `1px solid ${alpha(theme.palette.error.main, 0.22)}`,
                bgcolor: alpha(theme.palette.error.main, 0.06),
              }}
            >
              <Stack direction="row" alignItems="center" spacing={2}>
                <Skeleton circle width={44} height={44} />
                <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
                  <Skeleton height={18} width="42%" borderRadius={4} />
                  <Skeleton height={14} width="70%" borderRadius={4} />
                </Stack>
                <Skeleton width={22} height={22} borderRadius={1} />
              </Stack>
            </Box>
          </Box>
          {/* Session — single logout row */}
          <SectionBlock>
            <HubNavRowSkeleton />
          </SectionBlock>
        </Stack>
      </SettingsPageContainer>
    </SkeletonTheme>
  );
}
