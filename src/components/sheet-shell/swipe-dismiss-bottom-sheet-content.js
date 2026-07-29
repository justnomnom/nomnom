'use client';

import PropTypes from 'prop-types';
import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';

import { sheetBodyScrollSx } from './sheet-dialog-scroll-sx';
import { mobileBottomSheetTopCorners } from './mobile-bottom-sheet-paper';

/** Marks regions that always start a vertical pull-to-dismiss (e.g. grab bar). */
export const SHEET_DRAG_HANDLE_ATTR = 'data-mui-sheet-drag-handle';

export function sheetDragHandleProps() {
  return {
    [SHEET_DRAG_HANDLE_ATTR]: 'true',
    /** Stops iOS from treating the handle strip as a native vertical scroll before our pointer handlers run. */
    style: { touchAction: 'none' },
  };
}

function normalizeSx(sx) {
  if (sx == null) return [];
  return Array.isArray(sx) ? sx : [sx];
}

/**
 * Pull down on the grab handle, or from the top of the scroll area when scrolled to top,
 * to dismiss a mobile `Drawer anchor="bottom"` (matches native sheet affordances).
 *
 * Pass `chrome` (grab bar + header) so it stays fixed above the scroll region — same pattern as
 * the map restaurant details sheet handle vs scrolling content.
 */
export default function SwipeDismissBottomSheetContent({
  onClose,
  disabled = false,
  /** Pinned top region (e.g. grab bar + `SheetHeaderRow`). Omit to put all `children` in the scroll area (legacy). */
  chrome = null,
  children,
  dismissThreshold = 88,
  maxOffset = 320,
  sx,
}) {
  const theme = useTheme();
  const rootRef = useRef(null);
  const scrollRef = useRef(null);
  const offsetRef = useRef(0);
  const startY = useRef(0);
  const pulling = useRef(false);
  const [offset, setOffset] = useState(0);
  const [isPullingUi, setIsPullingUi] = useState(false);

  const resetRootTouchAction = useCallback(() => {
    const el = rootRef.current;
    if (el) {
      el.style.touchAction = '';
    }
  }, []);

  useEffect(() => () => resetRootTouchAction(), [resetRootTouchAction]);

  const setOffsetBoth = useCallback((next) => {
    offsetRef.current = next;
    setOffset(next);
  }, []);

  const canStartPull = useCallback(
    (target) => {
      if (disabled) return false;
      const fromHandle =
        typeof target.closest === 'function' && target.closest(`[${SHEET_DRAG_HANDLE_ATTR}]`);
      if (fromHandle) return true;
      if (
        typeof target.closest === 'function' &&
        target.closest(
          'button, a, input, textarea, select, label, [role="slider"], [contenteditable="true"]'
        )
      ) {
        return false;
      }
      const el = scrollRef.current;
      if (!el) return false;
      return el.scrollTop <= 1;
    },
    [disabled]
  );

  const handlePointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (!canStartPull(e.target)) return;
    pulling.current = true;
    setIsPullingUi(true);
    startY.current = e.clientY;
    const root = rootRef.current;
    if (root) {
      root.style.touchAction = 'none';
    }
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const handlePointerMove = (e) => {
    if (!pulling.current || disabled) return;
    const dy = e.clientY - startY.current;
    if (dy < 0) {
      setOffsetBoth(0);
      return;
    }
    const next = Math.min(dy, maxOffset);
    setOffsetBoth(next);
    if (next > 0 && e.cancelable) {
      e.preventDefault();
    }
  };

  const endPull = () => {
    if (!pulling.current) return;
    const { current: pullOffset } = offsetRef;
    pulling.current = false;
    setIsPullingUi(false);
    setOffsetBoth(0);
    resetRootTouchAction();
    if (pullOffset >= dismissThreshold) {
      onClose?.();
    }
  };

  const handleLostPointerCapture = () => {
    if (!pulling.current) return;
    pulling.current = false;
    setIsPullingUi(false);
    setOffsetBoth(0);
    resetRootTouchAction();
  };

  return (
    <Box
      ref={rootRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endPull}
      onPointerCancel={endPull}
      onLostPointerCapture={handleLostPointerCapture}
      sx={[
        {
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92dvh',
          width: 1,
          bgcolor: 'background.paper',
          borderRadius: mobileBottomSheetTopCorners,
          boxShadow: theme.shadows[8],
          overflow: 'hidden',
          pb: 'max(4px, env(safe-area-inset-bottom, 0px))',
          transform: offset === 0 ? 'none' : `translate3d(0, ${offset}px, 0)`,
          transition: isPullingUi
            ? 'none'
            : theme.transitions.create('transform', {
                duration: theme.transitions.duration.shorter,
                easing: theme.transitions.easing.easeOut,
              }),
          touchAction: isPullingUi ? 'none' : 'auto',
          willChange: isPullingUi ? 'transform' : 'auto',
        },
        ...normalizeSx(sx),
      ]}
    >
      {chrome ? <Box sx={{ flexShrink: 0 }}>{chrome}</Box> : null}
      <Box
        ref={scrollRef}
        sx={[
          sheetBodyScrollSx,
          {
            flex: chrome ? '1 1 0%' : '1 1 auto',
          },
        ]}
      >
        {children}
      </Box>
    </Box>
  );
}

SwipeDismissBottomSheetContent.propTypes = {
  onClose: PropTypes.func,
  disabled: PropTypes.bool,
  chrome: PropTypes.node,
  children: PropTypes.node,
  dismissThreshold: PropTypes.number,
  maxOffset: PropTypes.number,
  sx: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};
