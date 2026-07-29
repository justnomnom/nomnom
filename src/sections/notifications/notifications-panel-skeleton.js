'use client';

import PropTypes from 'prop-types';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';

import { useSkeletonThemeColors } from 'src/theme/use-skeleton-theme';

// Keep in sync with `NotificationsPanel` / `RowShell` (40px avatar, body + caption).
const NOTIFICATION_AVATAR_SIZE = 40;
const NOTIFICATION_ACTION_SIZE = 32;

function NotificationRowSkeleton({ bodyWidth, captionWidth }) {
  return (
    <Box
      sx={{
        px: 2,
        py: 1.5,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
      }}
    >
      <Skeleton
        circle
        width={NOTIFICATION_AVATAR_SIZE}
        height={NOTIFICATION_AVATAR_SIZE}
        style={{ flexShrink: 0 }}
      />
      <Box sx={{ minWidth: 0, flex: 1, pt: 0.25 }}>
        <Skeleton height={16} width={bodyWidth} borderRadius={4} />
        <Skeleton height={12} width={captionWidth} borderRadius={4} style={{ marginTop: 8 }} />
      </Box>
      <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
        <Skeleton
          width={NOTIFICATION_ACTION_SIZE}
          height={NOTIFICATION_ACTION_SIZE}
          borderRadius={8}
        />
        <Skeleton
          width={NOTIFICATION_ACTION_SIZE}
          height={NOTIFICATION_ACTION_SIZE}
          borderRadius={8}
        />
      </Stack>
    </Box>
  );
}

NotificationRowSkeleton.propTypes = {
  bodyWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  captionWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
};

const ROW_WIDTHS = [
  { body: '92%', caption: '28%' },
  { body: '84%', caption: '32%' },
  { body: '88%', caption: '24%' },
  { body: '80%', caption: '30%' },
  { body: '86%', caption: '26%' },
];

/** Skeleton list matching `NotificationsPanel` notification rows. */
export default function NotificationsPanelSkeleton({ count = 4, ariaLabel, sx }) {
  const skeletonTheme = useSkeletonThemeColors();
  const rows = ROW_WIDTHS.slice(0, count);

  return (
    <SkeletonTheme
      baseColor={skeletonTheme.baseColor}
      highlightColor={skeletonTheme.highlightColor}
    >
      <Stack spacing={0} role="status" aria-busy="true" aria-label={ariaLabel} sx={sx}>
        {rows.map((row, i) => (
          <NotificationRowSkeleton key={i} bodyWidth={row.body} captionWidth={row.caption} />
        ))}
      </Stack>
    </SkeletonTheme>
  );
}

NotificationsPanelSkeleton.propTypes = {
  count: PropTypes.number,
  ariaLabel: PropTypes.string,
  sx: PropTypes.object,
};
