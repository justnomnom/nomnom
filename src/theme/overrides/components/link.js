import { readableAccent } from '../../readable-accent';

// ----------------------------------------------------------------------

/**
 * Terracotta as link text on parchment must use the readable step
 * (`primary.darker` in light). Fill terracotta stays on contained buttons.
 */
export function link(theme) {
  return {
    MuiLink: {
      styleOverrides: {
        root: ({ ownerState }) => ({
          ...(ownerState.color === 'primary' && {
            color: readableAccent(theme),
          }),
        }),
      },
    },
  };
}
