'use client';

import PropTypes from 'prop-types';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';

import { RADIUS, TOUCH_TARGET_SIZE } from 'src/theme/spacing';
import { useSkeletonThemeColors } from 'src/theme/use-skeleton-theme';

// Keep in sync with `NotificationsPanel` / `RowShell`
// (40px avatar + type badge, sentence + timestamp, one 44px overflow control).
const NOTIFICATION_AVATAR_SIZE = 40;
const NOTIFICATION_BADGE_SIZE = 20;

function NotificationRowSkeleton({ bodyWidth, captionWidth }) {
  return (
    <Box
      sx={{
        pl: 2,
        pr: 1,
        py: 1.75,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
      }}
    >
      <Box sx={{ position: 'relative', flexShrink: 0, lineHeight: 0 }}>
        <Skeleton
          circle
          width={NOTIFICATION_AVATAR_SIZE}
          height={NOTIFICATION_AVATAR_SIZE}
          style={{ display: 'block' }}
        />
        <Box sx={{ position: 'absolute', right: -3, bottom: -3, lineHeight: 0 }}>
          <Skeleton
            circle
            width={NOTIFICATION_BADGE_SIZE}
            height={NOTIFICATION_BADGE_SIZE}
            style={{ display: 'block' }}
          />
        </Box>
      </Box>

      <Box sx={{ minWidth: 0, flex: 1, pt: 0.25 }}>
        <Skeleton height={16} width={bodyWidth} borderRadius={RADIUS.tight} />
        <Skeleton
          height={12}
          width={captionWidth}
          borderRadius={RADIUS.tight}
          style={{ marginTop: 8 }}
        />
      </Box>

      <Box sx={{ flexShrink: 0, pt: 0.5, lineHeight: 0 }}>
        <Skeleton
          width={TOUCH_TARGET_SIZE - 12}
          height={TOUCH_TARGET_SIZE - 12}
          borderRadius={RADIUS.tight}
          style={{ display: 'block' }}
        />
      </Box>
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

/** Skeleton list matching `NotificationsPanel` — section label + notification rows. */
export default function NotificationsPanelSkeleton({ count = 4, ariaLabel, sx }) {
  const skeletonTheme = useSkeletonThemeColors();
  const rows = ROW_WIDTHS.slice(0, count);

  return (
    <SkeletonTheme
      baseColor={skeletonTheme.baseColor}
      highlightColor={skeletonTheme.highlightColor}
    >
      <Stack spacing={0} role="status" aria-busy="true" aria-label={ariaLabel} sx={sx}>
        <Box sx={{ px: 2, pt: 1.5, pb: 0.75, lineHeight: 0 }}>
          <Skeleton height={11} width={64} borderRadius={RADIUS.tight} />
        </Box>
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
