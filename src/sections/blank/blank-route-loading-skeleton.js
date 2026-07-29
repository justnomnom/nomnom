'use client';

import PropTypes from 'prop-types';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';

import Box from '@mui/material/Box';

import { paths } from 'src/routes/paths';

import { useTranslate } from 'src/locales';
import { useSkeletonThemeColors } from 'src/theme/use-skeleton-theme';

import { SettingsDrillShell } from 'src/sections/profile/view';

// ----------------------------------------------------------------------

/** Matches `BlankView`: drill title + framed content area. */
function BlankRouteLoadingSkeleton({ titleKey = 'pages.blank.title' }) {
  const { t } = useTranslate();

  const skeletonTheme = useSkeletonThemeColors();

  return (
    <SkeletonTheme
      baseColor={skeletonTheme.baseColor}
      highlightColor={skeletonTheme.highlightColor}
    >
      <SettingsDrillShell
        title={t(titleKey)}
        backHref={paths.dashboard.discover}
        backAriaLabel={t('pages.dashboard.title')}
      >
        <Box
          aria-busy="true"
          sx={{
            mt: 1,
            width: 1,
            height: 320,
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <Skeleton height={320} style={{ width: '100%', display: 'block', borderRadius: 8 }} />
        </Box>
      </SettingsDrillShell>
    </SkeletonTheme>
  );
}

BlankRouteLoadingSkeleton.propTypes = {
  titleKey: PropTypes.string,
};

export default BlankRouteLoadingSkeleton;
