'use client';

import PropTypes from 'prop-types';
import { useMemo, useState, useCallback, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { useShareLink } from 'src/hooks/use-share-link';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { SPACE, touchTargetSx } from 'src/theme/spacing';
import { createNight } from 'src/libs/lists/actions/night-actions';
import { decideErrorMessage, mapListItemsToDecidePlaces, persistLockToken } from 'src/libs/lists/list-decide-client';
import { useNightAnalytics } from 'src/libs/analytics/night-analytics';

import { ResponsiveSheet } from 'src/components/sheet-shell';
import ShareFeedbackSnackbar from 'src/components/share/share-feedback-snackbar';

import SettingsSelectionRow from 'src/sections/profile/settings-selection-row';

// ----------------------------------------------------------------------

const TITLE_ID = 'plan-tonight-title';
const DESC_ID = 'plan-tonight-desc';
const MIN_PLACES = 3;
const MAX_PLACES = 5;

/**
 * Owner sheet to create a Tonight Night (3–5 place shortlist) and copy the share link.
 */
export default function PlanTonightSheet({ open, onClose, listId, items, isOwner }) {
  const { t } = useTranslate();
  const analytics = useNightAnalytics();
  const {
    copyLink,
    feedback: shareFeedback,
    dismissFeedback: dismissShareFeedback,
  } = useShareLink({
    copiedKey: 'pages.tonight.link_copied',
    failedKey: 'pages.tonight.link_copy_failed',
  });

  const placeRows = useMemo(
    () => mapListItemsToDecidePlaces(items, t('pages.lists.decide_unnamed_place')),
    [items, t]
  );

  const [title, setTitle] = useState('Tonight');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!open) return;
    setTitle(t('pages.tonight.default_title'));
    setSelectedIds(new Set());
    setErr(null);
  }, [open, t]);

  const selectedCount = selectedIds.size;
  const canSubmit =
    isOwner && selectedCount >= MIN_PLACES && selectedCount <= MAX_PLACES && !busy;

  const handleToggle = useCallback((restaurantId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(restaurantId)) {
        next.delete(restaurantId);
        return next;
      }
      if (next.size >= MAX_PLACES) return prev;
      next.add(restaurantId);
      return next;
    });
  }, []);

  const handleClose = useCallback(() => {
    if (busy) return;
    onClose?.();
  }, [busy, onClose]);

  const handleCreate = useCallback(async () => {
    if (!canSubmit) return;
    setBusy(true);
    setErr(null);
    const restaurantIds = [...selectedIds];
    const { night, error } = await createNight({
      listId,
      restaurantIds,
      title: title.trim() || t('pages.tonight.default_title'),
    });
    if (error || !night?.night_id) {
      setBusy(false);
      setErr(error || 'unknown');
      return;
    }
    if (night.decide_session_id && night.lock_token) {
      persistLockToken(String(night.decide_session_id), String(night.lock_token));
    }
    analytics.trackNightCreated({
      night_id: String(night.night_id),
      list_id: String(night.list_id || listId),
    });
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}${paths.tonight(night.night_id)}`
        : paths.tonight(night.night_id);
    await copyLink(url);
    analytics.trackNightShareCopied({
      night_id: String(night.night_id),
      list_id: String(night.list_id || listId),
    });
    setBusy(false);
    onClose?.();
  }, [canSubmit, selectedIds, listId, title, t, analytics, copyLink, onClose]);

  const sheetTitle = (
    <Typography
      id={TITLE_ID}
      variant="subtitle1"
      component="h2"
      sx={{ fontWeight: 800, flex: 1, minWidth: 0, lineHeight: 1.3, m: 0 }}
    >
      {t('pages.lists.plan_tonight_title')}
    </Typography>
  );

  const footer = (
    <Stack spacing={SPACE.sm} sx={{ width: 1 }}>
      <Button
        fullWidth
        size="large"
        variant="contained"
        color="primary"
        onClick={handleCreate}
        disabled={!canSubmit}
        sx={touchTargetSx}
      >
        {t('pages.lists.plan_tonight_create')}
      </Button>
      <Button fullWidth size="large" variant="outlined" onClick={handleClose} disabled={busy}>
        {t('pages.lists.plan_tonight_cancel')}
      </Button>
    </Stack>
  );

  return (
    <>
      <ResponsiveSheet
        open={open}
        onClose={handleClose}
        titleId={TITLE_ID}
        descId={DESC_ID}
        title={sheetTitle}
        footer={footer}
        closeDisabled={busy}
      >
        <Typography id={DESC_ID} variant="body2" color="text.secondary">
          {t('pages.lists.plan_tonight_hint', { min: MIN_PLACES, max: MAX_PLACES })}
        </Typography>

        <TextField
          fullWidth
          size="small"
          label={t('pages.lists.plan_tonight_name_label')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={busy}
          inputProps={{ maxLength: 80 }}
        />

        {err ? (
          <Typography variant="body2" color="error">
            {decideErrorMessage(err, t)}
          </Typography>
        ) : null}

        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          {t('pages.lists.plan_tonight_selected', { count: selectedCount, max: MAX_PLACES })}
        </Typography>

        <Stack spacing={SPACE.xs}>
          {placeRows.map((place) => (
            <Box key={place.restaurantId}>
              <SettingsSelectionRow
                selected={selectedIds.has(place.restaurantId)}
                onClick={() => handleToggle(place.restaurantId)}
                icon={ic.shopBold}
                label={place.name}
              />
            </Box>
          ))}
        </Stack>
      </ResponsiveSheet>

      <ShareFeedbackSnackbar feedback={shareFeedback} onClose={dismissShareFeedback} />
    </>
  );
}

PlanTonightSheet.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  listId: PropTypes.string.isRequired,
  items: PropTypes.array,
  isOwner: PropTypes.bool,
};
