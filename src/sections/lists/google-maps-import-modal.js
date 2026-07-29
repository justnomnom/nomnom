'use client';

import PropTypes from 'prop-types';
import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { isCapacitorNative } from 'src/libs/capacitor/platform';
import {
  commitGoogleMapsImport,
  previewGoogleMapsImport,
} from 'src/auth/actions/google-maps-import-actions';

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

// ---------------------------------------------------------------------------

const MODAL_TITLE_ID = 'gmaps-import-modal-title';
const STEP_URL = 'url';
const STEP_PREVIEW = 'preview';

/** @param {{ open: boolean, onClose: () => void, listId?: string | null }} props */
export default function GoogleMapsImportModal({ open, onClose, listId: targetListId = null }) {
  const { t } = useTranslate();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [step, setStep] = useState(STEP_URL);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const [listTitle, setListTitle] = useState('');
  const [places, setPlaces] = useState([]);
  const [selected, setSelected] = useState(new Set());

  const reset = useCallback(() => {
    setStep(STEP_URL);
    setUrl('');
    setLoading(false);
    setErr(null);
    setListTitle('');
    setPlaces([]);
    setSelected(new Set());
  }, []);

  const handleClose = useCallback(() => {
    if (loading) return;
    reset();
    onClose?.();
  }, [loading, onClose, reset]);

  const handleFetch = useCallback(async () => {
    if (!url.trim() || loading) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await previewGoogleMapsImport(url.trim());
      if (res.error) {
        setErr(res.error);
        return;
      }
      setListTitle(res.listTitle ?? '');
      setPlaces(res.places ?? []);
      // Pre-select only restaurants already in our database — not-found places
      // are never created, they're reported to support instead.
      setSelected(new Set((res.places ?? []).map((p) => p.restaurantId).filter(Boolean)));
      setStep(STEP_PREVIEW);
    } catch (e) {
      console.error('[GoogleMapsImportModal] preview', e);
      setErr('generic');
    } finally {
      setLoading(false);
    }
  }, [url, loading]);

  const handleImport = useCallback(async () => {
    if (!selected.size || loading) return;
    setLoading(true);
    setErr(null);
    try {
      // Selected = existing restaurants to add. Not-found places are never
      // created — they're collected and reported to support on import.
      const restaurantIds = [];
      const missingPlaces = [];
      places.forEach((place) => {
        if (place.restaurantId) {
          if (selected.has(place.restaurantId)) restaurantIds.push(place.restaurantId);
        } else {
          missingPlaces.push({
            name: place.name,
            address: place.address,
            lat: place.lat,
            lng: place.lng,
          });
        }
      });

      const res = await commitGoogleMapsImport({
        ...(targetListId
          ? { listId: targetListId }
          : { listName: listTitle || t('pages.lists.gmaps_import_title') }),
        restaurantIds,
        missingPlaces,
        visibility: 'public',
      });
      if (res.error) {
        setErr(res.error);
        return;
      }
      handleClose();
      if (res.listId) router.push(paths.dashboard.listManage(res.listId));
    } catch (e) {
      console.error('[GoogleMapsImportModal] import', e);
      setErr('generic');
    } finally {
      setLoading(false);
    }
  }, [selected, places, listTitle, loading, handleClose, router, t, targetListId]);

  const errorMessage = (code) => {
    const map = {
      unauthorized: t('pages.lists.gmaps_import_error_auth'),
      missing_url: t('pages.lists.gmaps_import_error_missing_url'),
      invalid_url: t('pages.lists.gmaps_import_error_invalid_url'),
      fetch_failed: t('pages.lists.gmaps_import_error_fetch'),
      no_places_found: t('pages.lists.gmaps_import_error_no_places'),
      list_create_failed: t('pages.lists.gmaps_import_error_create'),
      restaurants_add_failed: t('pages.lists.gmaps_import_error_add'),
    };
    return map[code] ?? t('pages.lists.gmaps_import_error_generic');
  };

  const matchedCount = places.filter((p) => p.restaurantId).length;
  const notFoundCount = places.filter((p) => !p.restaurantId).length;
  const selectedCount = selected.size;

  // ---------------------------------------------------------------------------
  // Title (shared between drawer + dialog)
  // ---------------------------------------------------------------------------

  const title = (
    <Stack direction="row" alignItems="center" spacing={1.25}>
      <Iconify icon={ic.googleMaps} width={20} sx={{ flexShrink: 0 }} />
      <Typography
        id={MODAL_TITLE_ID}
        variant="subtitle1"
        component="h2"
        sx={{ fontWeight: 800, flex: 1, minWidth: 0, lineHeight: 1.3, m: 0 }}
      >
        {step === STEP_URL
          ? t('pages.lists.gmaps_import_title')
          : listTitle || t('pages.lists.gmaps_import_title')}
      </Typography>
    </Stack>
  );

  // ---------------------------------------------------------------------------
  // Form body
  // ---------------------------------------------------------------------------

  const body = (
    <Stack spacing={2} sx={{ pt: 0.5 }}>
      {err && (
        <Alert severity="error" variant="outlined" role="alert" onClose={() => setErr(null)}>
          {errorMessage(err)}
        </Alert>
      )}

      {step === STEP_URL && (
        <>
          <Typography variant="body2" color="text.secondary">
            {t('pages.lists.gmaps_import_description')}
          </Typography>
          <TextField
            label={t('pages.lists.gmaps_import_url_label')}
            placeholder="https://maps.app.goo.gl/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            fullWidth
            autoFocus={!isCapacitorNative()}
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleFetch();
            }}
          />
        </>
      )}

      {step === STEP_PREVIEW && (
        <>
          {!targetListId && (
            <TextField
              label={t('pages.lists.gmaps_import_list_name')}
              value={listTitle}
              onChange={(e) => setListTitle(e.target.value)}
              fullWidth
              size="small"
              disabled={loading}
            />
          )}

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              size="small"
              color="success"
              variant="soft"
              label={t('pages.lists.gmaps_import_matched', { count: matchedCount })}
            />
            {notFoundCount > 0 && (
              <Chip
                size="small"
                variant="soft"
                label={t('pages.lists.gmaps_import_not_found', { count: notFoundCount })}
              />
            )}
          </Stack>

          <Divider sx={{ opacity: 0.65 }} />

          <Stack
            spacing={0}
            divider={<Divider flexItem sx={{ opacity: 0.4 }} />}
            sx={{ maxHeight: 280, overflowY: 'auto', pr: 0.5 }}
          >
            {places.map((place, i) => {
              if (place.restaurantId) {
                return (
                  <FormControlLabel
                    key={place.restaurantId}
                    sx={{ m: 0, px: 0.5, py: 0.75, alignItems: 'flex-start' }}
                    control={
                      <Checkbox
                        size="small"
                        checked={selected.has(place.restaurantId)}
                        onChange={(e) => {
                          setSelected((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(place.restaurantId);
                            else next.delete(place.restaurantId);
                            return next;
                          });
                        }}
                        sx={{ pt: 0.25 }}
                      />
                    }
                    label={
                      <Stack spacing={0}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {place.matchedName ?? place.name}
                        </Typography>
                        {place.matchedAddress && (
                          <Typography variant="caption" color="text.secondary">
                            {place.matchedAddress}
                          </Typography>
                        )}
                      </Stack>
                    }
                  />
                );
              }
              // not_found — never created, reported to support. Shown greyed out.
              return (
                <Box key={`missing-${i}`} sx={{ px: 1, py: 0.75, opacity: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {place.name}
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    {t('pages.lists.gmaps_import_not_in_db')}
                  </Typography>
                </Box>
              );
            })}
          </Stack>

          {notFoundCount > 0 && (
            <Typography variant="caption" color="text.disabled">
              {t('pages.lists.gmaps_import_not_found_hint', { count: notFoundCount })}
            </Typography>
          )}
        </>
      )}

      {/* Buttons — stacked fullWidth like create-list-modal */}
      <Stack spacing={2} sx={{ width: 1 }}>
        {step === STEP_PREVIEW && (
          <Button
            type="button"
            color="primary"
            variant="contained"
            fullWidth
            size="large"
            onClick={handleImport}
            loading={loading}
            disabled={selectedCount === 0 || loading}
            sx={sheetStackedContainedGlowSx('primary')}
          >
            {targetListId
              ? t('pages.lists.gmaps_import_add_to_list', { count: selectedCount })
              : t('pages.lists.gmaps_import_confirm', { count: selectedCount })}
          </Button>
        )}

        {step === STEP_URL && (
          <Button
            type="button"
            color="primary"
            variant="contained"
            fullWidth
            size="large"
            onClick={handleFetch}
            loading={loading}
            disabled={!url.trim() || loading}
            sx={sheetStackedContainedGlowSx('primary')}
          >
            {t('pages.lists.gmaps_import_fetch_cta')}
          </Button>
        )}

        <Button
          type="button"
          variant="outlined"
          fullWidth
          size="large"
          onClick={
            step === STEP_PREVIEW
              ? () => {
                  setStep(STEP_URL);
                  setErr(null);
                }
              : handleClose
          }
          disabled={loading}
          sx={sheetStackedCancelOutlinedSx}
        >
          {step === STEP_PREVIEW ? t('pages.lists.gmaps_import_back') : t('common.cancel')}
        </Button>
      </Stack>
    </Stack>
  );

  const closeBtn = <SheetCloseIconButton onClick={handleClose} />;

  // ---------------------------------------------------------------------------
  // Mobile — bottom drawer (same as create-list-modal)
  // ---------------------------------------------------------------------------

  if (isMobile) {
    return (
      <Drawer
        anchor="bottom"
        elevation={0}
        open={open}
        onClose={handleClose}
        aria-labelledby={MODAL_TITLE_ID}
        PaperProps={{ sx: mobileBottomSheetDrawerPaperSx }}
      >
        <SwipeDismissBottomSheetContent
          onClose={handleClose}
          disabled={loading}
          chrome={
            <>
              <Box {...sheetDragHandleProps()}>
                <SheetGrabBarRail />
              </Box>
              <SheetHeaderRow title={title} endAction={closeBtn} />
            </>
          }
        >
          <Box sx={{ px: 2, pb: 3 }}>{body}</Box>
        </SwipeDismissBottomSheetContent>
      </Drawer>
    );
  }

  // ---------------------------------------------------------------------------
  // Desktop — dialog (same as create-list-modal)
  // ---------------------------------------------------------------------------

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby={MODAL_TITLE_ID}
      sx={{ '& .MuiDialog-paper': { m: 2 } }}
    >
      <SheetHeaderRow title={title} endAction={closeBtn} sx={{ px: 3, pt: 2.5, pb: 1 }} />
      <Box sx={{ px: 3, pb: 3 }}>{body}</Box>
    </Dialog>
  );
}

GoogleMapsImportModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  /** When set, imports into existing list instead of creating a new one */
  listId: PropTypes.string,
};
