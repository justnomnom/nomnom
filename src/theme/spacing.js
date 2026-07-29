// Semantic spacing, radius, and touch-target tokens.
// Values are MUI spacing multipliers (8px base): SPACE.md === theme.spacing(2) === 16px.
// Use these instead of inventing fractional values like 1.75 / 2.25 / 2.75.

export const SPACE = {
  xxs: 0.5, // 4px  — icon-to-label, chip padding
  xs: 1, //    8px  — tight grouping within a row
  sm: 1.5, //  12px — related elements, list row internals
  md: 2, //    16px — card padding, default form gap
  lg: 3, //    24px — between groups inside a section
  xl: 4, //    32px — between sections on dense surfaces
  '2xl': 6, // 48px — between sections on marketing pages
  section: 8, // 64px — top-level page section breaks
};

// Step pattern for vertical rhythm inside long-form content (wizard steps, settings hubs).
// Pick ONE of these per surface; do not mix.
export const STEP_RHYTHM = {
  cozy: { xs: SPACE.lg, sm: SPACE.xl }, //   24 → 32
  spacious: { xs: SPACE.xl, sm: SPACE['2xl'] }, // 32 → 48
};

// Header toolbars (main + dashboard) share this gap.
export const HEADER_GAP_SX = { xs: SPACE.xxs, sm: SPACE.xs };

// Minimum hit target. Apply to every icon-button or pill in a header / nav bar.
export const TOUCH_TARGET_SIZE = 44;
export const touchTargetSx = {
  minWidth: TOUCH_TARGET_SIZE,
  minHeight: TOUCH_TARGET_SIZE,
};

// Border radius tiers. Use named tokens instead of raw 8/16/24/9999.
// Mirrors theme.shape.borderRadius (= RADIUS.base) for parity.
export const RADIUS = {
  tight: 8,
  base: 16,
  loose: 24,
  pill: 9999,
};

// Apply to numeric labels (ratings, follower counts, list sizes, table cells).
// Locks every digit to the same advance width so values don't reflow as they change.
export const tabularNumsSx = {
  fontVariantNumeric: 'tabular-nums',
  fontFeatureSettings: '"tnum"',
};

// Stacking tiers — single source of truth. Centralized so scrim/sheet/dialog/modal
// stacking is deterministic instead of a `9999`-vs-`10000` arms race.
// MUI defaults for reference: appBar 1100, drawer 1200, modal 1300, snackbar 1400, tooltip 1500.
export const Z_INDEX = {
  // Below the AppBar — used by dashboard chrome that should scroll under the bar.
  belowAppBar: 1040,
  // Mobile bottom navigation + mobile bottom sheets (sit just under the AppBar).
  mobileBottomNav: 1088,
  mobileBottomSheet: 1088,
  // Promoted overlays that should sit above standard chrome but below modals.
  dashboardBottomNav: 1090,
  navRailToggle: 1100,
  // Search typeahead / suggestions Popper — sits at MUI's menu/popover band so it
  // clears the AppBar (1100) and drawers (1200) without escalating into fullscreen range.
  searchTypeahead: 1300,
  // Always-on-top progress / route-change indicators.
  scrollProgress: 1999,
  splashScreen: 9998,
  routeProgress: 9999,
  // Fullscreen takeovers (e.g. fullscreen dialog backdrop + content). Reserve 10000+
  // strictly for things that must beat tooltips and snackbars.
  fullscreenBackdrop: 10000,
  fullscreenContent: 10001,
  fullscreenDialog: 10002,
};
