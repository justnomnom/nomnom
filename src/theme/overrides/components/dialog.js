// ----------------------------------------------------------------------

export function dialog(theme) {
  const r = theme.shape.borderRadius;

  return {
    MuiDialog: {
      styleOverrides: {
        // Default MUI modal (1300); must clear fixed dashboard bottom nav (1090) or dialogs feel “dead” on phones.
        root: {
          zIndex: theme.zIndex.modal,
        },
        paper: ({ ownerState }) => ({
          backgroundColor: theme.palette.background.paper,
          boxShadow: theme.customShadows.dialog,
          borderRadius: r * 2.5,
          ...(theme.palette.mode === 'light' && {
            border: `2px solid ${theme.palette.grey[300]}`,
          }),
          ...(!ownerState.fullScreen && {
            margin: theme.spacing(2),
          }),
        }),
        paperFullScreen: {
          borderRadius: 0,
          border: 'none',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          padding: theme.spacing(3),
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: theme.spacing(0, 3),
        },
        dividers: {
          borderTop: 0,
          borderBottomStyle: 'dashed',
          paddingBottom: theme.spacing(3),
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: theme.spacing(3),
          '& > :not(:first-of-type)': {
            marginLeft: theme.spacing(1.5),
          },
          [theme.breakpoints.down('sm')]: {
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: theme.spacing(1),
            '& > :not(:first-of-type)': {
              marginLeft: 0,
            },
            '& .MuiButton-root': {
              width: '100%',
              marginLeft: '0 !important',
            },
          },
        },
      },
    },
  };
}
