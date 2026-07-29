/**
 * Top corners for swipe-dismiss sheets — matches the map bottom **glass** shell
 * (`map-view`: xs `16px`, sm+ `2.5rem`), not the inner `RestaurantDetailView` card
 * (`32px`), so Save / delete sheets don’t read as “more pill” than the map sheet edge.
 */
export const mobileBottomSheetTopCorners = {
  xs: '16px 16px 0 0',
  sm: '2.5rem 2.5rem 0 0',
};

/**
 * Shared `PaperProps.sx` for MUI `Drawer anchor="bottom"` sheets.
 * Paper stays transparent so `SwipeDismissBottomSheetContent` can own the visible card:
 * when the sheet is pulled down, the transform moves the whole surface (no empty white strip).
 * Corner radius + safe-area padding live on the swipe-dismiss root.
 */
export const mobileBottomSheetDrawerPaperSx = {
  bgcolor: 'transparent',
  backgroundImage: 'none',
  boxShadow: 'none',
  /**
   * Drawer `Paper` defaults to `overflowY: auto`, which clips translated children during
   * pull-to-dismiss — the sheet looks “stuck” while the backdrop moves. Map sheets use a
   * plain `Box` without this clip.
   */
  overflow: 'visible',
  overflowX: 'visible',
  overflowY: 'visible',
};

/**
 * Dialog `slotProps.paper.sx` for slide-up mobile bottom sheets (e.g. confirm dialogs).
 */
export const mobileBottomSheetDialogPaperSx = {
  m: 0,
  width: '100%',
  maxWidth: '100%',
  borderRadius: mobileBottomSheetTopCorners,
  maxHeight: 'min(92dvh, calc(100dvh - env(safe-area-inset-top, 0px)))',
  pb: 'max(4px, env(safe-area-inset-bottom, 0px))',
};

/**
 * Merge helper for temporary left/right `Drawer` papers (width, padding, etc.).
 * Prefer `pb: 'max(<content-padding>, env(safe-area-inset-bottom, 0px))'` for notched phones.
 * @param {object} sx
 */
export function sideDrawerPaperSx(sx = {}) {
  return {
    boxSizing: 'border-box',
    ...sx,
  };
}
