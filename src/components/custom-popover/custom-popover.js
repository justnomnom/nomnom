import PropTypes from 'prop-types';

import Popover from '@mui/material/Popover';
import { menuItemClasses } from '@mui/material/MenuItem';

import { muiFullscreenPortalContainerProps } from 'src/utils/mui-fullscreen-portal';

import { getPosition } from './utils';
import { StyledArrow } from './styles';

// ----------------------------------------------------------------------

export default function CustomPopover({
  open,
  children,
  arrow = 'top-right',
  hiddenArrow,
  sx,
  isFullscreen = false,
  ...other
}) {
  const { style, anchorOrigin, transformOrigin } = getPosition(arrow);

  return (
    <Popover
      open={Boolean(open)}
      anchorEl={open}
      anchorOrigin={anchorOrigin}
      transformOrigin={transformOrigin}
      disablePortal={isFullscreen}
      {...muiFullscreenPortalContainerProps(isFullscreen)}
      slotProps={{
        paper: {
          sx: {
            width: 'auto',
            overflow: 'inherit',
            ...style,
            zIndex: isFullscreen ? 10004 : undefined,
            [`& .${menuItemClasses.root}`]: {
              '& svg': {
                mr: 2,
                flexShrink: 0,
              },
            },
            ...sx,
          },
        },
      }}
      {...other}
    >
      {!hiddenArrow && <StyledArrow arrow={arrow} />}

      {children}
    </Popover>
  );
}

CustomPopover.propTypes = {
  sx: PropTypes.object,
  open: PropTypes.object,
  children: PropTypes.node,
  hiddenArrow: PropTypes.bool,
  disabledArrow: PropTypes.bool,
  isFullscreen: PropTypes.bool,
  arrow: PropTypes.oneOf([
    'top-left',
    'top-center',
    'top-right',
    'bottom-left',
    'bottom-center',
    'bottom-right',
    'left-top',
    'left-center',
    'left-bottom',
    'right-top',
    'right-center',
    'right-bottom',
  ]),
};
