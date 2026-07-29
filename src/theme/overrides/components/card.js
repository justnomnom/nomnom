// ----------------------------------------------------------------------

export function card(theme) {
  const r = theme.shape.borderRadius;

  return {
    MuiCard: {
      styleOverrides: {
        root: {
          position: 'relative',
          boxShadow: theme.customShadows.card,
          borderRadius: r * 2,
          zIndex: 0,
          ...(theme.palette.mode === 'light' && {
            border: `2px solid ${theme.palette.grey[300]}`,
            backgroundColor: theme.palette.background.paper,
          }),
          ...(theme.palette.mode === 'dark' && {
            backgroundColor: theme.palette.card.background,
            border: `1px solid ${theme.palette.card.border}`,
          }),
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: {
          padding: theme.spacing(3, 3, 0),
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: theme.spacing(3),
        },
      },
    },
  };
}
