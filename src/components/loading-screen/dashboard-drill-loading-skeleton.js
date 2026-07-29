'use client';

import PropTypes from 'prop-types';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';

import { useResponsive } from 'src/hooks/use-responsive';

import { useTranslate } from 'src/locales/use-locales';
import { useSkeletonThemeColors } from 'src/theme/use-skeleton-theme';

import { SettingsPageContainer } from 'src/sections/profile/view/settings-drill-shell';
import {
  TOUCH_MIN,
  SETTINGS_PAGE_GUTTER_PX,
} from 'src/sections/profile/view/settings-shell-shared';

// ----------------------------------------------------------------------

export default function DashboardDrillLoadingSkeleton({ children = null, hubLayout = false }) {
  const theme = useTheme();
  const mdUp = useResponsive('up', 'md');
  const { t } = useTranslate();

  const skeletonTheme = useSkeletonThemeColors();

  const defaultBody = (
    <Stack spacing={2.5} sx={{ pt: { xs: 2, sm: 2.5 } }}>
      <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Skeleton height={20} width="55%" borderRadius={4} />
        <Skeleton height={16} width="88%" borderRadius={4} style={{ marginTop: 12 }} />
        <Skeleton height={16} width="72%" borderRadius={4} style={{ marginTop: 8 }} />
      </Card>
      <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Skeleton height={120} borderRadius={8} />
        <Skeleton height={18} width="40%" borderRadius={4} style={{ marginTop: 16 }} />
      </Card>
    </Stack>
  );

  let headerSkeleton = null;
  if (!mdUp) {
    headerSkeleton = (
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 12,
          mx: { xs: -2, sm: -3, lg: -4 },
          px: SETTINGS_PAGE_GUTTER_PX,
          pt: 'max(4px, env(safe-area-inset-top, 0px))',
          pb: 1,
          mb: 1,
          minHeight: TOUCH_MIN,
          bgcolor: alpha(theme.palette.background.default, 0.98),
        }}
        aria-busy="true"
        aria-label={t('pages.dashboard.title')}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `${TOUCH_MIN}px minmax(0, 1fr) ${TOUCH_MIN}px`,
            alignItems: 'center',
            columnGap: 1,
            width: 1,
            minHeight: TOUCH_MIN,
          }}
        >
          {/* `SettingsDrillShell` / hub: filled circular back — not compact glyph slot */}
          <Skeleton circle width={TOUCH_MIN} height={TOUCH_MIN} />
          <Box sx={{ display: 'flex', justifyContent: 'center', minWidth: 0 }}>
            <Skeleton height={22} width={140} borderRadius={4} />
          </Box>
          <Box sx={{ width: TOUCH_MIN, minHeight: TOUCH_MIN }} aria-hidden />
        </Box>
      </Box>
    );
  } else if (hubLayout) {
    headerSkeleton = (
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
    );
  } else {
    headerSkeleton = (
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{ mb: 3, minHeight: TOUCH_MIN }}
        aria-busy="true"
        aria-label={t('pages.dashboard.title')}
      >
        <Skeleton circle width={TOUCH_MIN} height={TOUCH_MIN} />
        <Skeleton height={28} width={220} borderRadius={4} sx={{ flex: 1 }} />
      </Stack>
    );
  }

  return (
    <SkeletonTheme
      baseColor={skeletonTheme.baseColor}
      highlightColor={skeletonTheme.highlightColor}
    >
      <SettingsPageContainer>
        {headerSkeleton}

        {children ?? defaultBody}
      </SettingsPageContainer>
    </SkeletonTheme>
  );
}

DashboardDrillLoadingSkeleton.propTypes = {
  children: PropTypes.node,
  /** `true` for settings hub desktop (`CustomBreadcrumbs` + heading). */
  hubLayout: PropTypes.bool,
};
