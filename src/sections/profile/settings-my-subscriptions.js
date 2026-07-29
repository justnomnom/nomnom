'use client';

import PropTypes from 'prop-types';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { fDate } from 'src/utils/format-time';
import { translateCreatorSubscriptionError } from 'src/utils/creator-subscription-errors';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { getMyFollowing } from 'src/auth/actions/profile-actions';
import { useAnalytics } from 'src/libs/analytics/analytics-provider';
import { CANCELLATION_REASONS } from 'src/libs/stripe/cancellation-reasons';
import {
  getMyActiveSubscriptions,
  cancelMyCreatorSubscription,
} from 'src/auth/actions/creator-subscribers-actions';

import Iconify from 'src/components/iconify';
import DeleteDialog from 'src/components/custom-dialog/delete-dialog';
import { ScrollableChipRow } from 'src/components/horizontal-scroll-row';
import { scrollableChipPillButtonSx } from 'src/components/scrollable-chip-select';

import ProfileListItemRow from './profile-list-item-row';
import SettingsMySubscriptionsListSkeleton from './settings-my-subscriptions-skeleton';
import {
  TOUCH_MIN,
  SHELL_HUB_ICON,
  dashboardPageSectionStackProps,
} from './view/settings-shell-shared';

// ----------------------------------------------------------------------

const FILTER_ALL = 'all';
const FILTER_FOLLOWING = 'following';
const FILTER_SUBSCRIPTIONS = 'subscriptions';

function creatorLabel(row, t) {
  const u = row.creator;
  const name = u?.display_name?.trim();
  const handle = u?.username?.trim();
  if (name) return name;
  if (handle) return `@${handle.replace(/^@/, '')}`;
  return t('pages.dashboard.settings.my_subscriptions.unknown_creator');
}

function followingLabel(row, t) {
  const u = row.user;
  const name = u?.display_name?.trim();
  const handle = u?.username?.trim();
  if (name) return name;
  if (handle) return `@${handle.replace(/^@/, '')}`;
  return t('pages.dashboard.settings.my_subscriptions.unknown_creator');
}

function MySubscriptionRow({ row, onCancel, onManageBilling, disabled, t }) {
  const isSnapshot = row.purchase_kind === 'snapshot';
  const canCancel = !isSnapshot && !row.cancel_at_period_end;
  // Snapshots are one-off payments with no subscription to manage; the portal is keyed on
  // the list_subscriptions row, which they do not have.
  const canManageBilling = !isSnapshot;

  const periodEnd = row.current_period_end ? fDate(row.current_period_end) : null;
  const purchasedAt = row.purchased_at ? fDate(row.purchased_at) : null;
  const secondaryParts = [
    row.list_name
      ? t('pages.dashboard.settings.my_subscriptions.row_list', { name: row.list_name })
      : null,
    isSnapshot && purchasedAt
      ? t('pages.dashboard.settings.my_subscriptions.row_purchased', { date: purchasedAt })
      : null,
    !isSnapshot && periodEnd && !row.cancel_at_period_end
      ? t('pages.dashboard.settings.my_subscriptions.row_renews', { date: periodEnd })
      : null,
    !isSnapshot && periodEnd && row.cancel_at_period_end
      ? t('pages.dashboard.settings.my_subscriptions.row_ends', { date: periodEnd })
      : null,
  ].filter(Boolean);

  const label = creatorLabel(row, t);

  return (
    <ProfileListItemRow
      avatarSrc={row.creator?.avatar_url}
      avatarFallback={label.slice(0, 1).toUpperCase()}
      title={label}
      subtitle={secondaryParts.length > 0 ? secondaryParts.join(' · ') : null}
      chips={
        isSnapshot ? (
          <>
            <Chip
              size="small"
              label={t('pages.dashboard.settings.my_subscriptions.snapshot_status')}
              color="success"
              variant="soft"
            />
            <Chip
              size="small"
              label={t('pages.dashboard.settings.my_subscriptions.snapshot_chip')}
              color="primary"
              variant="outlined"
            />
          </>
        ) : (
          <>
            <Chip
              size="small"
              label={row.status}
              color={row.status === 'active' ? 'success' : 'info'}
              variant="soft"
            />
            <Chip
              size="small"
              label={t('pages.dashboard.settings.my_subscriptions.filter_subscriptions')}
              color="primary"
              variant="outlined"
            />
            {row.cancel_at_period_end && (
              <Chip
                size="small"
                label={t('pages.dashboard.settings.my_subscriptions.ends_at_period')}
              />
            )}
          </>
        )
      }
      trailingAction={
        canManageBilling || canCancel ? (
          <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
            {canManageBilling && (
              <IconButton
                aria-label={t('pages.dashboard.settings.my_subscriptions.billing_portal_aria')}
                onClick={onManageBilling}
                disabled={disabled}
                sx={{ flexShrink: 0, width: TOUCH_MIN, height: TOUCH_MIN, p: 0 }}
              >
                <Iconify icon={ic.walletBold} width={SHELL_HUB_ICON} />
              </IconButton>
            )}
            {canCancel && (
              <IconButton
                color="error"
                aria-label={t('pages.dashboard.settings.my_subscriptions.cancel_aria')}
                onClick={onCancel}
                disabled={disabled}
                sx={{ flexShrink: 0, width: TOUCH_MIN, height: TOUCH_MIN, p: 0 }}
              >
                <Iconify icon={ic.closeCircleBold} width={SHELL_HUB_ICON} />
              </IconButton>
            )}
          </Stack>
        ) : null
      }
    />
  );
}

MySubscriptionRow.propTypes = {
  onManageBilling: PropTypes.func,
  row: PropTypes.shape({
    id: PropTypes.string,
    purchase_kind: PropTypes.oneOf(['subscription', 'snapshot']),
    list_name: PropTypes.string,
    status: PropTypes.string,
    current_period_end: PropTypes.string,
    purchased_at: PropTypes.string,
    cancel_at_period_end: PropTypes.bool,
    creator: PropTypes.shape({
      avatar_url: PropTypes.string,
      display_name: PropTypes.string,
      username: PropTypes.string,
    }),
  }).isRequired,
  onCancel: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  t: PropTypes.func.isRequired,
};

MySubscriptionRow.defaultProps = {
  disabled: false,
};

function FollowingRow({ row, t }) {
  const label = followingLabel(row, t);
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
          label={t('pages.dashboard.settings.my_subscriptions.filter_following')}
          variant="outlined"
        />
      }
    />
  );
}

FollowingRow.propTypes = {
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

export default function SettingsMySubscriptions({ initialSubscriptions, initialFollowing }) {
  const muiTheme = useTheme();
  const { t } = useTranslate();
  const { trackEvent } = useAnalytics();

  const hasInitialData = Boolean(initialSubscriptions && initialFollowing);

  const [subscriptionRows, setSubscriptionRows] = useState(() =>
    initialSubscriptions?.error ? [] : (initialSubscriptions?.rows ?? [])
  );
  const [followingRows, setFollowingRows] = useState(() => initialFollowing?.rows ?? []);
  const [loadError, setLoadError] = useState(() => initialSubscriptions?.error ?? null);
  const [loading, setLoading] = useState(!hasInitialData);
  const [confirmRow, setConfirmRow] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [filter, setFilter] = useState(FILTER_ALL);

  const load = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    try {
      const [subsRes, followingRes] = await Promise.all([
        getMyActiveSubscriptions(),
        getMyFollowing(),
      ]);
      if (subsRes.error) {
        setLoadError(subsRes.error);
        setSubscriptionRows([]);
      } else {
        setSubscriptionRows(subsRes.rows ?? []);
      }
      setFollowingRows(followingRes.rows ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasInitialData) return;
    load();
  }, [hasInitialData, load]);

  const visibleRows = useMemo(() => {
    if (filter === FILTER_SUBSCRIPTIONS) return { subscriptions: subscriptionRows, following: [] };
    if (filter === FILTER_FOLLOWING) return { subscriptions: [], following: followingRows };
    return { subscriptions: subscriptionRows, following: followingRows };
  }, [filter, subscriptionRows, followingRows]);

  const errMsg = useMemo(() => {
    if (!loadError) return null;
    return translateCreatorSubscriptionError(t, loadError);
  }, [loadError, t]);

  const actionErrMsg = useMemo(() => {
    if (!actionError) return null;
    return translateCreatorSubscriptionError(t, actionError);
  }, [actionError, t]);

  const handleConfirmCancel = useCallback(async () => {
    if (!confirmRow?.id || confirmRow.purchase_kind === 'snapshot') return;
    setActionError(null);
    setActionLoading(true);
    try {
      const { error } = await cancelMyCreatorSubscription(confirmRow.id, cancelReason || null);
      if (error) {
        setActionError(error);
        return;
      }
      trackEvent('subscription_cancelled', { reason: cancelReason || 'not_given' });
      setConfirmRow(null);
      setCancelReason('');
      await load();
    } finally {
      setActionLoading(false);
    }
  }, [confirmRow, cancelReason, load, trackEvent]);

  /**
   * Open Stripe's billing portal for one subscription: invoices, receipts and payment-method
   * updates, none of which existed anywhere in the product before. The portal session is
   * created on the creator's Connect account server-side; only the row id crosses the wire,
   * because the customer id is a cross-account identifier and must not be client-supplied.
   */
  const handleManageBilling = useCallback(
    async (row) => {
      if (!row?.id || row.purchase_kind === 'snapshot') return;
      setActionError(null);
      setActionLoading(true);
      try {
        const res = await fetch('/api/stripe/billing-portal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listSubscriptionId: row.id }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.url) {
          setActionError(data?.error || 'portal_session_failed');
          return;
        }
        trackEvent('billing_portal_opened', { list_id: row.list_id ?? null });
        window.location.href = data.url;
      } catch {
        setActionError('portal_session_failed');
      } finally {
        setActionLoading(false);
      }
    },
    [trackEvent]
  );

  const confirmPeriodEnd = confirmRow?.current_period_end
    ? fDate(confirmRow.current_period_end)
    : null;

  const totalCount = subscriptionRows.length + followingRows.length;
  const isEmpty = totalCount === 0;

  const filters = [
    { key: FILTER_ALL, label: t('pages.dashboard.settings.my_subscriptions.filter_all') },
    {
      key: FILTER_FOLLOWING,
      label: t('pages.dashboard.settings.my_subscriptions.filter_following'),
    },
    {
      key: FILTER_SUBSCRIPTIONS,
      label: t('pages.dashboard.settings.my_subscriptions.filter_subscriptions'),
    },
  ];

  return (
    <Stack {...dashboardPageSectionStackProps}>
      <Typography variant="body2" color="text.secondary">
        {t('pages.dashboard.settings.my_subscriptions.intro')}
      </Typography>

      {errMsg && <Alert severity="error">{errMsg}</Alert>}

      {loading ? (
        <SettingsMySubscriptionsListSkeleton />
      ) : (
        <>
          {/* Filter chips */}
          {!isEmpty && (
            <Box
              role="group"
              aria-label={t('pages.dashboard.settings.my_subscriptions.filter_aria')}
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

          {/* Subscription rows */}
          {visibleRows.subscriptions.length > 0 && (
            <Stack spacing={1.5}>
              {visibleRows.subscriptions.map((row) => (
                <MySubscriptionRow
                  key={row.id}
                  row={row}
                  t={t}
                  disabled={actionLoading}
                  onCancel={() => {
                    setActionError(null);
                    setConfirmRow(row);
                  }}
                  onManageBilling={() => handleManageBilling(row)}
                />
              ))}
            </Stack>
          )}

          {/* Following rows */}
          {visibleRows.following.length > 0 && (
            <Stack spacing={1.5}>
              {visibleRows.following.map((row) => (
                <FollowingRow key={row.id} row={row} t={t} />
              ))}
            </Stack>
          )}

          {/* Empty state for following filter */}
          {filter === FILTER_FOLLOWING && followingRows.length === 0 && (
            <Alert severity="info">
              {t('pages.dashboard.settings.my_subscriptions.following_empty')}
            </Alert>
          )}

          {/* Empty state for subscriptions filter */}
          {filter === FILTER_SUBSCRIPTIONS && subscriptionRows.length === 0 && (
            <Alert severity="info">{t('pages.dashboard.settings.my_subscriptions.empty')}</Alert>
          )}

          {/* All-empty state */}
          {filter === FILTER_ALL && isEmpty && !loadError && (
            <Alert severity="info">{t('pages.dashboard.settings.my_subscriptions.empty')}</Alert>
          )}
        </>
      )}

      <DeleteDialog
        open={Boolean(confirmRow)}
        onClose={() => !actionLoading && setConfirmRow(null)}
        onConfirm={handleConfirmCancel}
        isDeleting={actionLoading}
        title={t('pages.dashboard.settings.my_subscriptions.dialog_title')}
        confirmationMessage={
          confirmPeriodEnd
            ? t('pages.dashboard.settings.my_subscriptions.dialog_body', {
                date: confirmPeriodEnd,
              })
            : t('pages.dashboard.settings.my_subscriptions.dialog_body_no_date')
        }
        cancelButtonText={t('pages.dashboard.settings.my_subscriptions.dialog_keep')}
        confirmButtonText={t('pages.dashboard.settings.my_subscriptions.dialog_confirm')}
      >
        {/* Optional — never a gate on cancelling. Asking on the way out is the cheapest
            churn instrumentation available, but making it mandatory would be a dark pattern
            in the one flow where the user has already decided. */}
        <TextField
          select
          fullWidth
          size="small"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          label={t('pages.dashboard.settings.my_subscriptions.reason_label')}
          disabled={actionLoading}
          SelectProps={{ native: true }}
          InputLabelProps={{ shrink: true }}
          sx={{ mt: 1 }}
        >
          <option value="">{t('pages.dashboard.settings.my_subscriptions.reason_skip')}</option>
          {CANCELLATION_REASONS.map((r) => (
            <option key={r} value={r}>
              {t(`pages.dashboard.settings.my_subscriptions.reason_${r}`)}
            </option>
          ))}
        </TextField>

        {actionErrMsg ? (
          <Alert severity="error" variant="outlined" role="alert">
            {actionErrMsg}
          </Alert>
        ) : null}
      </DeleteDialog>
    </Stack>
  );
}

SettingsMySubscriptions.propTypes = {
  initialSubscriptions: PropTypes.object,
  initialFollowing: PropTypes.object,
};
