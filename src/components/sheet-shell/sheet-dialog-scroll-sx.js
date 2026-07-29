import { alpha } from '@mui/material/styles';

/**
 * Desktop Dialog paper: flex column + clipped overflow so only the body scrolls
 * (header stays pinned). Caps height against the viewport on medium screens.
 */
export const desktopSheetDialogPaperSx = {
  m: 2,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  maxHeight: 'min(92dvh, calc(100% - 32px))',
};

/**
 * Thin, low-contrast scrollbar for sheet body regions — avoids the thick OS bar
 * on Windows medium/desktop dialogs while keeping scroll discoverable.
 * @param {import('@mui/material/styles').Theme} theme
 */
export function sheetBodyScrollSx(theme) {
  const thumb = alpha(theme.palette.grey[500], 0.4);
  const thumbHover = alpha(theme.palette.grey[500], 0.64);

  return {
    flex: '1 1 auto',
    minHeight: 0,
    overflowY: 'auto',
    overflowX: 'hidden',
    overscrollBehavior: 'contain',
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'thin',
    scrollbarColor: `${thumb} transparent`,
    '&::-webkit-scrollbar': {
      width: 6,
    },
    '&::-webkit-scrollbar-track': {
      background: 'transparent',
    },
    '&::-webkit-scrollbar-thumb': {
      borderRadius: 8,
      backgroundColor: thumb,
    },
    '&::-webkit-scrollbar-thumb:hover': {
      backgroundColor: thumbHover,
    },
  };
}
