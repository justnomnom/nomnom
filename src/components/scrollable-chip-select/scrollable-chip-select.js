'use client';

import PropTypes from 'prop-types';

import Tabs from '@mui/material/Tabs';
import { alpha, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

import { PRIMARY_ON_FILL_TEXT } from 'src/theme/palette';

// ----------------------------------------------------------------------

/** Shared touch-friendly height for map filter buttons, list hub filter pills, and tab strips. */
export const SCROLLABLE_CHIP_PILL_MIN_HEIGHT = { xs: 44, sm: 40 };

/** Full pill radius for filter chips, map pill buttons, and tab strips (matches default MUI `Chip`). */
export const SCROLLABLE_CHIP_PILL_BORDER_RADIUS = 999;

/**
 * Selected-chip label colour — same white as contained primary buttons.
 * Aliased to `PRIMARY_ON_FILL_TEXT` so chips cannot drift if `contrastText` is edited.
 */
export const SCROLLABLE_CHIP_SELECTED_TEXT = PRIMARY_ON_FILL_TEXT;

/** Horizontal scroll + hidden scrollbar — same behavior as `.MuiTabs-scroller` for plain strips (e.g. avatar links). */
export const scrollableChipStripScrollerSx = {
  overflowX: 'auto',
  overflowY: 'hidden',
  WebkitOverflowScrolling: 'touch',
  // pan-x alone blocks vertical page scroll when the finger starts on the strip
  touchAction: 'pan-x pan-y',
  overscrollBehaviorX: 'contain',
  msOverflowStyle: 'none',
  scrollbarWidth: 'none',
  '&::-webkit-scrollbar': { display: 'none' },
};

function scrollableChipPillSurface(theme) {
  const fill = theme.palette.background.paper;
  const border =
    theme.palette.mode === 'light'
      ? alpha(theme.palette.text.primary, 0.12)
      : alpha(theme.palette.common.white, 0.14);
  return { fill, border };
}

/** Core visual tokens: pill corners, paper / primary fill — used by map and list hub pill `Button`s. */
export function scrollableChipPillCoreSx(theme, { selected = false } = {}) {
  const { fill, border } = scrollableChipPillSurface(theme);
  return {
    fontWeight: 800,
    fontSize: '0.75rem',
    lineHeight: 1.2,
    borderRadius: SCROLLABLE_CHIP_PILL_BORDER_RADIUS,
    textTransform: 'none',
    whiteSpace: 'nowrap',
    border: '1px solid',
    opacity: 1,
    transformOrigin: 'center',
    transition: theme.transitions.create(
      ['background-color', 'color', 'box-shadow', 'border-color', 'transform'],
      { duration: theme.transitions.duration.shortest }
    ),
    // Tap feedback — same scale used on hero toolbar buttons and saved/discover chips.
    '&:active:not(.Mui-disabled)': { transform: 'scale(0.96)' },
    /**
     * Brief pop when a chip becomes selected. CSS animation keyed to aria-pressed
     * so it fires on the state transition, not on initial render of already-active chips.
     */
    '@keyframes scrollableChipPop': {
      '0%': { transform: 'scale(0.94)' },
      '60%': { transform: 'scale(1.04)' },
      '100%': { transform: 'scale(1)' },
    },
    '@media (prefers-reduced-motion: no-preference)': {
      '&[aria-pressed="true"]:not(:active)': {
        animation: 'scrollableChipPop 220ms cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
    '@media (prefers-reduced-motion: reduce)': {
      '&:active': { transform: 'none' },
    },
    ...(selected
      ? {
          color: SCROLLABLE_CHIP_SELECTED_TEXT,
          bgcolor: 'primary.main',
          borderColor: 'primary.main',
          boxShadow: theme.customShadows.chipGlow,
        }
      : {
          color: 'text.primary',
          bgcolor: fill,
          borderColor: border,
        }),
  };
}

function pillButtonHoverSx(theme, selected) {
  if (selected) {
    return {
      '&:hover': {
        bgcolor: 'primary.dark',
        borderColor: 'primary.dark',
        color: SCROLLABLE_CHIP_SELECTED_TEXT,
        '--variant-textBg': theme.palette.primary.dark,
        '--variant-textColor': SCROLLABLE_CHIP_SELECTED_TEXT,
      },
    };
  }
  const hoverBg =
    theme.palette.mode === 'light'
      ? alpha(theme.palette.text.primary, 0.05)
      : alpha(theme.palette.background.paper, 0.62);
  return {
    '&:hover': {
      bgcolor: hoverBg,
      '--variant-textBg': hoverBg,
    },
  };
}

/** Override MUI text-button :active / focus so toggles return to glass (incl. `--variant-textBg`). */
function pillButtonActiveAndFocusSx(theme, selected, fill, border) {
  if (selected) {
    return {
      '&:active': {
        bgcolor: 'primary.dark',
        borderColor: 'primary.dark',
        color: SCROLLABLE_CHIP_SELECTED_TEXT,
        boxShadow: theme.customShadows.chipGlow,
        '--variant-textBg': theme.palette.primary.dark,
        '--variant-textColor': SCROLLABLE_CHIP_SELECTED_TEXT,
      },
      '&:focus:not(:focus-visible)': {
        outline: 'none',
        bgcolor: 'primary.main',
        borderColor: 'primary.main',
        '--variant-textBg': theme.palette.primary.main,
        '--variant-textColor': SCROLLABLE_CHIP_SELECTED_TEXT,
      },
      '&:focus-visible': {
        outline: `2px solid ${theme.palette.primary.main}`,
        outlineOffset: 2,
      },
    };
  }
  const activeBg =
    theme.palette.mode === 'light'
      ? alpha(theme.palette.text.primary, 0.1)
      : alpha(theme.palette.background.paper, 0.78);
  return {
    '&:active': {
      color: 'text.primary',
      bgcolor: activeBg,
      borderColor: border,
      boxShadow: 'none',
      '--variant-textBg': activeBg,
    },
    // Mouse click leaves :focus without :focus-visible; reset vars so chip matches initial surface.
    '&:focus:not(:focus-visible)': {
      color: 'text.primary',
      bgcolor: fill,
      borderColor: border,
      boxShadow: 'none',
      outline: 'none',
      '--variant-textBg': fill,
      '--variant-textColor': theme.palette.text.primary,
    },
    '&:focus-visible': {
      color: 'text.primary',
      bgcolor: fill,
      borderColor: border,
      boxShadow: 'none',
      outline: `2px solid ${alpha(theme.palette.primary.main, 0.35)}`,
      outlineOffset: 2,
      '--variant-textBg': fill,
      '--variant-textColor': theme.palette.text.primary,
    },
  };
}

/**
 * `Button` sx — map filter row, list hub filters, profile tabs, map sheet sort toggles.
 * Use `color="inherit"` on the `Button` so MUI’s default primary text styles don’t stick after toggle.
 * MUI v7 `variant="text"` uses `background-color: var(--variant-textBg)`; we set those vars so
 * selected/unselected/hover states don’t leave the wrong fill after toggling.
 */
export function scrollableChipPillButtonSx(theme, { selected = false } = {}) {
  const { fill, border } = scrollableChipPillSurface(theme);
  return {
    ...scrollableChipPillCoreSx(theme, { selected }),
    ...(selected
      ? {
          '--variant-textBg': theme.palette.primary.main,
          '--variant-textColor': SCROLLABLE_CHIP_SELECTED_TEXT,
        }
      : {
          '--variant-textBg': fill,
          '--variant-textColor': theme.palette.text.primary,
        }),
    flexShrink: 0,
    px: 1.25,
    py: 0.65,
    minHeight: SCROLLABLE_CHIP_PILL_MIN_HEIGHT,
    minWidth: 'auto',
    maxWidth: 'none',
    gap: 0.25,
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation',
    '& .MuiButton-startIcon': {
      marginRight: theme.spacing(0.5),
      marginLeft: theme.spacing(-0.25),
    },
    ...pillButtonHoverSx(theme, selected),
    ...pillButtonActiveAndFocusSx(theme, selected, fill, border),
    '&.Mui-disabled': {
      opacity: 0.48,
      color: 'text.disabled',
      borderColor: border,
      bgcolor: fill,
      boxShadow: 'none',
      '--variant-textBg': fill,
    },
  };
}

/** Styles for `ScrollableChipSelect` — MUI `Tabs` as a scrollable chip strip (no ink bar). */
export function scrollableChipSelectStyles(theme) {
  const { fill, border } = scrollableChipPillSurface(theme);

  return {
    minHeight: SCROLLABLE_CHIP_PILL_MIN_HEIGHT,
    '& .MuiTabs-scroller': scrollableChipStripScrollerSx,
    '& .MuiTabs-flexContainer': {
      gap: 1,
      alignItems: 'center',
    },
    '& .MuiTabs-indicator': { display: 'none' },
    '& .MuiTabs-scrollButtons': {
      width: 36,
      flexShrink: 0,
      '&.Mui-disabled': { opacity: 0.35 },
    },
    '& .MuiTab-root': {
      flexShrink: 0,
      fontWeight: 800,
      fontSize: '0.75rem',
      lineHeight: 1.2,
      px: 1.25,
      py: 0.65,
      minHeight: SCROLLABLE_CHIP_PILL_MIN_HEIGHT,
      borderRadius: SCROLLABLE_CHIP_PILL_BORDER_RADIUS,
      textTransform: 'none',
      minWidth: { xs: 'auto', sm: 'auto' },
      maxWidth: 'none',
      whiteSpace: 'nowrap',
      gap: 0.25,
      color: 'text.primary',
      '& > .MuiTab-icon': {
        marginRight: theme.spacing(0.5),
      },
      bgcolor: fill,
      border: `1px solid ${border}`,
      opacity: 1,
      transition: theme.transitions.create(
        ['background-color', 'color', 'box-shadow', 'border-color'],
        {
          duration: theme.transitions.duration.shortest,
        }
      ),
      '&.Mui-selected': {
        color: SCROLLABLE_CHIP_SELECTED_TEXT,
        bgcolor: 'primary.main',
        borderColor: 'primary.main',
        boxShadow: theme.customShadows.chipGlow,
      },
      '&:hover': {
        bgcolor:
          theme.palette.mode === 'light'
            ? alpha(theme.palette.text.primary, 0.05)
            : alpha(theme.palette.background.paper, 0.62),
        '&.Mui-selected': {
          bgcolor: 'primary.dark',
          borderColor: 'primary.dark',
          color: SCROLLABLE_CHIP_SELECTED_TEXT,
        },
      },
      '&.Mui-disabled': {
        opacity: 0.48,
        color: 'text.disabled',
      },
    },
  };
}

/** ScrollableChipSelect — pill-style segmented control on MUI `Tabs`. */
function ScrollableChipSelect({ value, onChange, 'aria-label': ariaLabel, children, sx }) {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  let sxList = [];
  if (sx) {
    sxList = Array.isArray(sx) ? sx : [sx];
  }

  return (
    <Tabs
      value={value}
      onChange={onChange}
      variant="scrollable"
      scrollButtons={isSmallScreen ? false : 'auto'}
      allowScrollButtonsMobile={false}
      aria-label={ariaLabel}
      sx={[scrollableChipSelectStyles(theme), ...sxList]}
    >
      {children}
    </Tabs>
  );
}

ScrollableChipSelect.displayName = 'ScrollableChipSelect';

export default ScrollableChipSelect;

ScrollableChipSelect.propTypes = {
  value: PropTypes.any,
  onChange: PropTypes.func,
  'aria-label': PropTypes.string.isRequired,
  children: PropTypes.node,
  sx: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};
