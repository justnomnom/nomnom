'use client';

import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Drawer from '@mui/material/Drawer';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

import SheetCloseIconButton from './sheet-close-icon-button';
import { SheetHeaderRow, SheetGrabBarRail } from './sheet-mobile-top';
import { mobileBottomSheetDrawerPaperSx } from './mobile-bottom-sheet-paper';
import { sheetBodyScrollSx, desktopSheetDialogPaperSx } from './sheet-dialog-scroll-sx';
import SwipeDismissBottomSheetContent, {
  sheetDragHandleProps,
} from './swipe-dismiss-bottom-sheet-content';

/**
 * Responsive sheet shell — bottom Drawer on mobile (with swipe-to-dismiss + grab bar),
 * centered Dialog on desktop. Used by pwa-install-prompt, which renders this shell
 * with its own body/footer content.
 *
 * The header has a built-in close button. Pass `title` as the rendered header content
 * (typically a Typography). Pass `children` as the body. Pass `footer` for the action stack.
 */
export default function ResponsiveSheet({
  open,
  onClose,
  titleId,
  descId,
  title,
  children,
  footer,
  maxWidth = 'xs',
  closeDisabled = false,
  drawerProps,
  mobileSheetSx,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const closeBtn = <SheetCloseIconButton onClick={onClose} disabled={closeDisabled} />;

  if (isMobile) {
    return (
      <Drawer
        anchor="bottom"
        elevation={0}
        open={open}
        onClose={onClose}
        ModalProps={{ keepMounted: false }}
        aria-labelledby={titleId}
        aria-describedby={descId}
        PaperProps={{
          sx: mobileBottomSheetDrawerPaperSx,
          role: 'dialog',
          'aria-modal': true,
          'aria-labelledby': titleId,
          'aria-describedby': descId,
        }}
        {...drawerProps}
      >
        <SwipeDismissBottomSheetContent
          onClose={onClose}
          sx={mobileSheetSx}
          chrome={
            <>
              <Box {...sheetDragHandleProps()}>
                <SheetGrabBarRail />
              </Box>
              <SheetHeaderRow title={title} endAction={closeBtn} />
            </>
          }
        >
          <Box sx={{ px: 2, pb: 3 }}>
            <Stack spacing={2.5} sx={{ pt: 0.5 }}>
              {children}
              {footer}
            </Stack>
          </Box>
        </SwipeDismissBottomSheetContent>
      </Drawer>
    );
  }

  return (
    <Dialog
      fullWidth
      maxWidth={maxWidth}
      open={open}
      onClose={onClose}
      keepMounted={false}
      aria-labelledby={titleId}
      aria-describedby={descId}
      sx={{ '& .MuiDialog-paper': desktopSheetDialogPaperSx }}
    >
      <SheetHeaderRow
        title={title}
        endAction={closeBtn}
        sx={{ flexShrink: 0, px: 3, pt: 2.5, pb: 1 }}
      />
      <Box sx={[sheetBodyScrollSx, { px: 3, pb: footer ? 2 : 3 }]}>
        <Stack spacing={2.5} sx={{ pt: 0.5 }}>
          {children}
        </Stack>
      </Box>
      {/* Actions stay pinned below the scroll region so the primary CTA is visible
          on open at short viewport heights, instead of scrolling out of view. */}
      {footer ? <Box sx={{ flexShrink: 0, px: 3, pb: 3, pt: 1 }}>{footer}</Box> : null}
    </Dialog>
  );
}

ResponsiveSheet.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  titleId: PropTypes.string.isRequired,
  descId: PropTypes.string,
  title: PropTypes.node.isRequired,
  children: PropTypes.node,
  footer: PropTypes.node,
  maxWidth: PropTypes.string,
  closeDisabled: PropTypes.bool,
  drawerProps: PropTypes.object,
  mobileSheetSx: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};
