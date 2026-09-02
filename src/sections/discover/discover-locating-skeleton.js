'use client';

import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { usePrefersReducedMotion } from 'src/hooks/use-prefers-reduced-motion';

import { RADIUS } from 'src/theme/spacing';
import { useTranslate } from 'src/locales';
import { readableAccent } from 'src/theme/readable-accent';
import { useSkeletonThemeColors } from 'src/theme/use-skeleton-theme';

import { m, AnimatePresence } from 'src/components/animate';

// ----------------------------------------------------------------------

// Mirrors MapSpotSheetListRow: ACTION_BTN_SIZE=32, CHIP_LINE_PX=22, GALLERY_H=88.
const CARD_COUNT = 3;
const ACTION_BTN_SIZE = 32;
const CHIP_LINE_PX = 22;
const GALLERY_H_PX = 88;

const LOADING_TIP_KEYS = [
  'pages.dashboard.discover.locating_tip_1',
  'pages.dashboard.discover.locating_tip_2',
  'pages.dashboard.discover.locating_tip_3',
];

// Per-card width variation so the placeholder doesn't look like a uniform stamp.
const TITLE_WIDTHS = ['72%', '58%', '66%', '50%'];
const CHIP_WIDTHS = [
  [54, 72, 48],
  [40, 60, 78, 36],
  [62, 44, 70],
  [50, 68, 42, 56],
];

export default function DiscoverLocatingSkeleton({ count = CARD_COUNT, showTip = true }) {
  const { t } = useTranslate();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    if (!showTip) {
      return undefined;
    }
    const id = setInterval(() => {
      setTipIndex((i) => (i + 1) % LOADING_TIP_KEYS.length);
    }, 2400);
    return () => clearInterval(id);
  }, [showTip]);

  const skeletonTheme = useSkeletonThemeColors();

  return (
    <SkeletonTheme
      baseColor={skeletonTheme.baseColor}
      highlightColor={skeletonTheme.highlightColor}
    >
      <Stack
        spacing={1.5}
        sx={{ width: 1 }}
        role="status"
        aria-busy="true"
        aria-label={t('pages.dashboard.discover.locating_aria')}
      >
        {showTip ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', minHeight: 28, mb: 0.5 }}>
            <AnimatePresence mode="wait">
              <Box
                key={tipIndex}
                component={m.div}
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
                animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                sx={{
                  px: 1.5,
                  py: 0.5,
                  borderRadius: RADIUS.pill,
                  bgcolor: (tt) => alpha(tt.palette.primary.main, 0.08),
                  border: (tt) => `1px solid ${alpha(tt.palette.primary.main, 0.18)}`,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    color: (theme) => readableAccent(theme),
                    letterSpacing: '0.01em',
                  }}
                >
                  {t(LOADING_TIP_KEYS[tipIndex])}
                </Typography>
              </Box>
            </AnimatePresence>
          </Box>
        ) : null}

        {Array.from({ length: count }, (_, i) => {
          const chipWidths = CHIP_WIDTHS[i % CHIP_WIDTHS.length];
          return (
            <Stack
              key={i}
              spacing={0.75}
              sx={{
                mb: 0.5,
                py: 1.1,
                pl: 1.5,
                pr: 1,
                borderRadius: 2,
                minWidth: 0,
              }}
            >
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) auto',
                  alignItems: 'center',
                  columnGap: 0.75,
                  width: 1,
                  minWidth: 0,
                  pr: 0.5,
                }}
              >
                <Skeleton
                  height={18}
                  width={TITLE_WIDTHS[i % TITLE_WIDTHS.length]}
                  borderRadius={4}
                />
                <Stack direction="row" spacing={0.5} alignItems="center" flexShrink={0}>
                  <Skeleton circle width={ACTION_BTN_SIZE} height={ACTION_BTN_SIZE} />
                  <Skeleton circle width={ACTION_BTN_SIZE} height={ACTION_BTN_SIZE} />
                  <Skeleton circle width={ACTION_BTN_SIZE} height={ACTION_BTN_SIZE} />
                </Stack>
              </Box>

              <Stack spacing={0.5} sx={{ width: 1, minWidth: 0, pr: 0.5 }}>
                <Box
                  sx={{
                    width: 1,
                    minWidth: 0,
                    height: GALLERY_H_PX,
                    borderRadius: '12px',
                    overflow: 'hidden',
                    bgcolor: 'action.hover',
                  }}
                >
                  <Skeleton height={GALLERY_H_PX} width="100%" style={{ display: 'block' }} />
                </Box>

                <Stack
                  direction="row"
                  flexWrap="wrap"
                  useFlexGap
                  sx={{ columnGap: 0.5, rowGap: 0.5, minWidth: 0, alignItems: 'center' }}
                >
                  {chipWidths.map((w, j) => (
                    <Skeleton
                      key={j}
                      height={CHIP_LINE_PX}
                      width={w}
                      borderRadius={CHIP_LINE_PX / 2}
                    />
                  ))}
                </Stack>
              </Stack>
            </Stack>
          );
        })}
      </Stack>
    </SkeletonTheme>
  );
}

DiscoverLocatingSkeleton.propTypes = {
  count: PropTypes.number,
  showTip: PropTypes.bool,
};
