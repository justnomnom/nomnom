'use client';

import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useTranslate } from 'src/locales';
import { touchTargetSx } from 'src/theme/spacing';
import { fetchOwnedListsForBilling } from 'src/libs/lists/actions';
import { useMyStripeConnectStatus } from 'src/api/stripe-connect-status';
import { syncSubscriberListsBundlePrice } from 'src/auth/actions/stripe-list-actions';
import { LIST_PRICE_MAX_CENTS, LIST_PRICE_MIN_CENTS } from 'src/libs/stripe/list-stripe-constants';

import { hubCardShellSx } from './view/settings-shell-shared';
import { SettingsBillingPaidListsCardSkeleton } from './settings-billing-skeleton';

// ----------------------------------------------------------------------

function parseMonthlyEurosToCents(str) {
  const parsed = parseFloat(String(str).replace(',', '.'));
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 100);
}

// ----------------------------------------------------------------------

function derivePriceFromLists(lists) {
  const monetizable = (lists ?? []).filter((l) => l.visibility === 'public_subscribers');
  const pick =
    monetizable.find((l) => l.published_at && typeof l.monthly_amount_cents === 'number') ??
    monetizable.find((l) => typeof l.monthly_amount_cents === 'number');
  const c = pick?.monthly_amount_cents;
  const displayEuros = typeof c === 'number' && Number.isFinite(c) ? (c / 100).toFixed(2) : '4.99';
  return {
    bundleMonthlyEuros: displayEuros,
    savedMonthlyAmountCents:
      typeof c === 'number' && Number.isFinite(c) ? c : parseMonthlyEurosToCents(displayEuros),
  };
}

export default function SettingsBillingPaidLists({ initialConnectStatus, initialPaidListsData }) {
  const theme = useTheme();
  const { t } = useTranslate();

  const hasInitialLists = Boolean(initialPaidListsData);
  const { chargesEnabled: connectReady } = useMyStripeConnectStatus({
    fallbackData: initialConnectStatus,
  });

  const [loading, setLoading] = useState(!hasInitialLists);
  const [loadErr, setLoadErr] = useState(() => {
    if (!initialPaidListsData?.error) return null;
    return initialPaidListsData.error === 'unauthorized' ? null : initialPaidListsData.error;
  });
  const [lists, setLists] = useState(() =>
    initialPaidListsData?.error ? [] : (initialPaidListsData?.lists ?? [])
  );
  const initialPrice = derivePriceFromLists(
    initialPaidListsData?.error ? [] : (initialPaidListsData?.lists ?? [])
  );
  const [bundleMonthlyEuros, setBundleMonthlyEuros] = useState(
    hasInitialLists ? initialPrice.bundleMonthlyEuros : '4.99'
  );
  /** Last synced price from server (after load or successful save), in cents. */
  const [savedMonthlyAmountCents, setSavedMonthlyAmountCents] = useState(
    hasInitialLists ? initialPrice.savedMonthlyAmountCents : null
  );
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoadErr(null);
    const listsRes = await fetchOwnedListsForBilling();
    if (listsRes.error) {
      setLoadErr(listsRes.error === 'unauthorized' ? null : listsRes.error);
      setLists([]);
    } else {
      const nextLists = listsRes.lists ?? [];
      setLists(nextLists);
      const { bundleMonthlyEuros: euros, savedMonthlyAmountCents: cents } =
        derivePriceFromLists(nextLists);
      setBundleMonthlyEuros(euros);
      setSavedMonthlyAmountCents(cents);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (hasInitialLists) return;
    load();
  }, [hasInitialLists, load]);

  // Both freemium (public) and full-gate (public_subscribers) lists are monetizable.
  const monetizable = lists.filter(
    (l) => l.visibility === 'public' || l.visibility === 'public_subscribers'
  );
  const publishedMonetizable = monetizable.filter((l) => Boolean(l.published_at));
  const canSavePrice = connectReady && publishedMonetizable.length > 0;
  const currentPriceCents = parseMonthlyEurosToCents(bundleMonthlyEuros);
  const priceIsDirty =
    canSavePrice &&
    savedMonthlyAmountCents !== null &&
    currentPriceCents !== null &&
    currentPriceCents !== savedMonthlyAmountCents;
  const setupBlocksPrice = !connectReady && monetizable.length > 0;
  const publishBlocksPrice =
    connectReady && monetizable.length > 0 && publishedMonetizable.length === 0;

  const handleSave = useCallback(async () => {
    const parsed = parseFloat(String(bundleMonthlyEuros).replace(',', '.'));
    if (!Number.isFinite(parsed)) {
      setLoadErr(t('pages.lists.paid_price_invalid'));
      return;
    }
    const cents = Math.round(parsed * 100);
    setSaving(true);
    setLoadErr(null);
    const { error: saveErr } = await syncSubscriberListsBundlePrice({
      monthlyAmountCents: cents,
      currency: 'eur',
    });
    setSaving(false);
    if (saveErr) {
      if (saveErr === 'paid_requires_public_published') {
        setLoadErr(t('pages.dashboard.settings.billing.paid_lists_error_needs_published'));
      } else if (
        saveErr === 'connect_account_required' ||
        saveErr === 'connect_onboarding_incomplete'
      ) {
        setLoadErr(t('pages.lists.paid_error_connect'));
      } else if (saveErr === 'price_out_of_bounds' || saveErr === 'invalid_price') {
        setLoadErr(
          t('pages.lists.paid_price_bounds', {
            min: (LIST_PRICE_MIN_CENTS / 100).toFixed(2),
            max: (LIST_PRICE_MAX_CENTS / 100).toFixed(0),
          })
        );
      } else if (saveErr === 'stripe_not_configured') {
        setLoadErr(t('pages.dashboard.settings.billing.paid_lists_payments_not_configured'));
      } else {
        setLoadErr(t('pages.lists.paid_error_generic'));
      }
      return;
    }
    await load();
  }, [bundleMonthlyEuros, load, t]);

  if (loading) {
    return <SettingsBillingPaidListsCardSkeleton />;
  }

  let priceFieldHelperText;
  if (setupBlocksPrice) {
    priceFieldHelperText = undefined;
  } else if (publishBlocksPrice) {
    priceFieldHelperText = t('pages.dashboard.settings.billing.paid_lists_helper_publish_required');
  } else {
    priceFieldHelperText = t('pages.lists.paid_price_helper', {
      min: (LIST_PRICE_MIN_CENTS / 100).toFixed(2),
      max: (LIST_PRICE_MAX_CENTS / 100).toFixed(0),
    });
  }

  return (
    <Box sx={hubCardShellSx(theme)}>
      <Stack spacing={2.5} sx={{ p: 2, py: 2.25 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {t('pages.dashboard.settings.billing.paid_lists_title')}
        </Typography>

        {loadErr && (
          <Alert severity="error" variant="outlined" onClose={() => setLoadErr(null)}>
            {loadErr}
          </Alert>
        )}

        {monetizable.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t('pages.dashboard.settings.billing.paid_lists_empty')}{' '}
            <Link component={RouterLink} href={paths.dashboard.lists} underline="hover">
              {t('pages.dashboard.settings.billing.paid_lists_empty_link')}
            </Link>
          </Typography>
        ) : (
          <Stack spacing={2}>
            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>
              {t('pages.dashboard.settings.billing.paid_lists_price_section_body')}
            </Typography>
            {setupBlocksPrice && (
              <Alert severity="info" variant="outlined" sx={{ py: 0.5 }}>
                {t('pages.dashboard.settings.billing.paid_lists_alert_setup_first')}
              </Alert>
            )}
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              alignItems={{ xs: 'stretch', sm: 'flex-end' }}
              justifyContent="space-between"
            >
              <TextField
                label={t('pages.dashboard.settings.billing.paid_lists_monthly_price_label')}
                value={bundleMonthlyEuros}
                onChange={(e) => setBundleMonthlyEuros(e.target.value)}
                disabled={saving || !canSavePrice}
                fullWidth
                size="small"
                type="text"
                inputMode="decimal"
                sx={{ flex: 1, minWidth: 0, maxWidth: { sm: 300 } }}
                helperText={priceFieldHelperText}
              />
              <Button
                variant="contained"
                color="primary"
                size="small"
                onClick={() => handleSave()}
                loading={saving}
                disabled={saving || !canSavePrice || !priceIsDirty}
                sx={[
                  touchTargetSx,
                  {
                    flexShrink: 0,
                    alignSelf: { xs: 'stretch', sm: 'auto' },
                    width: { xs: '100%', sm: 'auto' },
                    minWidth: { sm: 132 },
                  },
                ]}
              >
                {t('pages.dashboard.settings.billing.paid_lists_save')}
              </Button>
            </Stack>

            <Divider sx={{ opacity: 0.65 }} />

            <Stack spacing={1.5}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                {t('pages.dashboard.settings.billing.paid_lists_included_lists_heading')}
              </Typography>
              <Stack
                direction="row"
                flexWrap="wrap"
                useFlexGap
                columnGap={1}
                rowGap={0.5}
                sx={{ alignItems: 'center' }}
              >
                {monetizable.map((row, i) => (
                  <Box
                    key={row.id}
                    component="span"
                    sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}
                  >
                    {i > 0 ? (
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.disabled"
                        sx={{ userSelect: 'none' }}
                        aria-hidden
                      >
                        ·
                      </Typography>
                    ) : null}
                    <Link
                      component={RouterLink}
                      href={paths.dashboard.listManage(row.id)}
                      variant="body2"
                      underline="hover"
                      sx={{ fontWeight: 600 }}
                    >
                      {row.name || '—'}
                    </Link>
                  </Box>
                ))}
              </Stack>
            </Stack>
          </Stack>
        )}
      </Stack>
    </Box>
  );
}

SettingsBillingPaidLists.propTypes = {
  initialConnectStatus: PropTypes.object,
  initialPaidListsData: PropTypes.object,
};
