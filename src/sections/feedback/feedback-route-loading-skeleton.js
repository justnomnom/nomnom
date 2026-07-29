'use client';

import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';

import { useTranslate } from 'src/locales';
import { RADIUS, TOUCH_TARGET_SIZE } from 'src/theme/spacing';
import { useSkeletonThemeColors } from 'src/theme/use-skeleton-theme';

import SettingsDrillShell from 'src/sections/profile/view/settings-drill-shell';
import { hubCardShellSx } from 'src/sections/profile/view/settings-shell-shared';

// ----------------------------------------------------------------------

function subsectionLabelSkeleton() {
  return (
    <Skeleton
      height={14}
      width={140}
      borderRadius={4}
      style={{ display: 'block', marginBottom: 12, marginLeft: 4 }}
    />
  );
}

/** Matches `FeedbackView`: embed card + help nav rows. */
export default function FeedbackRouteLoadingSkeleton() {
  const theme = useTheme();
  const { t } = useTranslate();

  const skeletonTheme = useSkeletonThemeColors();

  return (
    <SkeletonTheme
      baseColor={skeletonTheme.baseColor}
      highlightColor={skeletonTheme.highlightColor}
    >
      <SettingsDrillShell
        title={t('pages.dashboard.feedback.title')}
        backHref={paths.dashboard.settings}
        backAriaLabel={t('pages.dashboard.settings.back_to_hub')}
      >
        <Stack spacing={{ xs: 3, sm: 4 }} aria-busy="true">
          <Box>
            {subsectionLabelSkeleton()}
            <Skeleton
              height={16}
              width="100%"
              style={{ maxWidth: 520, display: 'block', marginBottom: 16 }}
            />
            <Box
              sx={{
                ...hubCardShellSx(theme),
                height: { xs: 'min(72vh, 800px)', md: 720 },
              }}
            >
              <Skeleton height="100%" style={{ width: '100%', display: 'block' }} />
            </Box>
          </Box>
          <Box>
            {subsectionLabelSkeleton()}
            <Stack spacing={2}>
              <Box sx={hubCardShellSx(theme)}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ px: 2, py: 2.25 }}>
                  <Skeleton
                    width={TOUCH_TARGET_SIZE}
                    height={TOUCH_TARGET_SIZE}
                    style={{ borderRadius: RADIUS.tight, flexShrink: 0 }}
                  />
                  <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
                    <Skeleton height={20} width="40%" borderRadius={4} />
                    <Skeleton height={16} width="72%" borderRadius={4} />
                  </Stack>
                  <Skeleton width={22} height={22} borderRadius={4} />
                </Stack>
              </Box>
              <Box sx={hubCardShellSx(theme)}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ px: 2, py: 2.25 }}>
                  <Skeleton
                    width={TOUCH_TARGET_SIZE}
                    height={TOUCH_TARGET_SIZE}
                    style={{ borderRadius: RADIUS.tight, flexShrink: 0 }}
                  />
                  <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
                    <Skeleton height={20} width="36%" borderRadius={4} />
                    <Skeleton height={16} width="68%" borderRadius={4} />
                  </Stack>
                  <Skeleton width={22} height={22} borderRadius={4} />
                </Stack>
              </Box>
            </Stack>
          </Box>
        </Stack>
      </SettingsDrillShell>
    </SkeletonTheme>
  );
}
