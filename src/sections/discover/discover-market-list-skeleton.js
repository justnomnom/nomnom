'use client';

import PropTypes from 'prop-types';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';

import { useTranslate } from 'src/locales';
import { useSkeletonThemeColors } from 'src/theme/use-skeleton-theme';

// ----------------------------------------------------------------------

/** Skeleton rows matching the discover market picker `ListItemButton` list. */
export default function DiscoverMarketListSkeleton({ count = 10, showSearchField = true }) {
  const { t } = useTranslate();
  const skeletonTheme = useSkeletonThemeColors();

  return (
    <SkeletonTheme
      baseColor={skeletonTheme.baseColor}
      highlightColor={skeletonTheme.highlightColor}
    >
      <Box aria-busy="true" aria-label={t('pages.dashboard.discover.market_change_loading')}>
        {showSearchField ? (
          <Box
            sx={{
              position: 'sticky',
              top: 0,
              zIndex: 1,
              bgcolor: 'background.paper',
              px: 2,
              py: 1.5,
              borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
            }}
          >
            <Skeleton height={40} borderRadius={8} />
          </Box>
        ) : null}
        <Stack spacing={0} sx={{ px: 1, py: 0.5 }}>
          {Array.from({ length: count }, (_, i) => (
            <Box
              key={i}
              sx={{
                px: 2,
                py: 1.25,
                minHeight: 48,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Skeleton
                height={18}
                width={`${58 + (i % 4) * 9}%`}
                borderRadius={4}
                style={{ maxWidth: 280 }}
              />
            </Box>
          ))}
        </Stack>
      </Box>
    </SkeletonTheme>
  );
}

DiscoverMarketListSkeleton.propTypes = {
  count: PropTypes.number,
  showSearchField: PropTypes.bool,
};
