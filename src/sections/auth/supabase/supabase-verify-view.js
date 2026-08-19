'use client';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useSearchParams } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { getAuthRedirectOrigin } from 'src/utils/auth-utils';

import { useTranslate } from 'src/locales';
import { useAuthContext } from 'src/auth/hooks';
import { touchTargetSx } from 'src/theme/spacing';
import { useAnalytics } from 'src/libs/analytics/analytics-provider';
import { compactPageActionsStackSx } from 'src/theme/responsive-button-sx';

// ----------------------------------------------------------------------

const RESEND_COOLDOWN_SECONDS = 60;

const MAIL_INBOX_LINKS = [
  { key: 'gmail', href: 'https://mail.google.com/mail/' },
  { key: 'outlook', href: 'https://outlook.live.com/mail/' },
];

// ----------------------------------------------------------------------

export default function SupabaseVerifyView() {
  const { t } = useTranslate();
  const analytics = useAnalytics();
  const { supabase, forgotPassword } = useAuthContext();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [cooldownLeft, setCooldownLeft] = useState(0);

  const email = searchParams.get('email');
  const flow = searchParams.get('flow') === 'recovery' ? 'recovery' : 'signup';

  const confirmRedirect = `${getAuthRedirectOrigin()}${paths.auth.supabase.callback}?returnTo=${encodeURIComponent(paths.dashboard.discover)}`;

  useEffect(() => {
    analytics.trackEvent('signup_verify_viewed', { flow });
  }, [analytics, flow]);

  useEffect(() => {
    if (cooldownLeft <= 0) return undefined;
    const id = window.setInterval(() => {
      setCooldownLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooldownLeft]);

  const handleResend = useCallback(async () => {
    try {
      if (!email || cooldownLeft > 0) {
        return;
      }
      setLoading(true);
      setErrorMsg('');
      setSuccessMsg('');

      if (flow === 'recovery') {
        await forgotPassword?.(email);
      } else {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email,
          options: {
            emailRedirectTo: confirmRedirect,
          },
        });
        if (error) {
          console.error(error);
          setErrorMsg(typeof error === 'string' ? error : error?.message || 'Unknown error');
          setLoading(false);
          return;
        }
      }

      setSuccessMsg(
        flow === 'recovery'
          ? t('pages.auth.verify.resend_success_recovery')
          : t('pages.auth.verify.resend_success')
      );
      setCooldownLeft(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      console.error(error);
      setErrorMsg(typeof error === 'string' ? error : error?.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [supabase, email, flow, forgotPassword, confirmRedirect, cooldownLeft, t]);

  const title =
    flow === 'recovery' ? t('pages.auth.verify.title_recovery') : t('pages.auth.verify.title');

  const description =
    flow === 'recovery'
      ? t('pages.auth.verify.description_recovery')
      : t('pages.auth.verify.description');

  const checkInbox =
    flow === 'recovery'
      ? t('pages.auth.verify.check_inbox_recovery')
      : t('pages.auth.verify.check_inbox');

  const loginHref = email
    ? `${paths.auth.supabase.login}?email=${encodeURIComponent(email)}`
    : paths.auth.supabase.login;

  const registerHref = paths.auth.supabase.register;

  const resendLabel =
    flow === 'recovery'
      ? t('pages.auth.verify.resend_recovery')
      : t('pages.auth.verify.resend_email');

  const resendButtonLabel =
    cooldownLeft > 0
      ? t('pages.auth.verify.resend_cooldown', { seconds: cooldownLeft })
      : resendLabel;

  const renderHead = (
    <>
      <Typography variant="h3" sx={{ mb: 1 }}>
        {title}
      </Typography>

      <Stack spacing={1} sx={{ color: 'text.secondary', typography: 'body2', mb: 3 }}>
        <Box component="span">{description}</Box>
        {email ? (
          <Box component="strong" sx={{ color: 'text.primary' }}>
            {email}
          </Box>
        ) : null}
        <Box component="div">{checkInbox}</Box>
        {flow === 'signup' ? <Box component="div">{t('pages.auth.verify.spam_tip')}</Box> : null}
      </Stack>
    </>
  );

  return (
    <Box sx={{ width: '100%', mx: 'auto', p: { xs: 2, sm: 3 } }}>
      {renderHead}

      {!!successMsg && (
        <Alert severity="success" variant="outlined" role="status" sx={{ mb: 2 }}>
          {successMsg}
        </Alert>
      )}

      {!!errorMsg && (
        <Alert severity="error" variant="outlined" role="alert" sx={{ mb: 2 }}>
          {errorMsg}
        </Alert>
      )}

      {flow === 'signup' ? (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
          {MAIL_INBOX_LINKS.map((item) => (
            <Button
              key={item.key}
              component="a"
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              size="small"
              variant="outlined"
              color="inherit"
      sx={touchTargetSx}
    >
              {t(`pages.auth.verify.open_${item.key}`)}
            </Button>
          ))}
        </Stack>
      ) : null}

      <Stack
        spacing={2}
        justifyContent="center"
        sx={{ ...compactPageActionsStackSx, mt: 0, maxWidth: 'none' }}
      >
        <Button
          component={RouterLink}
          href={loginHref}
          size="large"
          color="primary"
          variant="contained"
        >
          {t('pages.auth.verify.verified_sign_in')}
        </Button>

        {email ? (
          <Button
            size="large"
            variant="outlined"
            loading={loading}
            disabled={cooldownLeft > 0}
            onClick={handleResend}
          >
            {resendButtonLabel}
          </Button>
        ) : null}

        {flow === 'signup' ? (
          <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary' }}>
            {t('pages.auth.verify.wrong_email_prompt')}{' '}
            <Link component={RouterLink} href={registerHref} fontWeight={700}>
              {t('pages.auth.verify.wrong_email_action')}
            </Link>
          </Typography>
        ) : null}
      </Stack>
    </Box>
  );
}
