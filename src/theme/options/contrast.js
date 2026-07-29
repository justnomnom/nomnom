import { grey } from '../palette';
import { customShadows } from '../custom-shadows';

// ----------------------------------------------------------------------

/**
 * Contrast options merged into the base palette.
 * Only overrides `background.default` — nested keys must be deep-merged in
 * ThemeProvider so `paper` / `neutral` (and other custom tokens) stay intact.
 */
export function createContrast(contrast, mode) {
  const theme = {
    ...(contrast === 'bold' &&
      mode === 'light' && {
        palette: {
          background: {
            default: grey[200],
          },
        },
      }),
  };

  const components = {
    ...(contrast === 'bold' && {
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow: customShadows(mode).z1,
          },
        },
      },
    }),
  };

  return {
    ...theme,
    components,
  };
}
