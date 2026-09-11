import { tabClasses } from '@mui/material/Tab';

import { readableAccent } from '../../readable-accent';

// ----------------------------------------------------------------------

/** Selected tab labels are terracotta-as-text; the indicator bar stays fill terracotta. */
export function tabs(theme) {
  return {
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: theme.palette.primary.main,
        },
        scrollButtons: {
          width: 48,
          borderRadius: '50%',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          padding: 0,
          opacity: 1,
          minWidth: 48,
          minHeight: 48,
          fontWeight: theme.typography.fontWeightSemiBold,
          '&:not(:last-of-type)': {
            marginRight: theme.spacing(3),
            [theme.breakpoints.up('sm')]: {
              marginRight: theme.spacing(5),
            },
          },
          [`&.${tabClasses.selected}`]: {
            color: readableAccent(theme),
          },
          [`&:not(.${tabClasses.selected})`]: {
            color: theme.palette.text.secondary,
          },
        },
      },
    },
  };
}
