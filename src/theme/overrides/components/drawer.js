import { alpha } from '@mui/material/styles';
import { drawerClasses } from '@mui/material/Drawer';

import { paper } from '../../css';

// ----------------------------------------------------------------------

export function drawer(theme) {
  const lightMode = theme.palette.mode === 'light';

  return {
    MuiDrawer: {
      styleOverrides: {
        root: ({ ownerState }) => ({
          ...(ownerState.variant === 'temporary' && {
            [`& .${drawerClasses.paper}`]: {
              ...paper({ theme }),
              ...(ownerState.anchor === 'left' && {
                boxShadow: `24px 0 48px -12px ${alpha(
                  lightMode ? theme.palette.grey[900] : theme.palette.common.black,
                  lightMode ? 0.12 : 0.35
                )}`,
              }),
              ...(ownerState.anchor === 'right' && {
                boxShadow: `-24px 0 48px -12px ${alpha(
                  lightMode ? theme.palette.grey[900] : theme.palette.common.black,
                  lightMode ? 0.12 : 0.35
                )}`,
              }),
              ...(ownerState.anchor === 'bottom' && {
                /**
                 * `paper()` above applies a solid paper background — that paints a full-width layer
                 * behind `SwipeDismissBottomSheetContent`, so the rounded inner “card” looks like it
                 * slides under a second square sheet. Map bottom sheets use a non-Drawer surface.
                 * The real card (radius, shadow, bg) lives on SwipeDismissBottomSheetContent only.
                 */
                backgroundColor: 'transparent',
                backgroundImage: 'none',
                boxShadow: 'none',
                borderRadius: 0,
                overflow: 'visible',
                overflowX: 'visible',
                overflowY: 'visible',
              }),
            },
          }),
        }),
      },
    },
  };
}
