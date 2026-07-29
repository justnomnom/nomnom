// ----------------------------------------------------------------------

/**
 * Default ListItemButton uses hover background; touch can leave `:hover` stuck.
 * Neutralize hover fill on coarse pointers while preserving selected-row hover fill.
 */
export function listItemButton(theme) {
  return {
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '@media (pointer: coarse)': {
            '&:hover': {
              backgroundColor: 'transparent',
            },
            '&.Mui-selected:hover': {
              backgroundColor: theme.palette.action.selected,
            },
          },
        },
      },
    },
  };
}
