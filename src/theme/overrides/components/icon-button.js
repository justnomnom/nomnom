// ----------------------------------------------------------------------

/**
 * IconButton ships hover background via MUI; some mobile UAs still leave `:hover` latched after tap.
 * Clear hover paint on coarse pointers (touch); fine-pointer hover gets a subtle lift.
 */
export function iconButton() {
  return {
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition:
            'transform 180ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 180ms cubic-bezier(0.16, 1, 0.3, 1), background-color 150ms ease',
          '@media (hover: hover) and (pointer: fine)': {
            '&:hover:not(:disabled)': {
              transform: 'translateY(-1px)',
            },
          },
          '@media (pointer: coarse)': {
            '&:hover': {
              backgroundColor: 'transparent',
            },
          },
          '@media (prefers-reduced-motion: reduce)': {
            transition: 'background-color 150ms ease',
            '&:hover:not(:disabled)': {
              transform: 'none',
            },
          },
        },
      },
    },
  };
}
