'use client';

import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Drawer from '@mui/material/Drawer';
import TextField from '@mui/material/TextField';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';

import { muiFullscreenPortalContainerProps } from 'src/utils/mui-fullscreen-portal';

import { Z_INDEX } from 'src/theme/spacing';
import { useTranslate } from 'src/locales/use-locales';

import {
  SheetHeaderRow,
  SheetGrabBarRail,
  sheetDragHandleProps,
  SheetCloseIconButton,
  sheetStackedCancelOutlinedSx,
  mobileBottomSheetDrawerPaperSx,
  SwipeDismissBottomSheetContent,
  sheetStackedDestructiveOutlinedSx,
} from 'src/components/sheet-shell';

/**
 * DeleteDialog - A general-purpose dialog for confirming deletions
 *
 * Features:
 * - Flexible content through props
 * - Consistent styling across the application
 * - Loading state handling
 * - Responsive design
 * - Accessibility support
 * - Error handling integration
 *
 * @param {Object} props
 * @param {boolean} props.open - Whether the dialog is open
 * @param {Function} props.onClose - Function to call when dialog is closed
 * @param {Function} props.onConfirm - Function to call when deletion is confirmed
 * @param {boolean} props.isDeleting - Whether the deletion is in progress
 * @param {string} props.title - Dialog title (optional, defaults to 'common.delete')
 * @param {string} props.confirmationMessage - Confirmation message to display
 * @param {string} props.warningMessage - Warning message to display
 * @param {string} props.confirmButtonText - Text for confirm button (optional, defaults to 'common.delete')
 * @param {string} props.cancelButtonText - Text for cancel button (optional, defaults to 'common.cancel')
 * @param {ReactNode} props.children - Additional content to display (optional)
 * @param {string} props.requireConfirmationText - Text that must be typed to confirm (optional)
 * @param {string} props.confirmationInputLabel - Label for confirmation input field (optional)
 * @param {string} props.confirmationInputPlaceholder - Placeholder for confirmation input field (optional)
 * @param {Object} props.slotProps - Optional MUI Dialog `slotProps` merged with defaults (fullscreen only).
 * @param {Object} props.modalSx - Optional `sx` merged onto the modal root (Drawer or Dialog).
 */
export default function DeleteDialog({
  open,
  onClose,
  onConfirm,
  isDeleting = false,
  title,
  confirmationMessage,
  warningMessage,
  confirmButtonText,
  cancelButtonText,
  children,
  isFullscreen = false,
  requireConfirmationText,
  confirmationInputLabel,
  confirmationInputPlaceholder,
  slotProps: slotPropsProp,
  modalSx,
}) {
  const { t } = useTranslate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const closable = !isDeleting;

  const basePaperSx = {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minHeight: 0,
    ...(isFullscreen && { zIndex: Z_INDEX.fullscreenDialog }),
  };
  const consumerPaperSx = slotPropsProp?.paper?.sx;
  let consumerPaperSxList = [];
  if (Array.isArray(consumerPaperSx)) {
    consumerPaperSxList = consumerPaperSx;
  } else if (consumerPaperSx != null) {
    consumerPaperSxList = [consumerPaperSx];
  }
  const paperSxMerged = [basePaperSx, ...consumerPaperSxList];

  const mergedSlotProps = {
    ...slotPropsProp,
    paper: {
      ...(slotPropsProp?.paper ?? {}),
      sx: paperSxMerged,
    },
  };

  const [confirmationInput, setConfirmationInput] = useState('');

  const isConfirmationValid = requireConfirmationText
    ? confirmationInput.trim() === requireConfirmationText
    : true;

  const handleConfirm = () => {
    if (!isDeleting && isConfirmationValid) {
      onConfirm();
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setConfirmationInput('');
      onClose();
    }
  };

  useEffect(() => {
    if (!open) {
      setConfirmationInput('');
    }
  }, [open]);

  const closeBtn = <SheetCloseIconButton onClick={handleClose} disabled={!closable} />;

  const sheetTitle = (
    <Typography
      id="delete-dialog-title"
      variant="subtitle1"
      component="h2"
      sx={{ fontWeight: 800, flex: 1, minWidth: 0, lineHeight: 1.3, m: 0 }}
    >
      {title || t('common.delete')}
    </Typography>
  );

  const bodyStack = (
    <Stack id="delete-dialog-description" spacing={2}>
      {confirmationMessage && (
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
          {confirmationMessage}
        </Typography>
      )}
      {warningMessage && (
        <Alert
          severity="warning"
          variant="outlined"
          role="alert"
          sx={{ fontWeight: 600, '& .MuiAlert-message': { width: 1 } }}
        >
          {warningMessage}
        </Alert>
      )}
      {requireConfirmationText && (
        <TextField
          fullWidth
          label={confirmationInputLabel}
          placeholder={confirmationInputPlaceholder}
          value={confirmationInput}
          onChange={(e) => setConfirmationInput(e.target.value)}
          error={confirmationInput.trim() !== '' && !isConfirmationValid}
          helperText={
            confirmationInput.trim() !== '' && !isConfirmationValid
              ? t('deleteDialog.textDoesNotMatch')
              : ''
          }
          disabled={isDeleting}
          sx={{ mt: 2 }}
        />
      )}
      {children}
    </Stack>
  );

  const footerActions = (
    <Stack spacing={2} sx={{ width: 1 }}>
      <Button
        type="button"
        variant="outlined"
        fullWidth
        size="large"
        onClick={handleClose}
        disabled={isDeleting}
        sx={sheetStackedCancelOutlinedSx}
      >
        {cancelButtonText || t('common.cancel')}
      </Button>
      <Button
        type="button"
        data-testid="e2e-delete-confirm"
        color="error"
        variant="outlined"
        fullWidth
        size="large"
        onClick={handleConfirm}
        disabled={isDeleting || !isConfirmationValid}
        sx={sheetStackedDestructiveOutlinedSx}
      >
        {isDeleting ? (
          <CircularProgress size={20} color="inherit" />
        ) : (
          confirmButtonText || t('common.delete')
        )}
      </Button>
    </Stack>
  );

  const sheetBody = (
    <Stack spacing={2.5} sx={{ pt: 0.5 }}>
      {bodyStack}
      {footerActions}
    </Stack>
  );

  /** Same responsive shell as `SaveToListSheet`: bottom `Drawer` on small screens, `Dialog` on desktop. */
  if (!isFullscreen) {
    if (isMobile) {
      return (
        <Drawer
          anchor="bottom"
          elevation={0}
          open={open}
          onClose={() => {
            if (isDeleting) return;
            handleClose();
          }}
          ModalProps={{
            keepMounted: false,
            disableEscapeKeyDown: isDeleting,
          }}
          sx={modalSx}
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-description"
          PaperProps={{
            sx: mobileBottomSheetDrawerPaperSx,
            role: 'dialog',
            'aria-modal': true,
            'aria-labelledby': 'delete-dialog-title',
            'aria-describedby': 'delete-dialog-description',
          }}
        >
          <SwipeDismissBottomSheetContent
            onClose={handleClose}
            disabled={isDeleting}
            chrome={
              <>
                <Box {...sheetDragHandleProps()}>
                  <SheetGrabBarRail />
                </Box>
                <SheetHeaderRow title={sheetTitle} endAction={closeBtn} />
              </>
            }
          >
            <Box sx={{ px: 2, pb: 3 }}>{sheetBody}</Box>
          </SwipeDismissBottomSheetContent>
        </Drawer>
      );
    }

    return (
      <Dialog
        open={open}
        onClose={() => {
          if (isDeleting) return;
          handleClose();
        }}
        maxWidth="sm"
        fullWidth
        keepMounted={false}
        disableEscapeKeyDown={isDeleting}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
        sx={{ '& .MuiDialog-paper': { m: 2 }, ...modalSx }}
      >
        <SheetHeaderRow title={sheetTitle} endAction={closeBtn} sx={{ px: 3, pt: 2.5, pb: 1 }} />
        <Box sx={{ px: 3, pb: 3 }}>{sheetBody}</Box>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isFullscreen}
      keepMounted={false}
      disableEscapeKeyDown={isDeleting}
      disablePortal={isFullscreen}
      {...muiFullscreenPortalContainerProps(isFullscreen)}
      slotProps={mergedSlotProps}
      sx={{
        ...(isFullscreen && {
          zIndex: Z_INDEX.fullscreenDialog,
          '& .MuiBackdrop-root': {
            zIndex: Z_INDEX.fullscreenContent,
          },
        }),
        ...modalSx,
      }}
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-dialog-description"
    >
      <Box sx={{ flexShrink: 0 }}>
        <SheetHeaderRow title={sheetTitle} endAction={closeBtn} sx={{ px: 3, pt: 2.5, pb: 1 }} />
      </Box>

      <DialogContent
        sx={{
          flex: '1 1 auto',
          minHeight: 0,
          overflowY: 'auto',
          px: { xs: 2, sm: 3 },
          pt: 0.5,
          pb: 1,
        }}
      >
        {bodyStack}
      </DialogContent>

      <DialogActions
        sx={{
          flexShrink: 0,
          display: 'block',
          px: { xs: 2, sm: 3 },
          pt: 2,
          pb: { xs: 'max(16px, env(safe-area-inset-bottom))', sm: 3 },
        }}
      >
        {footerActions}
      </DialogActions>
    </Dialog>
  );
}

DeleteDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  isDeleting: PropTypes.bool,
  title: PropTypes.string,
  confirmationMessage: PropTypes.string,
  warningMessage: PropTypes.string,
  confirmButtonText: PropTypes.string,
  cancelButtonText: PropTypes.string,
  children: PropTypes.node,
  isFullscreen: PropTypes.bool,
  requireConfirmationText: PropTypes.string,
  confirmationInputLabel: PropTypes.string,
  confirmationInputPlaceholder: PropTypes.string,
  slotProps: PropTypes.object,
  modalSx: PropTypes.object,
};
