'use client';

import PropTypes from 'prop-types';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';

import { useSkeletonThemeColors } from 'src/theme/use-skeleton-theme';

import { ICON_TILE, hubCardShellSx } from './view/settings-shell-shared';

// ----------------------------------------------------------------------

/**
 * Skeleton row matching the avatar/badge/subtitle/trailing-action layout used by
 * `SubscriberRow` (paid-list subscribers) and `MySubscriptionRow` (subscriptions).
 * Widths differ slightly between contexts — accept as props.
 */
function SettingsListItemSkeleton({ titleWidth, badgeWidth, subtitleWidth }) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        ...hubCardShellSx(theme),
        px: 2,
        py: 1.75,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
      }}
    >
      <Skeleton circle width={ICON_TILE} height={ICON_TILE} />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" sx={{ mb: 0.25 }}>
          <Skeleton height={20} width={titleWidth} borderRadius={4} />
          <Skeleton height={24} width={badgeWidth} borderRadius={6} />
        </Stack>
        <Skeleton height={14} width={subtitleWidth} borderRadius={4} />
      </Box>
      <Skeleton width={40} height={40} borderRadius={8} />
    </Box>
  );
}

SettingsListItemSkeleton.propTypes = {
  titleWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  badgeWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  subtitleWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
};

/**
 * Loading shell for settings list pages (subscribers, my subscriptions).
 * Renders `count` SettingsListItemSkeleton rows under a SkeletonTheme.
 */
export default function SettingsListLoadingSkeleton({
  count,
  ariaLabel,
  titleWidth,
  badgeWidth,
  subtitleWidth,
}) {
  const skeletonTheme = useSkeletonThemeColors();

  return (
    <SkeletonTheme
      baseColor={skeletonTheme.baseColor}
      highlightColor={skeletonTheme.highlightColor}
    >
      <Stack spacing={1.5} role="status" aria-busy="true" aria-label={ariaLabel}>
        {Array.from({ length: count }, (_, i) => (
          <SettingsListItemSkeleton
            key={i}
            titleWidth={titleWidth}
            badgeWidth={badgeWidth}
            subtitleWidth={subtitleWidth}
          />
        ))}
      </Stack>
    </SkeletonTheme>
  );
}

SettingsListLoadingSkeleton.propTypes = {
  count: PropTypes.number.isRequired,
  ariaLabel: PropTypes.string.isRequired,
  titleWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  badgeWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  subtitleWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
};
