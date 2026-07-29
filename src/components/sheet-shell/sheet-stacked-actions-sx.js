import { alpha } from '@mui/material/styles';

/**
 * Full-width stacked footer actions for bottom sheets and sheet-style dialogs.
 * Matches `SaveToListSheet` (pill shape, large type, primary glow on contained).
 */
export const sheetStackedActionButtonBaseSx = {
  py: 2,
  borderRadius: '32px',
  fontWeight: 700,
  fontSize: '1.125rem',
  textTransform: 'none',
};

/** Outlined neutral cancel / secondary action. */
export const sheetStackedCancelOutlinedSx = {
  ...sheetStackedActionButtonBaseSx,
  borderColor: 'divider',
  borderWidth: 1,
  color: 'text.primary',
  '&:hover': {
    borderColor: (tt) => alpha(tt.palette.primary.main, 0.35),
    bgcolor: (tt) => alpha(tt.palette.primary.main, 0.04),
  },
};

/** Outlined destructive (e.g. delete) before cancel/submit in a sheet form. */
export const sheetStackedDestructiveOutlinedSx = {
  ...sheetStackedActionButtonBaseSx,
  borderColor: (tt) => alpha(tt.palette.error.main, 0.45),
  color: 'error.main',
  '&:hover': {
    borderColor: 'error.main',
    bgcolor: (tt) => alpha(tt.palette.error.main, 0.08),
  },
};

/**
 * @param {'primary' | 'error'} paletteKey
 * @returns {object} sx for contained submit / confirm
 */
export function sheetStackedContainedGlowSx(paletteKey = 'primary') {
  return {
    ...sheetStackedActionButtonBaseSx,
    boxShadow: (tt) => `0 20px 40px -12px ${alpha(tt.palette[paletteKey].main, 0.45)}`,
  };
}
