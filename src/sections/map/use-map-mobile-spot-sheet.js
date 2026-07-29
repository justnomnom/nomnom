'use client';

import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import { alpha, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

import { usePrefersReducedMotion } from 'src/hooks/use-prefers-reduced-motion';

/** px/ms — finger moving up (negative vy) faster than this counts as an expand flick */
const SHEET_FLICK_UP_VELOCITY_PX_PER_MS = -0.26;
/** px/ms — finger moving down: collapse flick */
const SHEET_FLICK_DOWN_VELOCITY_PX_PER_MS = 0.26;

/**
 * Bottom sheet snap + drag for dashboard map / list map (mobile &lt; md).
 *
 * @param {object} opts
 * @param {number} [opts.bottomInsetPx] — e.g. fixed bottom nav height (`NAV.H_MOBILE_BOTTOM`) or 0 for full-bleed pages.
 * @param {number | null} [opts.maxSheetHeightPx] — cap `full` snap height (e.g. embedded list map: sheet stays inside the map card).
 */
export function useMapMobileSpotSheet({ bottomInsetPx = 0, maxSheetHeightPx = null } = {}) {
  const theme = useTheme();
  const prefersReducedMotion = usePrefersReducedMotion();
  const isMobileSheet = useMediaQuery(theme.breakpoints.down('md'), { noSsr: true });

  const [viewportH, setViewportH] = useState(
    typeof window !== 'undefined' ? window.innerHeight : 640
  );
  useEffect(() => {
    const onResize = () => setViewportH(window.innerHeight);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const sheetSnapBounds = useMemo(() => {
    const short = viewportH > 0 && viewportH < 640;
    const bar = short ? 72 : 78;
    const rawFull = Math.round(Math.max(0, viewportH - bottomInsetPx - 8));
    let full = Math.max(bar, rawFull);
    if (
      typeof maxSheetHeightPx === 'number' &&
      Number.isFinite(maxSheetHeightPx) &&
      maxSheetHeightPx > bar + 8
    ) {
      full = Math.min(full, Math.round(maxSheetHeightPx));
    }
    // Default open height ~45% of viewport (Google-Maps-style place sheet).
    const peekBase = short
      ? Math.min(360, Math.max(260, Math.round(viewportH * 0.45)))
      : Math.min(480, Math.max(320, Math.round(viewportH * 0.45)));
    let peek = Math.min(peekBase, Math.max(bar + 32, full - 16));
    if (peek > full) peek = full;
    return { bar, peek, full };
  }, [viewportH, bottomInsetPx, maxSheetHeightPx]);

  const initialSheetHeight = () => {
    const vh = typeof window !== 'undefined' ? window.innerHeight : 640;
    return Math.round(Math.max(280, Math.min(vh * 0.45, 480)));
  };
  const [sheetHeightPx, setSheetHeightPx] = useState(initialSheetHeight);
  const sheetHeightRef = useRef(sheetHeightPx);
  sheetHeightRef.current = sheetHeightPx;
  const hasSnappedToPeekRef = useRef(false);

  const [sheetDragging, setSheetDragging] = useState(false);

  useEffect(() => {
    setSheetHeightPx((h) => {
      // First time bounds are known: snap to peek so the default open height
      // matches the Google-Maps-style ~45% viewport target regardless of viewport.
      if (!hasSnappedToPeekRef.current) {
        hasSnappedToPeekRef.current = true;
        return sheetSnapBounds.peek;
      }
      return Math.min(Math.max(h, sheetSnapBounds.bar), sheetSnapBounds.full);
    });
  }, [sheetSnapBounds]);

  const sheetDragRef = useRef({
    active: false,
    pointerId: null,
    startY: 0,
    startH: 200,
    lastY: 0,
    lastT: 0,
    /** px/ms; positive = finger moving down (clientY increases) */
    velocityY: 0,
  });

  const onSheetHandlePointerDown = useCallback(
    (e) => {
      if (!isMobileSheet) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      // Pointer capture keeps move/up events on this element even if the finger drifts
      // off the small grab pill into the scroll area below — otherwise touch events
      // can stall mid-drag when a stray second touch (map underlay gestures) reorders
      // e.touches.
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore — capture is best-effort */
      }
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      sheetDragRef.current = {
        active: true,
        pointerId: e.pointerId,
        startY: e.clientY,
        startH: sheetHeightRef.current,
        lastY: e.clientY,
        lastT: now,
        velocityY: 0,
      };
      setSheetDragging(true);
    },
    [isMobileSheet]
  );

  const onSheetHandlePointerMove = useCallback(
    (e) => {
      const drag = sheetDragRef.current;
      if (!isMobileSheet || !drag.active) return;
      if (drag.pointerId !== null && e.pointerId !== drag.pointerId) return;
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const y = e.clientY;
      const dt = now - drag.lastT;
      if (dt > 4) {
        const vy = (y - drag.lastY) / dt;
        drag.velocityY = Math.max(-4, Math.min(4, vy));
      }
      drag.lastY = y;
      drag.lastT = now;

      const dy = y - drag.startY;
      const next = drag.startH - dy;
      const { bar, full } = sheetSnapBounds;
      setSheetHeightPx(Math.round(Math.min(Math.max(next, bar), full)));
    },
    [isMobileSheet, sheetSnapBounds]
  );

  const snapSheetToNearest = useCallback(
    (h, velocityYPxPerMs = 0) => {
      const { bar, peek, full } = sheetSnapBounds;
      const b1 = (bar + peek) / 2;
      const b2 = (peek + full) / 2;

      // Flick intent overrides midpoint snap (short swipe can still reach full / collapse).
      if (velocityYPxPerMs <= SHEET_FLICK_UP_VELOCITY_PX_PER_MS) {
        if (h < b1) return peek;
        if (h < b2) return full;
        return full;
      }
      if (velocityYPxPerMs >= SHEET_FLICK_DOWN_VELOCITY_PX_PER_MS) {
        if (h >= b2) return peek;
        if (h >= b1) return bar;
        return bar;
      }

      if (h < b1) return bar;
      if (h < b2) return peek;
      return full;
    },
    [sheetSnapBounds]
  );

  const endSheetDrag = useCallback(
    (e) => {
      const drag = sheetDragRef.current;
      if (!drag.active) return;
      if (e && e.pointerId != null && drag.pointerId !== null && e.pointerId !== drag.pointerId) {
        return;
      }
      if (e && typeof e.currentTarget?.releasePointerCapture === 'function') {
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }
      const vy = drag.velocityY;
      drag.active = false;
      drag.pointerId = null;
      setSheetDragging(false);
      if (!isMobileSheet) return;
      setSheetHeightPx(snapSheetToNearest(sheetHeightRef.current, vy));
    },
    [isMobileSheet, snapSheetToNearest]
  );

  const sheetExpandedMobile = isMobileSheet && sheetHeightPx > sheetSnapBounds.bar + 4;

  const mobileSheetHeightTransition =
    sheetDragging || prefersReducedMotion
      ? 'none'
      : theme.transitions.create('height', {
          duration: 240,
          easing: theme.transitions.easing.easeOut,
        });

  const glassPanelSx = useMemo(
    () => ({
      bgcolor: alpha(theme.palette.background.paper, 0.98),
      border: `1px solid ${alpha(theme.palette.divider, theme.palette.mode === 'dark' ? 0.9 : 1)}`,
      boxShadow: theme.shadows[8],
    }),
    [theme]
  );

  return {
    isMobileSheet,
    sheetSnapBounds,
    sheetHeightPx,
    setSheetHeightPx,
    sheetHeightRef,
    onSheetHandlePointerDown,
    onSheetHandlePointerMove,
    endSheetDrag,
    sheetExpandedMobile,
    mobileSheetHeightTransition,
    glassPanelSx,
  };
}
