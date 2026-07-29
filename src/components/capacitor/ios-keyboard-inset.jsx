'use client';

import { useEffect } from 'react';

/**
 * Tracks the iOS Safari virtual-keyboard overlap and exposes it as the CSS custom
 * property `--keyboard-inset-bottom` on the document root. Fixed-position elements
 * (bottom nav, map sheets) can subtract this value so they stay above the keyboard.
 *
 * iOS Safari does not reflow `position: fixed` elements when the keyboard appears —
 * `visualViewport` is the only reliable signal. Native iOS is handled separately
 * by Capacitor's Keyboard plugin with `KeyboardResize.Body`.
 */
export function IOSKeyboardInset() {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) {
      return undefined;
    }

    const vv = window.visualViewport;
    const root = document.documentElement;

    const update = () => {
      const overlap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      root.style.setProperty('--keyboard-inset-bottom', `${Math.round(overlap)}px`);
    };

    update();
    vv.addEventListener('resize', update, { passive: true });
    vv.addEventListener('scroll', update, { passive: true });

    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      root.style.removeProperty('--keyboard-inset-bottom');
    };
  }, []);

  return null;
}
