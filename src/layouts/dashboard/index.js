'use client';

import { useEffect } from 'react';
import PropTypes from 'prop-types';

import Box from '@mui/material/Box';

import { useBoolean } from 'src/hooks/use-boolean';
import { useResponsive } from 'src/hooks/use-responsive';

import { subscribeToPush } from 'src/api/push';

import { useSettingsContext } from 'src/components/settings';
import SkipToMainLink from 'src/components/a11y/skip-to-main-link';

import { prefetchDefaultMapPins } from 'src/sections/map/map-default-prefetch';

import Main from './main';
import Header from './header';
import NavMini from './nav-mini';
import NavBottom from './nav-bottom';
import NavVertical from './nav-vertical';

// ----------------------------------------------------------------------

export default function DashboardLayout({ children }) {
  const settings = useSettingsContext();

  // Warm the Map tab's default pin set as soon as the user enters the app, on an idle callback so
  // it never competes with the initial paint / LCP. By the time they tap Map, the world-bbox pins
  // are already cached — no more waiting on that round-trip. Deduped + freshness-gated internally,
  // so re-running on every dashboard navigation is cheap.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const run = () => prefetchDefaultMapPins();
    if (typeof window.requestIdleCallback === 'function') {
      const handle = window.requestIdleCallback(run, { timeout: 3000 });
      return () => {
        if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(handle);
      };
    }
    const handle = setTimeout(run, 1200);
    return () => clearTimeout(handle);
  }, []);

  // Keep the Web Push subscription fresh: if the user has already granted
  // permission, re-register the service worker and re-sync the subscription to
  // the server (idempotent — reuses any existing subscription). No-op otherwise.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    subscribeToPush().catch(() => {});
  }, []);

  const lgUp = useResponsive('up', 'lg');

  const nav = useBoolean();

  const isHorizontal = settings.themeLayout === 'horizontal';

  const isMini = settings.themeLayout === 'mini';

  const renderNavMini = <NavMini />;

  const renderNavVertical = <NavVertical openNav={nav.value} onCloseNav={nav.onFalse} />;

  if (isHorizontal) {
    return (
      <Box
        sx={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <SkipToMainLink />
        {lgUp && <Header onOpenNav={nav.onTrue} />}

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            minWidth: 0,
            display: 'flex',
            flexDirection: { xs: 'column', lg: 'row' },
          }}
        >
          {lgUp && renderNavVertical}

          <Main>{children}</Main>
        </Box>

        {!lgUp && <NavBottom />}
      </Box>
    );
  }

  if (isMini) {
    return (
      <Box
        sx={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <SkipToMainLink />
        {lgUp && <Header onOpenNav={nav.onTrue} />}

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            minWidth: 0,
            display: 'flex',
            flexDirection: { xs: 'column', lg: 'row' },
          }}
        >
          {lgUp ? renderNavMini : renderNavVertical}

          <Main>{children}</Main>
        </Box>

        {!lgUp && <NavBottom />}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <SkipToMainLink />
      {lgUp && <Header onOpenNav={nav.onTrue} />}

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
        }}
      >
        {renderNavVertical}

        <Main>{children}</Main>
      </Box>

      {!lgUp && <NavBottom />}
    </Box>
  );
}

DashboardLayout.propTypes = {
  children: PropTypes.node,
};
