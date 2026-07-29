'use client';

import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { TOUCH_TARGET_SIZE } from 'src/theme/spacing';

import SheetGrabBar from './sheet-grab-bar';

// ----------------------------------------------------------------------

/**
 * Centered grab pill + vertical spacing used under every mobile bottom sheet.
 */
export function SheetGrabBarRail({ sx, size = 'sm' }) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        width: 1,
        flexShrink: 0,
        pt: 1,
        pb: 0.75,
        touchAction: 'none',
        ...sx,
      }}
    >
      <SheetGrabBar size={size} />
    </Box>
  );
}

SheetGrabBarRail.propTypes = {
  sx: PropTypes.object,
  size: PropTypes.oneOf(['sm', 'md']),
};

/**
 * Title row aligned with sheet body padding (title + trailing control).
 */
export function SheetHeaderRow({ title, endAction, sx }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      gap={1}
      sx={{
        px: 2,
        pb: 1.5,
        minHeight: TOUCH_TARGET_SIZE,
        ...sx,
      }}
    >
      {typeof title === 'string' ? (
        <Typography
          variant="subtitle1"
          component="h2"
          sx={{ fontWeight: 800, flex: 1, minWidth: 0, lineHeight: 1.3, m: 0 }}
        >
          {title}
        </Typography>
      ) : (
        <Box sx={{ flex: 1, minWidth: 0 }}>{title}</Box>
      )}
      {endAction ? <Box sx={{ flexShrink: 0, ml: 0.5 }}>{endAction}</Box> : null}
    </Stack>
  );
}

SheetHeaderRow.propTypes = {
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  endAction: PropTypes.node,
  sx: PropTypes.object,
};
