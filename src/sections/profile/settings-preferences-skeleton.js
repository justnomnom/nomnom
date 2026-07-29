'use client';

import PropTypes from 'prop-types';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';

import { useSkeletonThemeColors } from 'src/theme/use-skeleton-theme';

// ----------------------------------------------------------------------

const CHIP_WIDTHS = [88, 110, 72, 96, 132, 80, 104, 118, 76, 92, 124, 84];

function ChipSkeleton({ width }) {
  return <Skeleton height={32} width={width} borderRadius={16} />;
}

ChipSkeleton.propTypes = {
  width: PropTypes.number.isRequired,
};

function CategoryBlock({ labelWidth, chipWidths }) {
  return (
    <Stack spacing={1.5}>
      <Skeleton height={14} width={labelWidth} borderRadius={4} />
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        {chipWidths.map((w, i) => (
          <ChipSkeleton key={i} width={w} />
        ))}
      </Box>
    </Stack>
  );
}

CategoryBlock.propTypes = {
  labelWidth: PropTypes.number.isRequired,
  chipWidths: PropTypes.arrayOf(PropTypes.number).isRequired,
};

/** Matches `SettingsTagPreferencesPage`: body copy + section label + tag chip groups. */
export default function SettingsPreferencesSkeleton() {
  const skeletonTheme = useSkeletonThemeColors();

  return (
    <SkeletonTheme
      baseColor={skeletonTheme.baseColor}
      highlightColor={skeletonTheme.highlightColor}
    >
      <Stack spacing={4} sx={{ width: 1, pt: { xs: 2, sm: 2.5 } }}>
        <Stack spacing={1} sx={{ px: 0.5 }}>
          <Skeleton height={14} width="90%" borderRadius={4} />
          <Skeleton height={14} width="72%" borderRadius={4} />
        </Stack>

        <Stack spacing={2}>
          <Skeleton height={14} width={140} borderRadius={4} />
          <Stack spacing={3}>
            <CategoryBlock labelWidth={96} chipWidths={CHIP_WIDTHS.slice(0, 8)} />
            <CategoryBlock labelWidth={112} chipWidths={CHIP_WIDTHS.slice(2, 10)} />
            <CategoryBlock labelWidth={84} chipWidths={CHIP_WIDTHS.slice(4, 12)} />
          </Stack>
        </Stack>
      </Stack>
    </SkeletonTheme>
  );
}
