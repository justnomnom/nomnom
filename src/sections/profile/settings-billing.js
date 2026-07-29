'use client';

import PropTypes from 'prop-types';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { useAnalytics } from 'src/libs/analytics/analytics-provider';
import { getMyStripeConnectStatus } from 'src/auth/actions/stripe-list-actions';

import { HubNavRow } from './view/settings-hub-view';
import SettingsBillingPaidLists from './settings-billing-paid-lists';
import { SettingsBillingStripeCardSkeleton } from './settings-billing-skeleton';
import {
  hubCardShellSx,
  dashboardSubsectionStackProps,
  dashboardPageSectionStackProps,
  dashboardMobileStretchButtonSx,
} from './view/settings-shell-shared';

// ----------------------------------------------------------------------

export default function SettingsBilling({ initialConnectStatus, initialPaidListsData }) {
  const theme = useTheme();
  const { t } = useTranslate();
  const { trackEvent } = useAnalytics();
  const searchParams = useSearchParams();

  const hasInitialConnect = Boolean(initialConnectStatus);

  const [connectReady, setConnectReady] = useState(
    () => !initialConnectStatus?.error && Boolean(initialConnectStatus?.chargesEnabled)
  );
  const [payoutsWithoutCharges, setPayoutsWithoutCharges] = useState(
    () =>
      !initialConnectStatus?.error &&
      Boolean(initialConnectStatus?.payoutsEnabled && !initialConnectStatus?.chargesEnabled)
  );
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectErr, setConnectErr] = useState(null);
  const [connectStatusReady, setConnectStatusReady] = useState(hasInitialConnect);

  const loadConnect = useCallback(async () => {
    setConnectErr(null);
    const r = await getMyStripeConnectStatus();
    if (!r.error) {
      setConnectReady(Boolean(r.chargesEnabled));
      setPayoutsWithoutCharges(Boolean(r.payoutsEnabled && !r.chargesEnabled));
    }
    setConnectStatusReady(true);
  }, []);

  useEffect(() => {
    if (hasInitialConnect) return;
    loadConnect();
  }, [hasInitialConnect, loadConnect]);

  useEffect(() => {
    const c = searchParams.get('connect');
    if (c === 'return' || c === 'refresh') {
      loadConnect();
    }
  }, [searchParams, loadConnect]);

  const handleConnectStripe = useCallback(async () => {
    setConnectLoading(true);
    setConnectErr(null);
    let status = 'link';
    if (connectReady) status = 'manage';
    else if (payoutsWithoutCharges) status = 'update';
    trackEvent('stripe_connect_started', { status });
    try {
      const res = await fetch('/api/stripe/connect/onboard', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setConnectErr(data.stripe_message || data.error || 'connect_failed');
        trackEvent('stripe_connect_failed', {
          reason: data.error || 'http_error',
        });
        return;
      }
      if (data.url) window.location.href = data.url;
    } finally {
      setConnectLoading(false);
    }
  }, [connectReady, payoutsWithoutCharges, trackEvent]);

  let payoutStatusMessageKey = 'pages.dashboard.settings.billing.payout_account_status_not_linked';
  let payoutStatusMessageColor = 'text.secondary';
  if (connectReady) {
    payoutStatusMessageKey = 'pages.dashboard.settings.billing.payout_account_status_ready';
    payoutStatusMessageColor = 'success.main';
  } else if (payoutsWithoutCharges) {
    payoutStatusMessageKey = 'pages.dashboard.settings.billing.payout_account_status_finish_setup';
    payoutStatusMessageColor = 'warning.main';
  }

  let payoutButtonKey = 'pages.dashboard.settings.billing.payout_account_button_link';
  if (connectReady) {
    payoutButtonKey = 'pages.dashboard.settings.billing.payout_account_button_manage';
  } else if (payoutsWithoutCharges) {
    payoutButtonKey = 'pages.dashboard.settings.billing.payout_account_button_update';
  }

  return (
    <Stack {...dashboardPageSectionStackProps}>
      {!connectStatusReady ? (
        <SettingsBillingStripeCardSkeleton />
      ) : (
        <Box sx={hubCardShellSx(theme)}>
          <Stack {...dashboardSubsectionStackProps} sx={{ p: 2.25 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {t('pages.dashboard.settings.billing.creator_payouts_title')}
            </Typography>
            <Typography
              variant="body2"
              role="status"
              sx={{
                lineHeight: 1.55,
                color: payoutStatusMessageColor,
                fontWeight: 600,
              }}
            >
              {t(payoutStatusMessageKey)}
            </Typography>
            {connectReady && (
              <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.55 }}>
                {t('pages.dashboard.settings.billing.payout_account_ready_follow_up')}
              </Typography>
            )}
            <Button
              variant="contained"
              color="primary"
              size="small"
              onClick={handleConnectStripe}
              loading={connectLoading}
              disabled={connectLoading}
              sx={dashboardMobileStretchButtonSx}
            >
              {t(payoutButtonKey)}
            </Button>
            {connectErr && (
              <Alert severity="error" variant="outlined">
                {connectErr}
              </Alert>
            )}
          </Stack>
        </Box>
      )}

      <SettingsBillingPaidLists
        initialConnectStatus={initialConnectStatus}
        initialPaidListsData={initialPaidListsData}
      />

      <Box sx={hubCardShellSx(theme)}>
        <HubNavRow
          href={paths.dashboard.settingsSupport}
          icon={ic.letterLinear}
          title={t('pages.dashboard.settings.billing.contact_cta')}
        />
      </Box>
    </Stack>
  );
}

SettingsBilling.propTypes = {
  initialConnectStatus: PropTypes.object,
  initialPaidListsData: PropTypes.object,
};
