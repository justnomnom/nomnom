'use client';

import { useEffect } from 'react';

import {
  isCapacitorNative,
  getCapacitorPlatform,
  isCapacitorPluginAvailable,
} from 'src/libs/capacitor/platform';

// ----------------------------------------------------------------------

function isUserCancelledPluginError(error) {
  const msg = error?.message ?? String(error);
  return /cancel|dismiss|user/i.test(msg);
}

/**
 * Native-only: status bar, splash hide, keyboard (iOS), Android hardware back.
 * Dynamic imports + plugin availability checks (Capacitor best practices).
 */
export function CapacitorInit() {
  useEffect(() => {
    if (!isCapacitorNative()) {
      return undefined;
    }

    let cancelled = false;
    let removeBack;

    const run = async () => {
      const [{ SplashScreen }, { StatusBar, Style }, { Keyboard, KeyboardResize }, { App }] =
        await Promise.all([
          import('@capacitor/splash-screen'),
          import('@capacitor/status-bar'),
          import('@capacitor/keyboard'),
          import('@capacitor/app'),
        ]);

      if (cancelled) {
        return;
      }

      const platform = getCapacitorPlatform();

      if (isCapacitorPluginAvailable('StatusBar')) {
        try {
          await StatusBar.setStyle({ style: Style.Default });
        } catch (e) {
          if (!isUserCancelledPluginError(e)) {
            console.warn('[CapacitorInit] StatusBar', e);
          }
        }
      }

      if (platform === 'ios' && isCapacitorPluginAvailable('Keyboard')) {
        try {
          await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
        } catch (e) {
          if (!isUserCancelledPluginError(e)) {
            console.warn('[CapacitorInit] Keyboard', e);
          }
        }
      }

      if (isCapacitorPluginAvailable('SplashScreen')) {
        try {
          await SplashScreen.hide();
        } catch (e) {
          if (!isUserCancelledPluginError(e)) {
            console.warn('[CapacitorInit] SplashScreen', e);
          }
        }
      }

      if (isCapacitorPluginAvailable('App')) {
        const handles = [];

        if (platform === 'android') {
          try {
            handles.push(
              await App.addListener('backButton', ({ canGoBack }) => {
                if (canGoBack) {
                  window.history.back();
                } else {
                  App.exitApp().catch(() => {});
                }
              })
            );
          } catch (e) {
            console.warn('[CapacitorInit] App backButton', e);
          }
        }

        try {
          handles.push(
            await App.addListener('appUrlOpen', ({ url }) => {
              if (!url || typeof window === 'undefined') {
                return;
              }
              try {
                const incoming = new URL(url);
                const current = new URL(window.location.href);
                if (incoming.origin === current.origin) {
                  const next = `${incoming.pathname}${incoming.search}${incoming.hash}`;
                  window.history.pushState({}, '', next);
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }
              } catch (e) {
                if (!isUserCancelledPluginError(e)) {
                  console.warn('[CapacitorInit] appUrlOpen', e);
                }
              }
            })
          );
        } catch (e) {
          console.warn('[CapacitorInit] App appUrlOpen', e);
        }

        removeBack = () => {
          handles.forEach((h) => {
            h.remove().catch(() => {});
          });
        };
      }
    };

    run().catch((e) => {
      console.warn('[CapacitorInit]', e);
    });

    return () => {
      cancelled = true;
      removeBack?.();
    };
  }, []);

  return null;
}
