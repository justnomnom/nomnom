'use client';

import PropTypes from 'prop-types';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';

import { TOUCH_TARGET_SIZE } from 'src/theme/spacing';
import { useSkeletonThemeColors } from 'src/theme/use-skeleton-theme';

import { HUB_ROW_MIN_HEIGHT } from 'src/sections/profile/view/settings-shell-shared';

// ----------------------------------------------------------------------

function OptionRowSkeleton({ labelWidth }) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        px: 2,
        py: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        minHeight: HUB_ROW_MIN_HEIGHT,
        borderRadius: '16px',
        bgcolor:
          theme.palette.mode === 'dark'
            ? alpha(theme.palette.common.white, 0.05)
            : alpha(theme.palette.grey[500], 0.06),
        border: '2px solid transparent',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={2} sx={{ minWidth: 0, flex: 1 }}>
        <Skeleton
          width={TOUCH_TARGET_SIZE}
          height={TOUCH_TARGET_SIZE}
          borderRadius={8}
          style={{ display: 'block' }}
        />
        <Skeleton height={16} width={labelWidth} borderRadius={4} />
      </Stack>
      <Skeleton width={20} height={20} borderRadius={4} />
    </Box>
  );
}

OptionRowSkeleton.propTypes = {
  labelWidth: PropTypes.number.isRequired,
};

/** Matches `SettingsAppearancePage`: theme + language sections, each with option rows. */
export default function SettingsAppearanceSkeleton() {
  const skeletonTheme = useSkeletonThemeColors();

  return (
    <SkeletonTheme
      baseColor={skeletonTheme.baseColor}
      highlightColor={skeletonTheme.highlightColor}
    >
      <Stack spacing={4} sx={{ width: 1, pt: { xs: 2, sm: 2.5 } }}>
        <Stack spacing={2}>
          <Skeleton height={14} width={120} borderRadius={4} />
          <Stack spacing={1.5}>
            <OptionRowSkeleton labelWidth={72} />
            <OptionRowSkeleton labelWidth={68} />
          </Stack>
        </Stack>

        <Stack spacing={2}>
          <Skeleton height={14} width={140} borderRadius={4} />
          <Stack spacing={1.5}>
            <OptionRowSkeleton labelWidth={120} />
            <OptionRowSkeleton labelWidth={104} />
            <OptionRowSkeleton labelWidth={132} />
          </Stack>
        </Stack>
      </Stack>
    </SkeletonTheme>
  );
}
