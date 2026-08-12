'use client';

import PropTypes from 'prop-types';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fDate } from 'src/utils/format-time';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { getMyFollowers } from 'src/auth/actions/profile-actions';
import { useMyStripeConnectStatus } from 'src/api/stripe-connect-status';
import {
  getCreatorListStats,
  getMyPaidListSubscribers,
  cancelSubscriberListSubscription,
} from 'src/auth/actions/creator-subscribers-actions';

import Iconify from 'src/components/iconify';
import DeleteDialog from 'src/components/custom-dialog/delete-dialog';
import { ScrollableChipRow } from 'src/components/horizontal-scroll-row';
import { scrollableChipPillButtonSx } from 'src/components/scrollable-chip-select';

import ProfileListItemRow from './profile-list-item-row';
import SettingsSubscribersListSkeleton from './settings-subscribers-skeleton';
import {
  TOUCH_MIN,
  SHELL_HUB_ICON,
  dashboardPageSectionStackProps,
  dashboardMobileStretchButtonSx,
} from './view/settings-shell-shared';

// ----------------------------------------------------------------------

// Dark editorial CTA (DESIGN.md §7): explicit bgcolor marks the dark color as intentional.
const darkBillingCtaSx = {
  ...dashboardMobileStretchButtonSx,
  bgcolor: 'text.primary',
  color: 'background.paper',
  '&:hover': { bgcolor: 'text.primary' },
};

const FILTER_ALL = 'all';
const FILTER_FOLLOWERS = 'followers';
const FILTER_SUBSCRIBERS = 'subscribers';

function statusColor(status) {
  switch (status) {
    case 'active':
      return 'success';
    case 'trialing':
      return 'info';
    case 'past_due':
    case 'unpaid':
      return 'warning';
    case 'canceled':
    case 'incomplete_expired':
      return 'default';
    default:
      return 'default';
  }
}

function subscriberLabel(row, t) {
  const u = row.subscriber;
  const name = u?.display_name?.trim();
  const handle = u?.username?.trim();
  if (name) return name;
  if (handle) return `@${handle.replace(/^@/, '')}`;
  return t('pages.dashboard.settings.subscribers.unknown_user');
}

function followerLabel(row, t) {
  const u = row.user;
  const name = u?.display_name?.trim();
  const handle = u?.username?.trim();
  if (name) return name;
  if (handle) return `@${handle.replace(/^@/, '')}`;
  return t('pages.dashboard.settings.subscribers.unknown_user');
}

function SubscriberRow({ row, onRemove, disabled, t }) {
  const cancellable =
    row.status === 'active' ||
    row.status === 'trialing' ||
    row.status === 'past_due' ||
    row.status === 'unpaid' ||
    row.status === 'paused';

  const secondaryParts = [
    row.list_name
      ? t('pages.dashboard.settings.subscribers.row_list', { name: row.list_name })
      : null,
    row.current_period_end
      ? t('pages.dashboard.settings.subscribers.row_renews', {
          date: fDate(row.current_period_end),
        })
      : null,
  ].filter(Boolean);

  const label = subscriberLabel(row, t);

  return (
    <ProfileListItemRow
      avatarSrc={row.subscriber?.avatar_url}
      avatarFallback={label.slice(0, 1).toUpperCase()}
      title={label}
      subtitle={secondaryParts.length > 0 ? secondaryParts.join(' · ') : null}
      chips={
        <>
          <Chip size="small" label={row.status} color={statusColor(row.status)} variant="soft" />
          <Chip
            size="small"
            label={t('pages.dashboard.settings.subscribers.filter_subscribers')}
            color="primary"
            variant="outlined"
          />
          {row.cancel_at_period_end ? (
            <Chip size="small" label={t('pages.dashboard.settings.subscribers.ends_at_period')} />
          ) : null}
        </>
      }
      trailingAction={
        cancellable ? (
          <IconButton
            color="error"
            aria-label={t('pages.dashboard.settings.subscribers.remove_aria')}
            onClick={onRemove}
            disabled={disabled}
            sx={{ flexShrink: 0, width: TOUCH_MIN, height: TOUCH_MIN, p: 0 }}
          >
            <Iconify icon={ic.trashLinear} width={SHELL_HUB_ICON} />
          </IconButton>
        ) : null
      }
    />
  );
}

SubscriberRow.propTypes = {
  row: PropTypes.shape({
    id: PropTypes.string,
    list_name: PropTypes.string,
    status: PropTypes.string,
    current_period_end: PropTypes.string,
    cancel_at_period_end: PropTypes.bool,
    subscriber: PropTypes.shape({
      avatar_url: PropTypes.string,
      display_name: PropTypes.string,
      username: PropTypes.string,
    }),
  }).isRequired,
  onRemove: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  t: PropTypes.func.isRequired,
};

SubscriberRow.defaultProps = {
  disabled: false,
};

function FollowerRow({ row, t }) {
  const label = followerLabel(row, t);
  const username = row.user?.username;

  return (
    <ProfileListItemRow
      avatarSrc={row.user?.avatar_url}
      avatarFallback={label.slice(0, 1).toUpperCase()}
      title={label}
      subtitle={username ? `@${username}` : null}
      username={username}
      chips={
        <Chip
          size="small"
          label={t('pages.dashboard.settings.subscribers.filter_followers')}
          variant="outlined"
        />
      }
    />
  );
}

FollowerRow.propTypes = {
  row: PropTypes.shape({
    id: PropTypes.string,
    user: PropTypes.shape({
      avatar_url: PropTypes.string,
      display_name: PropTypes.string,
      username: PropTypes.string,
    }),
  }).isRequired,
  t: PropTypes.func.isRequired,
};

// ----------------------------------------------------------------------

export default function SettingsSubscribers({
  initialConnectStatus,
  initialSubscribers,
  initialStats,
  initialFollowers,
}) {
  const muiTheme = useTheme();
  const { t } = useTranslate();

  const hasInitialData = Boolean(
    initialConnectStatus && initialSubscribers && initialStats && initialFollowers
  );

  const [subscriberRows, setSubscriberRows] = useState(() =>
    initialSubscribers?.error ? [] : (initialSubscribers?.rows ?? [])
  );
  const [followerRows, setFollowerRows] = useState(() => initialFollowers?.rows ?? []);
  const [loadError, setLoadError] = useState(() => initialSubscribers?.error ?? null);
  const { chargesEnabled: payoutReady } = useMyStripeConnectStatus({
    fallbackData: initialConnectStatus,
  });

  const [loading, setLoading] = useState(!hasInitialData);
  const [confirmRow, setConfirmRow] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [stats, setStats] = useState(() => (!initialStats?.error ? initialStats : null));
  const [filter, setFilter] = useState(FILTER_ALL);

  const load = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    try {
      const [subsRes, statsRes, followersRes] = await Promise.all([
        getMyPaidListSubscribers(),
        getCreatorListStats(),
        getMyFollowers(),
      ]);
      if (subsRes.error) {
        setLoadError(subsRes.error);
        setSubscriberRows([]);
      } else {
        setSubscriberRows(subsRes.rows ?? []);
      }
      if (!statsRes.error) setStats(statsRes);
      setFollowerRows(followersRes.rows ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasInitialData) return;
    load();
  }, [hasInitialData, load]);

  const visibleRows = useMemo(() => {
    if (filter === FILTER_SUBSCRIBERS) return { subscribers: subscriberRows, followers: [] };
    if (filter === FILTER_FOLLOWERS) return { subscribers: [], followers: followerRows };
    return { subscribers: subscriberRows, followers: followerRows };
  }, [filter, subscriberRows, followerRows]);

  const errMsg = useMemo(() => {
    if (!loadError) return null;
    const key = `pages.dashboard.settings.subscribers.error_${loadError}`;
    const msg = t(key);
    return msg === key ? t('pages.dashboard.settings.subscribers.error_generic') : msg;
  }, [loadError, t]);

  const actionErrMsg = useMemo(() => {
    if (!actionError) return null;
    const key = `pages.dashboard.settings.subscribers.error_${actionError}`;
    const msg = t(key);
    return msg === key ? t('pages.dashboard.settings.subscribers.error_generic') : msg;
  }, [actionError, t]);

  const handleConfirmRemove = useCallback(async () => {
    if (!confirmRow?.id) return;
    setActionError(null);
    setActionLoading(true);
    try {
      const { error } = await cancelSubscriberListSubscription(confirmRow.id);
      if (error) {
        setActionError(error);
        return;
      }
      setConfirmRow(null);
      await load();
    } finally {
      setActionLoading(false);
    }
  }, [confirmRow, load]);

  const _formatMoney = (cents, currency) => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: (currency || 'eur').toUpperCase(),
      }).format((cents || 0) / 100);
    } catch {
      return `€${((cents || 0) / 100).toFixed(2)}`;
    }
  };

  const totalCount = subscriberRows.length + followerRows.length;
  const isEmpty = totalCount === 0;

  const filters = [
    { key: FILTER_ALL, label: t('pages.dashboard.settings.subscribers.filter_all') },
    { key: FILTER_FOLLOWERS, label: t('pages.dashboard.settings.subscribers.filter_followers') },
    {
      key: FILTER_SUBSCRIBERS,
      label: t('pages.dashboard.settings.subscribers.filter_subscribers'),
    },
  ];

  return (
    <Stack {...dashboardPageSectionStackProps}>
      <Typography variant="body2" color="text.secondary">
        {t('pages.dashboard.settings.subscribers.intro')}
      </Typography>

      {!loading && stats && (
        <Stack direction="row" spacing={2} flexWrap="wrap">
          {[
            {
              label: t('pages.dashboard.settings.subscribers.stat_active'),
              value: String(stats.activeSubscribers),
            },
            {
              label: t('pages.dashboard.settings.subscribers.stat_snapshots'),
              value: String(stats.snapshotPurchases),
            },
          ].map(({ label, value }) => (
            <Box
              key={label}
              sx={{
                flex: '1 1 100px',
                p: 2,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                textAlign: 'center',
              }}
            >
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                {value}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {label}
              </Typography>
            </Box>
          ))}
        </Stack>
      )}

      {!loading && !payoutReady && (
        <Alert severity="info" sx={{ alignItems: 'flex-start' }}>
          <Stack spacing={1.25}>
            <Typography variant="body2">
              <strong>{t('pages.lists.visibility_public_billing_prompt_title')}</strong>{' '}
              {t('pages.lists.visibility_public_billing_prompt')}
            </Typography>
            <Button
              component={RouterLink}
              href={paths.dashboard.settingsBilling}
              variant="contained"
              size="small"
              sx={darkBillingCtaSx}
            >
              {t('pages.lists.paid_connect_billing_cta')}
            </Button>
          </Stack>
        </Alert>
      )}

      {errMsg && <Alert severity="error">{errMsg}</Alert>}

      {loading ? (
        <SettingsSubscribersListSkeleton />
      ) : (
        <>
          {/* Filter chips */}
          {!isEmpty && (
            <Box
              role="group"
              aria-label={t('pages.dashboard.settings.subscribers.filter_aria')}
              sx={{ width: 1 }}
            >
              <ScrollableChipRow gap={1} sx={{ mx: 0, width: 1 }}>
                {filters.map(({ key, label }) => (
                  <Button
                    key={key}
                    type="button"
                    color="inherit"
                    disableElevation
                    onClick={() => setFilter(key)}
                    aria-pressed={filter === key}
                    sx={scrollableChipPillButtonSx(muiTheme, { selected: filter === key })}
                  >
                    {label}
                  </Button>
                ))}
              </ScrollableChipRow>
            </Box>
          )}

          {/* Subscriber rows */}
          {visibleRows.subscribers.length > 0 && (
            <Stack spacing={1.5}>
              {visibleRows.subscribers.map((row) => (
                <SubscriberRow
                  key={row.id}
                  row={row}
                  t={t}
                  disabled={actionLoading}
                  onRemove={() => {
                    setActionError(null);
                    setConfirmRow(row);
                  }}
                />
              ))}
            </Stack>
          )}

          {/* Follower rows */}
          {visibleRows.followers.length > 0 && (
            <Stack spacing={1.5}>
              {visibleRows.followers.map((row) => (
                <FollowerRow key={row.id} row={row} t={t} />
              ))}
            </Stack>
          )}

          {/* Empty state for followers filter */}
          {filter === FILTER_FOLLOWERS && followerRows.length === 0 && (
            <Box
              sx={{
                py: 5,
                px: 3,
                textAlign: 'center',
                borderRadius: 2,
                bgcolor: (theme) => theme.palette.background.neutral,
                border: (theme) => `1px dashed ${theme.palette.divider}`,
              }}
            >
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  bgcolor: (theme) => theme.palette.primary.lighter,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                }}
              >
                <Iconify
                  icon={ic.usersGroupRoundedBold}
                  width={28}
                  sx={{ color: 'primary.main' }}
                />
              </Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.75 }}>
                {t('pages.dashboard.settings.subscribers.followers_empty_heading')}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: 'text.secondary', maxWidth: 300, mx: 'auto', lineHeight: 1.6 }}
              >
                {t('pages.dashboard.settings.subscribers.followers_empty')}
              </Typography>
            </Box>
          )}

          {/* Empty state for subscribers filter */}
          {filter === FILTER_SUBSCRIBERS && subscriberRows.length === 0 && payoutReady && (
            <Box
              sx={{
                py: 5,
                px: 3,
                textAlign: 'center',
                borderRadius: 2,
                bgcolor: (theme) => theme.palette.background.neutral,
                border: (theme) => `1px dashed ${theme.palette.divider}`,
              }}
            >
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  bgcolor: (theme) => theme.palette.primary.lighter,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                }}
              >
                <Iconify
                  icon={ic.usersGroupRoundedBold}
                  width={28}
                  sx={{ color: 'primary.main' }}
                />
              </Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.75 }}>
                {t('pages.dashboard.settings.subscribers.empty_heading')}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  maxWidth: 300,
                  mx: 'auto',
                  lineHeight: 1.6,
                  mb: 2.5,
                }}
              >
                {t('pages.dashboard.settings.subscribers.empty')}
              </Typography>
              <Button
                component={RouterLink}
                href={paths.dashboard.settingsBilling}
                variant="soft"
                color="primary"
                size="small"
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                {t('pages.dashboard.settings.subscribers.empty_cta')}
              </Button>
            </Box>
          )}

          {/* All-empty state */}
          {filter === FILTER_ALL && isEmpty && payoutReady && (
            <Box
              sx={{
                py: 5,
                px: 3,
                textAlign: 'center',
                borderRadius: 2,
                bgcolor: (theme) => theme.palette.background.neutral,
                border: (theme) => `1px dashed ${theme.palette.divider}`,
              }}
            >
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  bgcolor: (theme) => theme.palette.primary.lighter,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                }}
              >
                <Iconify
                  icon={ic.usersGroupRoundedBold}
                  width={28}
                  sx={{ color: 'primary.main' }}
                />
              </Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.75 }}>
                {t('pages.dashboard.settings.subscribers.empty_heading')}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  maxWidth: 300,
                  mx: 'auto',
                  lineHeight: 1.6,
                  mb: 2.5,
                }}
              >
                {t('pages.dashboard.settings.subscribers.empty')}
              </Typography>
              <Button
                component={RouterLink}
                href={paths.dashboard.settingsBilling}
                variant="soft"
                color="primary"
                size="small"
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                {t('pages.dashboard.settings.subscribers.empty_cta')}
              </Button>
            </Box>
          )}
        </>
      )}

      <DeleteDialog
        open={Boolean(confirmRow)}
        onClose={() => !actionLoading && setConfirmRow(null)}
        onConfirm={handleConfirmRemove}
        isDeleting={actionLoading}
        title={t('pages.dashboard.settings.subscribers.dialog_title')}
        confirmationMessage={t('pages.dashboard.settings.subscribers.dialog_body', {
          name: confirmRow ? subscriberLabel(confirmRow, t) : '',
        })}
        cancelButtonText={t('pages.dashboard.settings.subscribers.dialog_cancel')}
        confirmButtonText={t('pages.dashboard.settings.subscribers.dialog_confirm')}
      >
        {actionErrMsg ? (
          <Alert severity="error" variant="outlined" role="alert">
            {actionErrMsg}
          </Alert>
        ) : null}
      </DeleteDialog>
    </Stack>
  );
}

SettingsSubscribers.propTypes = {
  initialConnectStatus: PropTypes.object,
  initialSubscribers: PropTypes.object,
  initialStats: PropTypes.object,
  initialFollowers: PropTypes.object,
};
