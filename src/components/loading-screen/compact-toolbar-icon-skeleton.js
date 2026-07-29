'use client';

import Skeleton from 'react-loading-skeleton';

import Box from '@mui/material/Box';

import { TOUCH_MIN, SHELL_TOOLBAR_ICON } from 'src/sections/profile/view/settings-shell-shared';

// ----------------------------------------------------------------------

/** Placeholder for compact toolbar `IconButton` (44px target, ~20px glyph). */
export default function CompactToolbarIconSkeleton() {
  return (
    <Box
      sx={{
        width: TOUCH_MIN,
        height: TOUCH_MIN,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Skeleton width={SHELL_TOOLBAR_ICON} height={SHELL_TOOLBAR_ICON} borderRadius={5} />
    </Box>
  );
}
