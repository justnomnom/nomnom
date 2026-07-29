import { alpha } from '@mui/material/styles';

// ----------------------------------------------------------------------

export function appBar(theme) {
  return {
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          borderBottom: `1px solid ${theme.palette.divider}`,
          /* Solid-tint bar reads warmer/editorial and avoids generic “glass” chrome */
          backgroundColor: alpha(theme.palette.background.default, 0.94),
        },
      },
    },
  };
}
