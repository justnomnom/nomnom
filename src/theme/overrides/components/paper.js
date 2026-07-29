// ----------------------------------------------------------------------

export function paper(theme) {
  return {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          ...(theme.palette.mode === 'dark'
            ? {
                backgroundColor: theme.palette.paper.background,
                border: `1px solid ${theme.palette.paper.border}`,
              }
            : {
                backgroundColor: theme.palette.background.paper,
              }),
        },
        outlined: {
          borderWidth: 2,
          borderColor:
            theme.palette.mode === 'dark' ? theme.palette.paper.border : theme.palette.grey[300],
          boxShadow: 'none',
        },
      },
    },
  };
}
