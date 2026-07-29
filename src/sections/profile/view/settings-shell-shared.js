import { alpha } from '@mui/material/styles';

import { RADIUS, TOUCH_TARGET_SIZE } from 'src/theme/spacing';

// ----------------------------------------------------------------------

/**
 * Card radius used across settings hub + drill pages (export-html/settings).
 * Derived from `RADIUS.loose` (24px) — kept as a string here because consumers
 * pass it into CSS-value contexts (`borderRadius: ROUNDED_CARD`).
 */
export const ROUNDED_CARD = `${RADIUS.loose}px`;

/** Comfortable minimum tap target on mobile — sourced from theme `TOUCH_TARGET_SIZE`. */
export const TOUCH_MIN = TOUCH_TARGET_SIZE;

/** Full-width hub / settings list rows — DESIGN.md § Settings Rows (64px). */
export const HUB_ROW_MIN_HEIGHT = 64;

/** Trailing toolbar slot: keeps centered titles stable when actions swap label ↔ spinner or vary by locale. */
export const SETTINGS_DRILL_END_ADORNMENT_SLOT_MIN_WIDTH = 120;

export const ICON_TILE = 44;

/** Back / toolbar action glyphs (IconButton still uses TOUCH_MIN for hit area). */
export const SHELL_TOOLBAR_ICON = 20;

/** Horizontal inset for Save (text or spinner): matches back `IconButton` — centered `SHELL_TOOLBAR_ICON` in `TOUCH_MIN`. */
export const SETTINGS_DRILL_END_ACTION_PAD_X = (TOUCH_MIN - SHELL_TOOLBAR_ICON) / 2;

/** Hub list tiles, row chevrons, card row icons */
export const SHELL_HUB_ICON = 18;

/**
 * Horizontal padding for `SettingsPageContainer` (dashboard drill routes).
 * Keep route `loading.js` skeletons and full-bleed strips aligned with this at every breakpoint.
 */
export const SETTINGS_PAGE_GUTTER_PX = { xs: 2, sm: 3, lg: 4 };

/**
 * Full-bleed strip inside `SettingsDrillShell`: cancels container gutters, reapplies the same padding
 * so content lines up with the sticky toolbar (e.g. `Tabs`, `ScrollableChipRow`).
 */
export const settingsDrillFullBleedStripSx = {
  mx: { xs: -2, sm: -3, lg: -4 },
  px: SETTINGS_PAGE_GUTTER_PX,
};

/**
 * Second-layer horizontal inset for narrow profile column (`UserPublicProfileView` hero + lists).
 */
export const PROFILE_SECTION_INSET_PX = { xs: 2, sm: 3 };

/** `sx` spread for profile sections — pairs with `SettingsPageContainer` outer padding. */
export const profileSectionInsetSx = { px: PROFILE_SECTION_INSET_PX };

/**
 * Dashboard vertical rhythm (MUI spacing units, 8px base).
 * Tight = related siblings; block = subsection; section = major page bands.
 */
export const DASHBOARD_SPACE_TIGHT = 1;
export const DASHBOARD_SPACE_BLOCK = 2;
export const DASHBOARD_SPACE_SECTION = 4;

/** Standard drill-page body inset below sticky toolbar (Discover, Lists, Feedback, …). */
export const dashboardPageRootSx = {
  position: 'relative',
  pt: { xs: 2, md: 2.5 },
  pb: {
    xs: 'max(48px, calc(24px + env(safe-area-inset-bottom, 0px)))',
    md: 3,
    lg: 4,
  },
};

/** Primary vertical stack for dashboard pages — generous separation between bands. */
export const dashboardPageSectionStackProps = {
  spacing: { xs: DASHBOARD_SPACE_SECTION, sm: DASHBOARD_SPACE_SECTION },
};

/** Within a band: heading, controls, and content stay grouped. */
export const dashboardSubsectionStackProps = {
  spacing: DASHBOARD_SPACE_BLOCK,
};

export {
  mobileStretchButtonSx as dashboardMobileStretchButtonSx,
  dialogActionsMobileSx as dashboardDialogActionsMobileSx,
} from 'src/theme/responsive-button-sx';

/**
 * Homepage and long-form marketing bands — slightly more air on large breakpoints.
 */
export const marketingPageSectionStackProps = {
  spacing: { xs: DASHBOARD_SPACE_SECTION, sm: DASHBOARD_SPACE_SECTION, md: 5 },
};

/** Standalone contact/FAQ hero copy → primary form or CTA */
export const MARKETING_SPACE_HERO_TO_CONTENT = 10;

/** Space below legal/doc page title block before body prose */
export const marketingLegalHeaderBandSx = { mb: 6 };

// ----------------------------------------------------------------------

export function sectionLabelSx(theme) {
  return {
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: theme.palette.text.secondary,
    fontSize: '0.6875rem',
    lineHeight: 1.2,
    px: 0.5,
    display: 'block',
  };
}

/** Overline labels on feed-style dashboard pages (vibes, trending, …). */
export function dashboardSectionLabelSx(theme) {
  return sectionLabelSx(theme);
}

/** Outer “card” shell for hub rows, billing blocks, feedback iframe, etc. */
export function hubCardShellSx(theme) {
  const isDark = theme.palette.mode === 'dark';
  return {
    borderRadius: ROUNDED_CARD,
    overflow: 'hidden',
    bgcolor: isDark ? alpha(theme.palette.common.white, 0.06) : alpha(theme.palette.grey[200], 0.5),
    border: `1px solid ${alpha(theme.palette.divider, isDark ? 0.14 : 0.45)}`,
  };
}

/** Hover/active background for list rows inside hub-style cards */
export function settingsShellRowHoverBg(theme) {
  const isDark = theme.palette.mode === 'dark';
  return isDark ? alpha(theme.palette.common.white, 0.08) : theme.palette.grey[200];
}

/** Inline SVG baseline fix — keeps icons optically centered in toolbar rows */
const shellToolbarIconSvgSx = {
  lineHeight: 0,
  '& svg': { display: 'block', flexShrink: 0 },
};

/** Compact drill / profile toolbar icon buttons (transparent bg, 44px hit area) */
export function minimalIconButtonSx(theme) {
  return {
    width: TOUCH_MIN,
    height: TOUCH_MIN,
    p: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'text.primary',
    bgcolor: 'transparent',
    WebkitTapHighlightColor: 'transparent',
    ...shellToolbarIconSvgSx,
    '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.6) },
    '&:active': { bgcolor: alpha(theme.palette.action.selected, 0.4) },
  };
}

/** Filled back control used in drill shell + hub + edit (muted square/circle, 44px) */
export function filledDrillBackIconButtonSx(theme) {
  return {
    width: TOUCH_MIN,
    height: TOUCH_MIN,
    p: 0,
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    bgcolor: 'action.hover',
    color: 'text.primary',
    WebkitTapHighlightColor: 'transparent',
    ...shellToolbarIconSvgSx,
    '&:hover': { bgcolor: 'action.selected' },
    '&:active': { bgcolor: 'action.selected' },
  };
}
