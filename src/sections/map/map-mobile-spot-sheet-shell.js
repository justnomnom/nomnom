'use client';

import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';

import { Z_INDEX } from 'src/theme/spacing';

import { SheetGrabBarRail } from 'src/components/sheet-shell';

/**
 * Fixed bottom sheet chrome (grab bar + scroll region) — matches dashboard map mobile UX.
 *
 * @param {object} props
 * @param {number} props.bottomInsetPx
 * @param {import('react').ReactNode} props.children
 * @param {number} props.sheetHeightPx
 * @param {function} props.setSheetHeightPx
 * @param {{ bar: number, peek: number, full: number }} props.sheetSnapBounds
 * @param {boolean} props.sheetExpandedMobile
 * @param {string} props.mobileSheetHeightTransition
 * @param {function} props.onSheetHandlePointerDown
 * @param {function} props.onSheetHandlePointerMove
 * @param {function} props.endSheetDrag
 * @param {object} props.glassPanelSx — merged into sheet container
 * @param {'viewport' | 'embedded'} [props.anchor] — `viewport`: fixed to window (dashboard map). `embedded`: absolute bottom of map slot (list map in a scrollable page).
 * @param {function} props.t — i18n
 */
export function MapMobileSpotSheetShell({
  bottomInsetPx,
  children,
  sheetHeightPx,
  setSheetHeightPx,
  sheetSnapBounds,
  sheetExpandedMobile,
  mobileSheetHeightTransition,
  onSheetHandlePointerDown,
  onSheetHandlePointerMove,
  endSheetDrag,
  glassPanelSx,
  anchor = 'viewport',
  t,
}) {
  const overlaySx =
    anchor === 'embedded'
      ? {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 2,
          maxHeight: '100%',
        }
      : {
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: `calc(${bottomInsetPx}px + env(safe-area-inset-bottom, 0px))`,
          zIndex: Z_INDEX.mobileBottomSheet,
          maxHeight: `calc(100dvh - ${bottomInsetPx}px - env(safe-area-inset-bottom, 0px))`,
        };

  return (
    <Box
      sx={{
        ...overlaySx,
        height: sheetHeightPx,
        px: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'stretch',
        pointerEvents: 'none',
        transition: mobileSheetHeightTransition,
        '& > *': { pointerEvents: 'auto' },
      }}
    >
      <Box
        sx={{
          ...glassPanelSx,
          borderRadius: { xs: '16px 16px 0 0', sm: '2.5rem 2.5rem 0 0' },
          pt: 0,
          pb: 0,
          px: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          height: '100%',
          minHeight: sheetSnapBounds.bar,
          overflow: 'hidden',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <Box
          role="button"
          aria-expanded={sheetExpandedMobile}
          aria-label={t('pages.dashboard.map.sheet_handle_aria')}
          tabIndex={0}
          onPointerDown={onSheetHandlePointerDown}
          onPointerMove={onSheetHandlePointerMove}
          onPointerUp={endSheetDrag}
          onPointerCancel={endSheetDrag}
          onLostPointerCapture={endSheetDrag}
          onKeyDown={(ev) => {
            const { bar, peek, full } = sheetSnapBounds;
            const midBarPeek = (bar + peek) / 2;
            const midPeekFull = (peek + full) / 2;
            const stepUp = (h) => {
              if (h < midBarPeek) return peek;
              if (h < midPeekFull) return full;
              return full;
            };
            const stepDown = (h) => {
              if (h > midPeekFull) return peek;
              if (h > midBarPeek) return bar;
              return bar;
            };
            if (ev.key === 'ArrowUp' || ev.key === 'PageUp') {
              ev.preventDefault();
              setSheetHeightPx((h) => stepUp(h));
              return;
            }
            if (ev.key === 'ArrowDown' || ev.key === 'PageDown') {
              ev.preventDefault();
              setSheetHeightPx((h) => stepDown(h));
              return;
            }
            if (ev.key === 'Enter' || ev.key === ' ') {
              ev.preventDefault();
              setSheetHeightPx((h) => {
                if (h <= bar + 8) return peek;
                if (h <= peek + 8) return full;
                return bar;
              });
            }
          }}
          sx={{
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 0,
            px: 0,
            // Pad vertically so the grab area is ~32px tall — gives the finger
            // room to drift without crossing into the scroll region below.
            py: 1,
            touchAction: 'none',
            cursor: 'grab',
            outline: 'none',
            '&:focus-visible': {
              borderRadius: 1,
              boxShadow: (th) => `0 0 0 2px ${alpha(th.palette.primary.main, 0.4)}`,
            },
          }}
        >
          <SheetGrabBarRail size="sm" sx={{ pointerEvents: 'none' }} />
        </Box>

        <Box
          sx={{
            // Match dashboard map aside (`map-view.js`): flex min-size + touch scroll so the map
            // underlay does not steal vertical pan gestures on mobile.
            flex: '1 1 0%',
            minHeight: 0,
            minWidth: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            // `pan-y` alone breaks taps on nested controls (hero gallery buttons, horizontal carousel)
            // inside the sheet on mobile WebKit. `manipulation` keeps vertical scroll + faster taps.
            touchAction: 'manipulation',
            position: 'relative',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}

MapMobileSpotSheetShell.propTypes = {
  anchor: PropTypes.oneOf(['viewport', 'embedded']),
  bottomInsetPx: PropTypes.number.isRequired,
  children: PropTypes.node,
  sheetHeightPx: PropTypes.number.isRequired,
  setSheetHeightPx: PropTypes.func.isRequired,
  sheetSnapBounds: PropTypes.shape({
    bar: PropTypes.number.isRequired,
    peek: PropTypes.number.isRequired,
    full: PropTypes.number.isRequired,
  }).isRequired,
  sheetExpandedMobile: PropTypes.bool.isRequired,
  mobileSheetHeightTransition: PropTypes.string.isRequired,
  onSheetHandlePointerDown: PropTypes.func.isRequired,
  onSheetHandlePointerMove: PropTypes.func.isRequired,
  endSheetDrag: PropTypes.func.isRequired,
  glassPanelSx: PropTypes.object,
  t: PropTypes.func.isRequired,
};
