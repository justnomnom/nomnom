'use client';

import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

import { NAV } from 'src/config-global';
import { useTranslate } from 'src/locales';
import { RADIUS, Z_INDEX } from 'src/theme/spacing';
import { useSkeletonThemeColors } from 'src/theme/use-skeleton-theme';

import { SettingsDrillShell } from 'src/sections/profile/view';

// ----------------------------------------------------------------------

/** Keep in sync with Nom Nom list row skeleton in `map-spot-sheet-inner.js`. */
const MAP_SHEET_LIST_ROW_GALLERY_H = 88;
const MAP_SHEET_LIST_ACTION_BTN = 32;

export default function MapRouteLoadingSkeleton() {
  const theme = useTheme();
  const isMobileSheet = useMediaQuery(theme.breakpoints.down('md'), { noSsr: true });
  const { t } = useTranslate();

  const skeletonTheme = useSkeletonThemeColors();

  const mapBg = alpha(theme.palette.grey[500], 0.12);

  /** Matches `placesScrollChildren` in map-view: caption + rows live in the same scroll region (no fixed aside header). */
  const spotsCaptionSx = {
    px: 1.5,
    pt: 0.25,
    pb: 0.5,
    m: 0,
    fontWeight: 800,
    color: 'text.secondary',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  };

  const listSkeletonRows = (
    <Stack spacing={1.1} sx={{ px: 1.5, pb: 1.5, pt: 0 }}>
      {['r1', 'r2', 'r3', 'r4'].map((key) => (
        <Stack key={key} direction="column" spacing={0.85}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
            sx={{ pr: 0.5 }}
          >
            <Skeleton height={18} width="58%" style={{ borderRadius: 6 }} />
            <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
              <Skeleton
                height={MAP_SHEET_LIST_ACTION_BTN}
                width={MAP_SHEET_LIST_ACTION_BTN}
                style={{ borderRadius: '50%' }}
              />
              <Skeleton
                height={MAP_SHEET_LIST_ACTION_BTN}
                width={MAP_SHEET_LIST_ACTION_BTN}
                style={{ borderRadius: '50%' }}
              />
            </Stack>
          </Stack>
          <Skeleton height={MAP_SHEET_LIST_ROW_GALLERY_H} style={{ borderRadius: 12 }} />
          <Skeleton height={22} width="88%" style={{ borderRadius: RADIUS.pill }} />
        </Stack>
      ))}
    </Stack>
  );

  const scrollableListSkeleton = (
    <>
      <Typography component="p" variant="caption" sx={spotsCaptionSx}>
        {t('pages.dashboard.map.sheet_spots_in_view')}
      </Typography>
      {listSkeletonRows}
    </>
  );

  return (
    <SkeletonTheme
      baseColor={skeletonTheme.baseColor}
      highlightColor={skeletonTheme.highlightColor}
    >
      <SettingsDrillShell
        title=""
        compactToolbar
        fillMain
        hideCompactStickyHeader
        pageContainerSx={{ px: 0 }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          sx={{
            flex: 1,
            minHeight: 0,
            minWidth: 0,
            width: 1,
            alignItems: { md: 'stretch' },
          }}
          aria-busy="true"
          aria-label={t('pages.dashboard.map.title')}
        >
          <Box
            sx={{
              flex: { xs: 1, md: 1 },
              minWidth: 0,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
            }}
          >
            <Box
              sx={{
                position: 'relative',
                flex: 1,
                minHeight: { xs: 200, md: 0 },
                borderRadius: isMobileSheet
                  ? { xs: 0, lg: 2 }
                  : { xs: 0, md: '12px 0 0 12px', lg: '16px 0 0 16px' },
                overflow: 'hidden',
                bgcolor: mapBg,
              }}
            >
              <Skeleton
                height="100%"
                width="100%"
                style={{ display: 'block', minHeight: isMobileSheet ? 240 : 360 }}
              />

              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  zIndex: 1,
                  px: { xs: 1.5, sm: 2 },
                  pt: 'max(8px, env(safe-area-inset-top, 0px))',
                  pointerEvents: 'none',
                }}
              >
                <Stack
                  spacing={1}
                  sx={{ width: 1, maxWidth: { md: 720, xl: 900 }, mx: { md: 'auto' } }}
                >
                  <Skeleton height={48} borderRadius={999} />
                  <Stack direction="row" gap={0.75} sx={{ flexWrap: 'wrap' }}>
                    <Skeleton height={44} width={100} borderRadius={999} />
                    <Skeleton height={44} width={88} borderRadius={999} />
                    <Skeleton height={44} width={76} borderRadius={999} />
                  </Stack>
                </Stack>
              </Box>
            </Box>

            {isMobileSheet ? (
              <Box
                sx={{
                  position: 'fixed',
                  left: 0,
                  right: 0,
                  bottom: `calc(${NAV.H_MOBILE_BOTTOM}px + env(safe-area-inset-bottom, 0px))`,
                  zIndex: Z_INDEX.mobileBottomSheet,
                  height: 'min(38dvh, 320px)',
                  maxHeight: `calc(100dvh - ${NAV.H_MOBILE_BOTTOM}px - env(safe-area-inset-bottom, 0px))`,
                  display: 'flex',
                  flexDirection: 'column',
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  bgcolor: alpha(theme.palette.background.paper, 0.98),
                  border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                  boxShadow: theme.shadows[12],
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{ pt: 1, pb: 0.5, display: 'flex', justifyContent: 'center', flexShrink: 0 }}
                >
                  <Skeleton width={40} height={5} borderRadius={3} />
                </Box>
                <Box
                  sx={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    WebkitOverflowScrolling: 'touch',
                  }}
                >
                  {scrollableListSkeleton}
                </Box>
              </Box>
            ) : null}
          </Box>

          {!isMobileSheet ? (
            <Box
              component="aside"
              aria-label={t('pages.dashboard.map.sheet_list_aria')}
              sx={{
                display: { xs: 'none', md: 'flex' },
                flexDirection: 'column',
                width: { md: 380, lg: 400, xl: 420 },
                minWidth: 0,
                maxWidth: { md: '46vw' },
                flexShrink: 0,
                minHeight: 0,
                alignSelf: 'stretch',
                bgcolor: alpha(theme.palette.background.paper, 0.98),
                borderLeft: `1px solid ${theme.palette.divider}`,
                borderRadius: { md: '0 12px 12px 0', lg: '0 16px 16px 0' },
                boxShadow: theme.shadows[8],
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  flex: '1 1 0%',
                  minHeight: 0,
                  minWidth: 0,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  WebkitOverflowScrolling: 'touch',
                  overscrollBehavior: 'contain',
                  touchAction: 'pan-y',
                  position: 'relative',
                }}
              >
                {scrollableListSkeleton}
              </Box>
            </Box>
          ) : null}
        </Stack>
      </SettingsDrillShell>
    </SkeletonTheme>
  );
}
