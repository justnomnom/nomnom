'use client';

import PropTypes from 'prop-types';
import { usePathname } from 'next/navigation';

import Box from '@mui/material/Box';

import { useResponsive } from 'src/hooks/use-responsive';

import { NAV, HEADER, DASHBOARD_MAIN_TOP_BELOW_APPBAR } from 'src/config-global';
import { isDashboardMapRoute, isDashboardRestaurantDetailRoute } from 'src/layouts/compact';

import { useSettingsContext } from 'src/components/settings';

// ----------------------------------------------------------------------

/** Matches MUI `theme.spacing(3)` — desktop main inset below fixed header. */
const SPACING = 24;

function horizontalLayoutPadding({
  lgUp,
  mapEdgeToEdge,
  profileMobileChrome,
  mobileTop,
  mobileBottom,
  mobileTopWithAppBar,
  mobileBottomNoNav,
  mapMobileTop,
  mapMobileBottom,
}) {
  if (lgUp) {
    if (mapEdgeToEdge) {
      /**
       * AppBar is fixed — pad `Main` so content clears toolbar, border, and notch (`DASHBOARD_MAIN_TOP_BELOW_APPBAR`).
       */
      return {
        px: 0,
        pb: 0,
        pt: DASHBOARD_MAIN_TOP_BELOW_APPBAR,
        width: `calc(100% - ${NAV.W_VERTICAL}px)`,
      };
    }
    return {
      px: 2,
      pt: `calc(${HEADER.H_DESKTOP + SPACING}px + env(safe-area-inset-top, 0px))`,
      pb: `${HEADER.H_DESKTOP + SPACING}px`,
      width: `calc(100% - ${NAV.W_VERTICAL}px)`,
    };
  }
  if (mapEdgeToEdge) {
    return { pt: mapMobileTop, pb: mapMobileBottom };
  }
  return {
    pt: profileMobileChrome ? mobileTopWithAppBar : mobileTop,
    pb: profileMobileChrome ? mobileBottomNoNav : mobileBottom,
  };
}

function verticalLayoutPadding({
  lgUp,
  mapEdgeToEdge,
  profileMobileChrome,
  mobileTop,
  mobileBottom,
  mobileTopWithAppBar,
  mobileBottomNoNav,
  mapMobileTop,
  mapMobileBottom,
  isNavMini,
}) {
  const miniWidth = isNavMini ? { width: `calc(100% - ${NAV.W_MINI}px)` } : {};

  if (lgUp) {
    if (mapEdgeToEdge) {
      return {
        px: 0,
        pb: 0,
        pt: DASHBOARD_MAIN_TOP_BELOW_APPBAR,
        width: `calc(100% - ${NAV.W_VERTICAL}px)`,
        ...miniWidth,
      };
    }
    return {
      px: 2,
      pt: `calc(${HEADER.H_DESKTOP + SPACING}px + env(safe-area-inset-top, 0px))`,
      pb: `${HEADER.H_DESKTOP + SPACING}px`,
      width: `calc(100% - ${NAV.W_VERTICAL}px)`,
      ...miniWidth,
    };
  }
  if (mapEdgeToEdge) {
    return { pt: mapMobileTop, pb: mapMobileBottom };
  }
  return {
    pt: profileMobileChrome ? mobileTopWithAppBar : mobileTop,
    pb: profileMobileChrome ? mobileBottomNoNav : mobileBottom,
  };
}

export default function Main({ children, sx, ...other }) {
  const settings = useSettingsContext();

  const pathname = usePathname();
  /** Previously: settings/profile on mobile used AppBar-only chrome (no bottom nav inset). Layout now shows bottom nav on small screens everywhere. */
  const profileMobileChrome = false;
  /** Map + restaurant detail: no extra Main gutter — avoids double top/bottom spacing with hero shell. */
  const mapEdgeToEdge = isDashboardMapRoute(pathname) || isDashboardRestaurantDetailRoute(pathname);
  const isRestaurantDetailPage = isDashboardRestaurantDetailRoute(pathname);

  const lgUp = useResponsive('up', 'lg');

  const isNavHorizontal = settings.themeLayout === 'horizontal';

  const isNavMini = settings.themeLayout === 'mini';

  const mobileTop = `calc(${SPACING}px + env(safe-area-inset-top, 0px))`;
  const mobileBottom = `calc(${SPACING}px + ${NAV.H_MOBILE_BOTTOM}px + env(safe-area-inset-bottom, 0px))`;
  const mobileTopWithAppBar = `calc(${HEADER.H_MOBILE + SPACING}px + env(safe-area-inset-top, 0px))`;
  const mobileBottomNoNav = `calc(${SPACING}px + env(safe-area-inset-bottom, 0px))`;
  const mapMobileTop = 'env(safe-area-inset-top, 0px)';
  const mapMobileBottom = `calc(${NAV.H_MOBILE_BOTTOM}px + env(safe-area-inset-bottom, 0px))`;

  /** Fills flex dead space below scroll content with the same tone as the detail card (mobile). */
  const restaurantMainSx = isRestaurantDetailPage && !lgUp ? { bgcolor: 'background.paper' } : {};

  const mainLandmarkSx = {
    '&:focus': { outline: 'none' },
    '&:focus-visible': (theme) => ({
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: -2,
    }),
  };

  if (isNavHorizontal) {
    return (
      <Box
        component="main"
        id="main-content"
        tabIndex={-1}
        sx={{
          flexGrow: 1,
          minHeight: 0,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          ...horizontalLayoutPadding({
            lgUp,
            mapEdgeToEdge,
            profileMobileChrome,
            mobileTop,
            mobileBottom,
            mobileTopWithAppBar,
            mobileBottomNoNav,
            mapMobileTop,
            mapMobileBottom,
          }),
          ...restaurantMainSx,
          ...mainLandmarkSx,
          ...sx,
        }}
        {...other}
      >
        {children}
      </Box>
    );
  }

  return (
    <Box
      component="main"
      id="main-content"
      tabIndex={-1}
      sx={{
        flexGrow: 1,
        minHeight: 0,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        ...verticalLayoutPadding({
          lgUp,
          mapEdgeToEdge,
          profileMobileChrome,
          mobileTop,
          mobileBottom,
          mobileTopWithAppBar,
          mobileBottomNoNav,
          mapMobileTop,
          mapMobileBottom,
          isNavMini,
        }),
        ...restaurantMainSx,
        ...mainLandmarkSx,
        ...sx,
      }}
      {...other}
    >
      {children}
    </Box>
  );
}

Main.propTypes = {
  children: PropTypes.node,
  sx: PropTypes.object,
};
