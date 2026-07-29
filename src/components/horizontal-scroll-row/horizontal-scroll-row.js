'use client';

import PropTypes from 'prop-types';
import { useRef, Children, useState, useCallback, useLayoutEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';

import { useResponsive } from 'src/hooks/use-responsive';
import { usePrefersReducedMotion } from 'src/hooks/use-prefers-reduced-motion';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';

import Iconify from 'src/components/iconify';

// ----------------------------------------------------------------------

const SCROLL_EPS = 4;

/**
 * ScrollableChipRow — horizontally scrollable strip with optional edge chevrons on smaller viewports.
 * Chevrons mount only when useful (left only if scrolled right; right only if more content ahead);
 * if everything fits, neither shows.
 */
export default function HorizontalScrollRow({
  children,
  gap = 1.5,
  sx,
  scrollerSx,
  controlsBreakpoint = 'md',
  forceControls = false,
  chevronIconWidth = 18,
  leftAriaLabel,
  rightAriaLabel,
}) {
  const { t } = useTranslate();
  const mdUp = useResponsive('up', controlsBreakpoint);
  const prefersReducedMotion = usePrefersReducedMotion();
  const scrollRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const childCount = Children.count(children);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanLeft(scrollLeft > SCROLL_EPS);
    setCanRight(scrollLeft + clientWidth < scrollWidth - SCROLL_EPS);
  }, []);

  useLayoutEffect(() => {
    updateArrows();
    const el = scrollRef.current;
    if (!el) {
      return undefined;
    }
    const ro = new ResizeObserver(() => {
      updateArrows();
    });
    ro.observe(el);
    el.addEventListener('scroll', updateArrows, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', updateArrows);
    };
  }, [updateArrows, childCount]);

  const scrollByDir = useCallback(
    (dir) => {
      const el = scrollRef.current;
      if (!el) {
        return;
      }
      const step = Math.max(120, Math.floor(el.clientWidth * 0.65)) * dir;
      el.scrollBy({ left: step, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    },
    [prefersReducedMotion]
  );

  const leftLabel = leftAriaLabel ?? t('components.horizontal_scroll_row.scroll_left_aria');
  const rightLabel = rightAriaLabel ?? t('components.horizontal_scroll_row.scroll_right_aria');
  const showChevrons = forceControls || !mdUp;
  /** Only mount chevrons when that direction can scroll — avoids a dead “<” at the start on mobile. */
  const showLeftChevron = showChevrons && canLeft;
  const showRightChevron = showChevrons && canRight;

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={0.5}
      sx={{
        minWidth: 0,
        ...sx,
      }}
    >
      {showLeftChevron ? (
        <IconButton
          size="medium"
          onClick={() => scrollByDir(-1)}
          aria-label={leftLabel}
          sx={{
            flexShrink: 0,
            width: 44,
            height: 44,
            p: 0,
            color: 'text.secondary',
            WebkitTapHighlightColor: 'transparent',
            touchAction: 'manipulation',
            '&:active': { opacity: (th) => (th.palette.mode === 'dark' ? 0.85 : 0.92) },
          }}
        >
          <Iconify icon={ic.chevronLeftLinear} width={chevronIconWidth} />
        </IconButton>
      ) : null}

      <Box
        ref={scrollRef}
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap,
          overflowX: 'auto',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
          // pan-x alone blocks vertical page scroll when the finger starts on the strip
          touchAction: 'pan-x pan-y',
          overscrollBehaviorX: 'contain',
          '&::-webkit-scrollbar': { display: 'none' },
          ...scrollerSx,
        }}
      >
        {children}
      </Box>

      {showRightChevron ? (
        <IconButton
          size="medium"
          onClick={() => scrollByDir(1)}
          aria-label={rightLabel}
          sx={{
            flexShrink: 0,
            width: 44,
            height: 44,
            p: 0,
            color: 'text.secondary',
            WebkitTapHighlightColor: 'transparent',
            touchAction: 'manipulation',
            '&:active': { opacity: (th) => (th.palette.mode === 'dark' ? 0.85 : 0.92) },
          }}
        >
          <Iconify icon={ic.chevronRightLinear} width={chevronIconWidth} />
        </IconButton>
      ) : null}
    </Stack>
  );
}

HorizontalScrollRow.displayName = 'ScrollableChipRow';

HorizontalScrollRow.propTypes = {
  children: PropTypes.node,
  gap: PropTypes.oneOfType([PropTypes.number, PropTypes.object]),
  sx: PropTypes.object,
  scrollerSx: PropTypes.object,
  controlsBreakpoint: PropTypes.string,
  forceControls: PropTypes.bool,
  chevronIconWidth: PropTypes.number,
  leftAriaLabel: PropTypes.string,
  rightAriaLabel: PropTypes.string,
};
