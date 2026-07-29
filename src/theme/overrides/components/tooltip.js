// ----------------------------------------------------------------------

export function tooltip(theme) {
  const lightMode = theme.palette.mode === 'light';

  return {
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: theme.palette.grey[lightMode ? 900 : 700],
          color: theme.palette.common.white,
          borderRadius: theme.shape.borderRadius,
          boxShadow: theme.customShadows.z8,
        },
        arrow: {
          color: theme.palette.grey[lightMode ? 900 : 700],
        },
      },
    },
  };
}
