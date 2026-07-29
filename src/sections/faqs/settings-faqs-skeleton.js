'use client';

import PropTypes from 'prop-types';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';

import { useSkeletonThemeColors } from 'src/theme/use-skeleton-theme';

import {
  hubCardShellSx,
  HUB_ROW_MIN_HEIGHT,
} from 'src/sections/profile/view/settings-shell-shared';

// ----------------------------------------------------------------------

function FaqRowSkeleton({ questionWidth }) {
  const theme = useTheme();
  return (
    <Box sx={hubCardShellSx(theme)}>
      <Box
        sx={{
          minHeight: HUB_ROW_MIN_HEIGHT,
          px: { xs: 1.5, sm: 2 },
          py: 1.25,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Skeleton height={18} width={questionWidth} borderRadius={4} />
        </Box>
        <Skeleton width={22} height={22} borderRadius={4} />
      </Box>
    </Box>
  );
}

FaqRowSkeleton.propTypes = {
  questionWidth: PropTypes.string,
};

function FaqsFormSkeleton() {
  const theme = useTheme();
  return (
    <Box sx={{ width: 1, maxWidth: { xs: '100%', md: 600 }, mx: 'auto' }}>
      <Stack spacing={2} sx={{ width: 1, alignItems: 'stretch' }}>
        <Skeleton height={14} width={140} borderRadius={4} />
        <Stack direction="row" spacing={1}>
          <Skeleton height={40} width={88} borderRadius={20} />
          <Skeleton height={40} width={104} borderRadius={20} />
          <Skeleton height={40} width={96} borderRadius={20} />
        </Stack>
        <Box sx={hubCardShellSx(theme)}>
          <Skeleton height={48} style={{ display: 'block', borderRadius: 8 }} />
        </Box>
        <Box sx={hubCardShellSx(theme)}>
          <Skeleton height={48} style={{ display: 'block', borderRadius: 8 }} />
        </Box>
        <Box sx={hubCardShellSx(theme)}>
          <Skeleton height={120} style={{ display: 'block', borderRadius: 8 }} />
        </Box>
        <Skeleton height={48} borderRadius={8} />
        <Skeleton height={12} width="85%" borderRadius={4} style={{ margin: '0 auto' }} />
      </Stack>
    </Box>
  );
}

const ROW_WIDTHS = ['82%', '68%', '74%', '60%', '78%', '70%', '64%', '76%', '66%'];

/** Matches `FaqsList` accordions + `FaqsForm` while the settings FAQs view hydrates. */
export default function SettingsFaqsSkeleton() {
  const skeletonTheme = useSkeletonThemeColors();

  return (
    <SkeletonTheme
      baseColor={skeletonTheme.baseColor}
      highlightColor={skeletonTheme.highlightColor}
    >
      <Stack spacing={{ xs: 2, sm: 4 }} sx={{ width: 1, pt: { xs: 2, sm: 2.5 } }}>
        <Box>
          <Skeleton
            height={14}
            width={120}
            borderRadius={4}
            style={{ display: 'block', marginBottom: 12 }}
          />
          <Stack spacing={{ xs: 1.5, md: 2 }}>
            {ROW_WIDTHS.map((w, i) => (
              <FaqRowSkeleton key={i} questionWidth={w} />
            ))}
          </Stack>
        </Box>
        <FaqsFormSkeleton />
      </Stack>
    </SkeletonTheme>
  );
}
