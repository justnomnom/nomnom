'use client';

import PropTypes from 'prop-types';
import dynamic from 'next/dynamic';
import { useMemo, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Drawer from '@mui/material/Drawer';
import MenuItem from '@mui/material/MenuItem';
import { useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';
import useMediaQuery from '@mui/material/useMediaQuery';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { translateListCollaborationError } from 'src/utils/list-collaboration-errors';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { createList } from 'src/libs/lists/actions';
import { useAnalytics } from 'src/libs/analytics/analytics-provider';
import { useMyStripeConnectStatus } from 'src/api/stripe-connect-status';

import Iconify from 'src/components/iconify';
import {
  SheetHeaderRow,
  SheetGrabBarRail,
  sheetDragHandleProps,
  SheetCloseIconButton,
  sheetStackedContainedGlowSx,
  sheetStackedCancelOutlinedSx,
  mobileBottomSheetDrawerPaperSx,
  SwipeDismissBottomSheetContent,
} from 'src/components/sheet-shell';

const GoogleMapsImportModal = dynamic(() => import('src/sections/lists/google-maps-import-modal'), {
  ssr: false,
});

const CREATE_LIST_MODAL_TITLE_ID = 'create-list-modal-title';

export default function CreateListModal({ open, onClose, onCreated }) {
  const { t } = useTranslate();
  const { trackEvent } = useAnalytics();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const errText = useMemo(() => translateListCollaborationError(t, err), [err, t]);
  const [importOpen, setImportOpen] = useState(false);
  const { status: stripeConnectStatus, chargesEnabled } = useMyStripeConnectStatus({
    enabled: open,
  });
  const stripeChargesEnabled = stripeConnectStatus == null ? null : chargesEnabled;

  const reset = useCallback(() => {
    setName('');
    setDescription('');
    setVisibility('private');
    setErr(null);
  }, []);

  const handleClose = useCallback(() => {
    if (!busy) {
      reset();
      onClose?.();
    }
  }, [busy, onClose, reset]);

  const handleCreate = useCallback(async () => {
    setBusy(true);
    setErr(null);
    const listName = name.trim() || t('pages.lists.default_name');
    const { list, error } = await createList({
      name: listName,
      description: description.trim(),
      visibility,
    });
    setBusy(false);
    if (error || !list?.id) {
      setErr(error ?? 'failed');
      return;
    }
    trackEvent('list_created', { list_id: String(list.id), visibility });
    reset();
    onClose?.();
    if (onCreated) {
      onCreated({
        id: list.id,
        name: listName,
        description: description.trim(),
        visibility,
      });
    } else {
      router.push(paths.dashboard.listDetails(list.id));
    }
  }, [description, name, onClose, onCreated, reset, router, t, trackEvent, visibility]);

  const closeBtn = <SheetCloseIconButton onClick={handleClose} />;

  const sheetTitle = (
    <Typography
      id={CREATE_LIST_MODAL_TITLE_ID}
      variant="subtitle1"
      component="h2"
      sx={{ fontWeight: 800, flex: 1, minWidth: 0, lineHeight: 1.3, m: 0 }}
    >
      {t('pages.lists.create_title')}
    </Typography>
  );

  const form = (
    <Stack spacing={2} sx={{ pt: 0.5 }}>
      <TextField
        label={t('pages.lists.field_name')}
        value={name}
        onChange={(e) => setName(e.target.value)}
        fullWidth
        required
        inputProps={{ 'data-testid': 'e2e-create-list-name' }}
      />
      <TextField
        label={t('pages.lists.field_description')}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        fullWidth
        multiline
        minRows={2}
      />
      <TextField
        select
        label={t('pages.lists.field_visibility')}
        value={visibility}
        onChange={(e) => setVisibility(e.target.value)}
        fullWidth
        SelectProps={{
          renderValue: (v) => {
            let visIcon = ic.lockBold;
            if (v === 'public_subscribers') {
              visIcon = ic.walletMoneyLinear;
            } else if (v === 'public') {
              visIcon = ic.globeLinear;
            }
            let label = t('pages.lists.visibility_option_public_subscribers_label');
            if (v === 'private') {
              label = t('pages.lists.visibility_option_private_label');
            } else if (v === 'public') {
              label = t('pages.lists.visibility_option_public_label');
            }
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Iconify
                  icon={visIcon}
                  width={16}
                  sx={{ color: 'text.secondary', flexShrink: 0 }}
                />
                {label}
              </Box>
            );
          },
        }}
      >
        <MenuItem value="private" sx={{ alignItems: 'flex-start', py: 1.5, whiteSpace: 'normal' }}>
          <Iconify
            icon={ic.lockBold}
            width={18}
            sx={{ color: 'text.secondary', flexShrink: 0, mt: '2px', mr: 1.5 }}
          />
          <ListItemText
            primary={t('pages.lists.visibility_option_private_label')}
            secondary={t('pages.lists.visibility_option_private_description')}
            primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
            secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
          />
        </MenuItem>
        <MenuItem value="public" sx={{ alignItems: 'flex-start', py: 1.5, whiteSpace: 'normal' }}>
          <Iconify
            icon={ic.globeLinear}
            width={18}
            sx={{ color: 'text.secondary', flexShrink: 0, mt: '2px', mr: 1.5 }}
          />
          <ListItemText
            primary={t('pages.lists.visibility_option_public_label')}
            secondary={t('pages.lists.visibility_option_public_description')}
            primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
            secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
          />
        </MenuItem>
        <MenuItem
          value="public_subscribers"
          disabled={stripeChargesEnabled !== true}
          sx={{ alignItems: 'flex-start', py: 1.5, whiteSpace: 'normal' }}
        >
          <Iconify
            icon={ic.walletMoneyLinear}
            width={18}
            sx={{ color: 'text.secondary', flexShrink: 0, mt: '2px', mr: 1.5 }}
          />
          <ListItemText
            primary={t('pages.lists.visibility_option_public_subscribers_label')}
            secondary={t('pages.lists.visibility_option_public_subscribers_description')}
            primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
            secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
          />
        </MenuItem>
      </TextField>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ lineHeight: 1.45, display: 'block' }}
      >
        {t('pages.lists.create_list_manage_hint')}
      </Typography>
      {errText && (
        <Alert severity="error" variant="outlined" role="alert">
          {errText}
        </Alert>
      )}
      <Stack spacing={2} sx={{ width: 1 }}>
        <Button
          type="button"
          data-testid="e2e-create-list-submit"
          color="primary"
          variant="contained"
          fullWidth
          size="large"
          onClick={handleCreate}
          loading={busy}
          disabled={busy}
          sx={sheetStackedContainedGlowSx('primary')}
        >
          {t('pages.lists.create_submit')}
        </Button>
        <Button
          type="button"
          variant="outlined"
          fullWidth
          size="large"
          startIcon={<Iconify icon={ic.googleMaps} width={18} />}
          onClick={() => {
            setImportOpen(true);
            onClose?.();
            reset();
          }}
          disabled={busy}
          sx={sheetStackedCancelOutlinedSx}
        >
          {t('pages.lists.import_from_gmaps')}
        </Button>
        <Button
          type="button"
          variant="outlined"
          fullWidth
          size="large"
          onClick={handleClose}
          disabled={busy}
          sx={sheetStackedCancelOutlinedSx}
        >
          {t('common.cancel')}
        </Button>
      </Stack>
    </Stack>
  );

  if (isMobile) {
    return (
      <>
        <Drawer
          anchor="bottom"
          elevation={0}
          open={open}
          onClose={handleClose}
          aria-labelledby={CREATE_LIST_MODAL_TITLE_ID}
          PaperProps={{ sx: mobileBottomSheetDrawerPaperSx }}
        >
          <SwipeDismissBottomSheetContent
            onClose={handleClose}
            disabled={busy}
            chrome={
              <>
                <Box {...sheetDragHandleProps()}>
                  <SheetGrabBarRail />
                </Box>
                <SheetHeaderRow title={sheetTitle} endAction={closeBtn} />
              </>
            }
          >
            <Box sx={{ px: 2, pb: 3 }}>{form}</Box>
          </SwipeDismissBottomSheetContent>
        </Drawer>
        <GoogleMapsImportModal open={importOpen} onClose={() => setImportOpen(false)} />
      </>
    );
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        aria-labelledby={CREATE_LIST_MODAL_TITLE_ID}
        sx={{ '& .MuiDialog-paper': { m: 2 } }}
      >
        <SheetHeaderRow title={sheetTitle} endAction={closeBtn} sx={{ px: 3, pt: 2.5, pb: 1 }} />
        <Box sx={{ px: 3, pb: 3 }}>{form}</Box>
      </Dialog>
      <GoogleMapsImportModal open={importOpen} onClose={() => setImportOpen(false)} />
    </>
  );
}

CreateListModal.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  /**
   * When set (e.g. save-to-list sheet, lists hub, profile), stay on the current page instead of navigating.
   * Receives `{ id, name, description, visibility }`.
   */
  onCreated: PropTypes.func,
};
