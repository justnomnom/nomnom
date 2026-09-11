import { readableAccent } from '../../readable-accent';

// ----------------------------------------------------------------------

/**
 * Terracotta as Typography text on parchment uses the readable step,
 * matching MuiLink. Fill terracotta stays on contained buttons.
 */
export function typography(theme) {
  return {
    MuiTypography: {
      styleOverrides: {
        root: ({ ownerState }) => ({
          ...(ownerState.color === 'primary' && {
            color: readableAccent(theme),
          }),
        }),
        paragraph: {
          marginBottom: theme.spacing(2),
        },
        gutterBottom: {
          marginBottom: theme.spacing(1),
        },
      },
    },
  };
}
