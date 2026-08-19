'use client';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import CardActionArea from '@mui/material/CardActionArea';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { useAuthContext } from 'src/auth/hooks';
import { touchTargetSx } from 'src/theme/spacing';
import { deleteAccount } from 'src/auth/actions/auth-actions';
import { useAnalytics } from 'src/libs/analytics/analytics-provider';
import { getCreatorListStats } from 'src/auth/actions/creator-subscribers-actions';

import Iconify from 'src/components/iconify';
import DeleteDialog from 'src/components/custom-dialog/delete-dialog';

import SettingsDrillShell from './settings-drill-shell';
import {
  ICON_TILE,
  ROUNDED_CARD,
  SHELL_HUB_ICON,
  hubCardShellSx,
  HUB_ROW_MIN_HEIGHT,
  settingsShellRowHoverBg,
  dashboardPageSectionStackProps,
} from './settings-shell-shared';

// ----------------------------------------------------------------------

/**
 * Server error codes → copy. Deletion now tears Stripe down first and aborts on failure,
 * so these are states where *nothing was deleted* — the message has to say so, otherwise
 * a user who sees an error assumes their account is half-gone.
 *
 * @param {string | undefined} code
 * @param {(key: string) => string} t
 * @returns {string}
 */
function deleteAccountErrorMessage(code, t) {
  const base = 'pages.dashboard.settings.delete_account';
  switch (code) {
    case 'connect_balance_outstanding':
      return t(`${base}.error_connect_balance`);
    case 'stripe_cancel_failed':
    case 'stripe_teardown_lookup_failed':
      return t(`${base}.error_stripe_cancel`);
    case 'stripe_not_configured':
      return t(`${base}.error_stripe_unavailable`);
    case 'has_active_subscribers':
      return t(`${base}.subscribers_block_other`);
    default:
      return t(`${base}.error`);
  }
}

export default function SettingsDeleteView() {
  const theme = useTheme();
  const { t } = useTranslate();
  const router = useRouter();
  const { logout } = useAuthContext();
  const { trackEvent } = useAnalytics();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeSubscribers, setActiveSubscribers] = useState(null); // null = loading
  const [deleteError, setDeleteError] = useState(null);

  const rowHoverBg = settingsShellRowHoverBg(theme);

  useEffect(() => {
    getCreatorListStats().then((res) => {
      setActiveSubscribers(res.error ? 0 : (res.activeSubscribers ?? 0));
    });
  }, []);

  const hasActiveSubscribers = activeSubscribers !== null && activeSubscribers > 0;

  const handleDeleteAccount = useCallback(async () => {
    setIsDeleting(true);
    setDeleteError(null);
    trackEvent('account_deletion_started');
    try {
      const result = await deleteAccount();
      if (result.success) {
        trackEvent('account_deletion_completed');
        try {
          await logout();
        } catch (logoutError) {
          console.warn('Logout after account deletion:', logoutError);
        }
        router.replace('/');
      } else {
        trackEvent('account_deletion_failed', { reason: result.error || 'unknown' });
        setDeleteError(deleteAccountErrorMessage(result.error, t));
        setIsDeleting(false);
        setDeleteDialogOpen(false);
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      trackEvent('account_deletion_failed', { reason: error?.message || 'exception' });
      setDeleteError(t('pages.dashboard.settings.delete_account.error'));
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  }, [logout, router, t, trackEvent]);

  return (
    <>
      <SettingsDrillShell title={t('pages.dashboard.settings.tabs.delete_account')}>
        <Stack {...dashboardPageSectionStackProps}>
          <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.55, px: 0.5 }}>
            {t('pages.dashboard.settings.delete_account.description')}
          </Typography>

          {deleteError ? (
            <Alert severity="error" variant="outlined" onClose={() => setDeleteError(null)}>
              {deleteError}
            </Alert>
          ) : null}

          {hasActiveSubscribers && (
            <Alert
              severity="warning"
              action={
                <Button
                  size="small"
                  component={RouterLink}
                  href={paths.dashboard.settingsSubscribers}
                  sx={[touchTargetSx, { width: { xs: '100%', sm: 'auto' } }]}
                >
                  {t('pages.dashboard.settings.delete_account.subscribers_cta')}
                </Button>
              }
            >
              {t('pages.dashboard.settings.delete_account.subscribers_block', {
                count: activeSubscribers,
              })}
            </Alert>
          )}

          <Box sx={hubCardShellSx(theme)}>
            <CardActionArea
              component="button"
              type="button"
              disabled={isDeleting || hasActiveSubscribers || activeSubscribers === null}
              onClick={() => setDeleteDialogOpen(true)}
              sx={{
                px: 2,
                py: 2.25,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                minHeight: HUB_ROW_MIN_HEIGHT,
                borderRadius: ROUNDED_CARD,
                bgcolor: 'transparent',
                WebkitTapHighlightColor: 'transparent',
                width: '100%',
                textAlign: 'left',
                transition: theme.transitions.create(['background-color', 'transform'], {
                  duration: theme.transitions.duration.shorter,
                }),
                '&:hover': {
                  bgcolor: rowHoverBg,
                },
                '&:hover .settings-delete-chevron': {
                  transform: 'translateX(4px)',
                },
                '&:active': {
                  bgcolor: rowHoverBg,
                },
                '&:active .settings-delete-chevron': {
                  transform: 'translateX(4px)',
                },
                '&.Mui-disabled': {
                  opacity: 0.55,
                },
              }}
            >
              <Stack direction="row" alignItems="center" spacing={2} sx={{ minWidth: 0, flex: 1 }}>
                <Box
                  sx={{
                    width: ICON_TILE,
                    height: ICON_TILE,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: alpha(theme.palette.error.main, 0.12),
                    color: 'error.main',
                    flexShrink: 0,
                  }}
                >
                  <Iconify icon={ic.trashLinear} width={SHELL_HUB_ICON} />
                </Box>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700, fontSize: '0.875rem', color: 'error.main' }}
                >
                  {t('pages.dashboard.settings.delete_account.button')}
                </Typography>
              </Stack>
              <Iconify
                icon={ic.chevronRightLinear}
                width={SHELL_HUB_ICON}
                className="settings-delete-chevron"
                sx={{
                  color: 'text.secondary',
                  flexShrink: 0,
                  transition: theme.transitions.create('transform', {
                    duration: theme.transitions.duration.standard,
                  }),
                }}
              />
            </CardActionArea>
          </Box>
        </Stack>
      </SettingsDrillShell>

      <DeleteDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteAccount}
        isDeleting={isDeleting}
        title={t('pages.dashboard.settings.delete_account.dialog.title')}
        confirmationMessage={t('pages.dashboard.settings.delete_account.dialog.confirmation')}
        warningMessage={t('pages.dashboard.settings.delete_account.dialog.warning')}
        confirmButtonText={t('pages.dashboard.settings.delete_account.dialog.confirm_button')}
        requireConfirmationText={t(
          'pages.dashboard.settings.delete_account.dialog.input_placeholder'
        )}
        confirmationInputLabel={t('pages.dashboard.settings.delete_account.dialog.input_label')}
        confirmationInputPlaceholder={t(
          'pages.dashboard.settings.delete_account.dialog.input_placeholder'
        )}
      />
    </>
  );
}
