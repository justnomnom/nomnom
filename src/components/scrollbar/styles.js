import SimpleBar from 'simplebar-react';

import { styled } from '@mui/material/styles';

// ----------------------------------------------------------------------

export const StyledRootScrollbar = styled('div')(() => ({
  flexGrow: 1,
  height: '100%',
  overflow: 'hidden',
}));

export const StyledScrollbar = styled(SimpleBar)(() => ({
  maxHeight: '100%',
  '& .simplebar-mask': {
    zIndex: 'inherit',
  },
}));
