'use client';

import PropTypes from 'prop-types';
import { SkeletonTheme } from 'react-loading-skeleton';

import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';

import { useTranslate } from 'src/locales';
import { useSkeletonThemeColors } from 'src/theme/use-skeleton-theme';

import CompactToolbarIconSkeleton from 'src/components/loading-screen/compact-toolbar-icon-skeleton';

import { hubCardShellSx, SettingsDrillShell, dashboardPageRootSx } from 'src/sections/profile/view';

import NotificationsPanelSkeleton from './notifications-panel-skeleton';

/** Matches `NotificationsView`: drill shell header + card panel list. */
export default function NotificationsPageSkeleton({ rowCount = 5 }) {
  const theme = useTheme();
  const { t } = useTranslate();
  const skeletonTheme = useSkeletonThemeColors();

  return (
    <SkeletonTheme
      baseColor={skeletonTheme.baseColor}
      highlightColor={skeletonTheme.highlightColor}
    >
      <SettingsDrillShell
        title={t('components.notifications.title')}
        backHref={paths.dashboard.discover}
        backAriaLabel={t('pages.dashboard.title')}
        endAdornment={<CompactToolbarIconSkeleton />}
      >
        <Box sx={{ ...dashboardPageRootSx, minWidth: 0, overflowX: 'hidden' }} aria-busy="true">
          <Box sx={hubCardShellSx(theme)}>
            <NotificationsPanelSkeleton
              count={rowCount}
              ariaLabel={t('components.notifications.title')}
            />
          </Box>
        </Box>
      </SettingsDrillShell>
    </SkeletonTheme>
  );
}

NotificationsPageSkeleton.propTypes = {
  rowCount: PropTypes.number,
};
