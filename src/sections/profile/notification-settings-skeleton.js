'use client';

import PropTypes from 'prop-types';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';

import { INTEGRATION_FLAGS } from 'src/config-global';
import { useSkeletonThemeColors } from 'src/theme/use-skeleton-theme';

function PreferenceRowSkeleton({ labelWidth }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{ px: 2, py: 1.5, gap: 2 }}
    >
      <Skeleton height={16} width={labelWidth} borderRadius={4} />
      <Skeleton width={42} height={26} borderRadius={13} />
    </Stack>
  );
}

PreferenceRowSkeleton.propTypes = {
  labelWidth: PropTypes.number.isRequired,
};

/** Matches `NotificationSettingsView` inside `SettingsDrillShell`: preference card + optional push card. */
export default function NotificationSettingsSkeleton() {
  const skeletonTheme = useSkeletonThemeColors();
  const showPush = INTEGRATION_FLAGS.push;

  return (
    <SkeletonTheme
      baseColor={skeletonTheme.baseColor}
      highlightColor={skeletonTheme.highlightColor}
    >
      <Stack spacing={3} sx={{ width: 1, pt: { xs: 2, sm: 2.5 } }}>
        <Card>
          <PreferenceRowSkeleton labelWidth={132} />
          {showPush && (
            <>
              <Divider />
              <PreferenceRowSkeleton labelWidth={148} />
            </>
          )}
          <Divider />
          <PreferenceRowSkeleton labelWidth={124} />
        </Card>

        {showPush && (
          <Card sx={{ p: 2 }}>
            <Skeleton height={18} width={160} borderRadius={4} />
            <Skeleton height={12} width="88%" borderRadius={4} style={{ marginTop: 8 }} />
            <Box sx={{ mt: 2 }}>
              <Skeleton height={36} width={168} borderRadius={8} />
            </Box>
          </Card>
        )}
      </Stack>
    </SkeletonTheme>
  );
}
