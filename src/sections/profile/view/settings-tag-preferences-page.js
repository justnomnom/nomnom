'use client';

import PropTypes from 'prop-types';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { userDishTagIdSet, groupRestaurantTagsByCategory } from 'src/utils/restaurant-tag-groups';

import { useTranslate } from 'src/locales';
import { useAnalytics } from 'src/libs/analytics/analytics-provider';
import { saveUserRestaurantTagPreferences } from 'src/auth/actions/onboarding-actions';

import RestaurantTagPreferencePicker from 'src/components/restaurant-tag-preference-picker';

import SettingsDrillShell from './settings-drill-shell';
import {
  TOUCH_MIN,
  dashboardSectionLabelSx,
  dashboardSubsectionStackProps,
  dashboardPageSectionStackProps,
  SETTINGS_DRILL_END_ACTION_PAD_X,
} from './settings-shell-shared';

// ----------------------------------------------------------------------

const DRAFT_TAG_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function SettingsTagPreferencesPage({
  initialTags = [],
  initialSelectedIds = [],
  userDishTags = [],
}) {
  const theme = useTheme();
  const { t } = useTranslate();
  const router = useRouter();
  const { trackEvent } = useAnalytics();

  const validInitial = useMemo(
    () =>
      new Set(
        initialSelectedIds
          .map((id) => (typeof id === 'string' ? id.trim().toLowerCase() : ''))
          .filter((id) => DRAFT_TAG_ID_RE.test(id))
      ),
    [initialSelectedIds]
  );

  const [selectedIds, setSelectedIds] = useState(() => validInitial);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const prevServerIdsKeyRef = useRef(null);

  useEffect(() => {
    const ids = initialSelectedIds
      .map((id) => (typeof id === 'string' ? id.trim().toLowerCase() : ''))
      .filter((id) => DRAFT_TAG_ID_RE.test(id))
      .sort();
    const key = JSON.stringify(ids);
    if (prevServerIdsKeyRef.current === key) {
      return;
    }
    prevServerIdsKeyRef.current = key;
    setSelectedIds(new Set(ids));
  }, [initialSelectedIds]);

  const tagSections = useMemo(() => groupRestaurantTagsByCategory(initialTags), [initialTags]);
  const userDishTagIds = useMemo(() => userDishTagIdSet(userDishTags), [userDishTags]);

  const onSelectedIdsChange = useCallback((updater) => {
    setSelectedIds((prev) => updater(prev));
  }, []);

  const onSave = useCallback(async () => {
    setSaveError(null);
    setSaving(true);
    try {
      const r = await saveUserRestaurantTagPreferences([...selectedIds]);
      if (r?.error) {
        setSaveError(t('pages.dashboard.settings.preferences.save_error'));
        trackEvent('tag_preferences_save_failed');
        return;
      }
      trackEvent('tag_preferences_saved', { selected_count: selectedIds.size });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }, [router, selectedIds, t, trackEvent]);

  const doneButton = (
    <Button
      onClick={onSave}
      disabled={saving}
      color="primary"
      aria-busy={saving}
      aria-label={
        saving
          ? t('pages.dashboard.settings.preferences.saving')
          : t('pages.dashboard.settings.edit.done')
      }
      sx={{
        fontWeight: 700,
        minHeight: TOUCH_MIN,
        boxSizing: 'border-box',
        textTransform: 'none',
        WebkitTapHighlightColor: 'transparent',
        lineHeight: 1,
        justifyContent: 'center',
        ...(saving
          ? { minWidth: TOUCH_MIN, width: TOUCH_MIN, px: 0, py: 0 }
          : { minWidth: 0, px: `${SETTINGS_DRILL_END_ACTION_PAD_X}px`, py: 0 }),
      }}
    >
      {saving ? (
        <CircularProgress color="inherit" size={20} />
      ) : (
        t('pages.dashboard.settings.edit.done')
      )}
    </Button>
  );

  return (
    <SettingsDrillShell
      title={t('pages.dashboard.settings.preferences.page_title')}
      backHref={paths.dashboard.settings}
      backAriaLabel={t('pages.dashboard.settings.back_to_hub')}
      endAdornment={doneButton}
    >
      <Stack {...dashboardPageSectionStackProps}>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65, px: 0.5 }}>
          {t('pages.dashboard.settings.preferences.page_body')}
        </Typography>

        <Stack {...dashboardSubsectionStackProps}>
          <Typography component="h2" sx={dashboardSectionLabelSx(theme)}>
            {t('pages.dashboard.settings.preferences.section_labels')}
          </Typography>

          <RestaurantTagPreferencePicker
            tagSections={tagSections}
            selectedIds={selectedIds}
            onSelectedIdsChange={onSelectedIdsChange}
            userDishTagIds={userDishTagIds}
            emptyMessage={t('pages.dashboard.map.filter_sheet_empty')}
          />
        </Stack>

        {saveError ? (
          <Stack direction="row" justifyContent="flex-end" sx={{ width: 1 }}>
            <Alert
              severity="error"
              variant="outlined"
              role="alert"
              sx={{ fontWeight: 600, textAlign: 'right', maxWidth: 480, py: 0.75 }}
            >
              {saveError}
            </Alert>
          </Stack>
        ) : null}
      </Stack>
    </SettingsDrillShell>
  );
}

SettingsTagPreferencesPage.propTypes = {
  initialTags: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      slug: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      category: PropTypes.string.isRequired,
      sort_order: PropTypes.number,
    })
  ),
  initialSelectedIds: PropTypes.arrayOf(PropTypes.string),
  userDishTags: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      slug: PropTypes.string,
      label: PropTypes.string,
      category: PropTypes.string,
      sort_order: PropTypes.number,
    })
  ),
};
