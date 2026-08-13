'use client';

import * as Yup from 'yup';
import { useForm } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { yupResolver } from '@hookform/resolvers/yup';

import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { useRouter, useSearchParams } from 'src/routes/hooks';

import { useBoolean } from 'src/hooks/use-boolean';

import { getAuthRedirectOrigin } from 'src/utils/auth-utils';
import { isValidAuthReturnPath, sanitizeAuthReturnPath } from 'src/utils/auth-return-path';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { useAuthContext } from 'src/auth/hooks';
import { PATH_AFTER_LOGIN } from 'src/config-global';
import { useAnalytics } from 'src/libs/analytics/analytics-provider';

import Iconify from 'src/components/iconify';
import FormProvider, { RHFTextField } from 'src/components/hook-form';

import SupabaseGoogleAuthShell from './supabase-google-auth-shell';
import PasswordVisibilityAdornment from './password-visibility-adornment';

// ----------------------------------------------------------------------

function isEmailNotConfirmedError(error) {
  const code = error?.code || '';
  const msg = (error?.message || '').toLowerCase();
  return code === 'email_not_confirmed' || msg.includes('email not confirmed');
}

// ----------------------------------------------------------------------

export default function SupabaseLoginView() {
  const { supabase, login, authenticated, loading: authLoading } = useAuthContext();
  const { t } = useTranslate();
  const analytics = useAnalytics();
  const router = useRouter();
  const passwordVisible = useBoolean();

  const [errorMsg, setErrorMsg] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const searchParams = useSearchParams();

  const returnTo = sanitizeAuthReturnPath(searchParams.get('returnTo'), PATH_AFTER_LOGIN);
  const emailFromQuery = searchParams.get('email') || '';
  const oauthError =
    searchParams.get('error_description') ||
    searchParams.get('error') ||
    searchParams.get('message');
  const oauthCode = searchParams.get('code');

  const LoginSchema = Yup.object().shape({
    email: Yup.string()
      .required(t('pages.auth.validation.required'))
      .email(t('pages.auth.validation.email')),
    password: Yup.string().required(t('pages.auth.validation.required')),
  });

  const methods = useForm({
    mode: 'onBlur',
    reValidateMode: 'onChange',
    resolver: yupResolver(LoginSchema),
    defaultValues: { email: emailFromQuery, password: '' },
  });

  const {
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = methods;

  useEffect(() => {
    if (!emailFromQuery) return;
    setValue('email', emailFromQuery);
  }, [emailFromQuery, setValue]);

  useEffect(() => {
    if (authLoading) return;
    if (!authenticated) return;

    router.push(returnTo);
  }, [authenticated, authLoading, router, returnTo]);

  useEffect(() => {
    if (!oauthError) return;
    if (searchParams.get('auth_error') === '1') return;
    setErrorMsg(decodeURIComponent(oauthError));
    setIsGoogleLoading(false);
  }, [oauthError, searchParams]);

  useEffect(() => {
    if (!oauthCode) return;
    setIsGoogleLoading(true);
  }, [oauthCode]);

  useEffect(() => {
    const authError = searchParams.get('auth_error');
    const errorCode = searchParams.get('error');
    const oauthDetail = searchParams.get('error_code');
    if (authError === '1' && errorCode === 'exchange_failed') {
      const msg =
        oauthDetail === 'oauth_unexpected'
          ? t('pages.auth.login.oauth_unexpected')
          : t('pages.auth.login.oauth_exchange_failed');
      setErrorMsg(msg);
      setIsGoogleLoading(false);
    }
  }, [searchParams, t]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      setErrorMsg('');
      await login?.(data.email, data.password);
    } catch (error) {
      if (isEmailNotConfirmedError(error)) {
        const q = new URLSearchParams({ email: data.email, flow: 'signup' }).toString();
        router.push(`${paths.auth.supabase.verify}?${q}`);
        return;
      }
      const errorMessage = typeof error === 'string' ? error : error?.message || 'Unknown error';
      setErrorMsg(errorMessage);

      analytics.trackError(error instanceof Error ? error : new Error(errorMessage), {
        context: 'email_password_login',
      });
    }
  });

  const handleGoogleLogin = async () => {
    try {
      setErrorMsg('');
      setIsGoogleLoading(true);

      if (!supabase) {
        throw new Error('Supabase client is not available');
      }

      const returnToPath = sanitizeAuthReturnPath(returnTo, PATH_AFTER_LOGIN);
      if (typeof document !== 'undefined') {
        const isSecure = typeof window !== 'undefined' && window.location?.protocol === 'https:';
        document.cookie = `auth_return_to=${encodeURIComponent(returnToPath)};path=/;max-age=600;SameSite=Lax${isSecure ? ';Secure' : ''}`;
      }

      const redirectToUrl = `${getAuthRedirectOrigin()}${paths.auth.supabase.callback}?returnTo=${encodeURIComponent(
        returnToPath
      )}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectToUrl,
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error(error);
      const errorMessage = typeof error === 'string' ? error : error.message || 'Unknown error';
      setErrorMsg(errorMessage);
      setIsGoogleLoading(false);
    }
  };

  const forgotHref = (() => {
    const base = paths.auth.supabase.forgotPassword;
    if (returnTo && isValidAuthReturnPath(returnTo)) {
      return `${base}?returnTo=${encodeURIComponent(returnTo)}`;
    }
    return base;
  })();

  const swapSlot = (
    <Stack
      direction="row"
      spacing={0.5}
      justifyContent="center"
      alignItems="center"
      sx={{ pt: 0.5 }}
    >
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('pages.auth.google.swap_register_prompt')}
      </Typography>
      <Link
        component={RouterLink}
        href={
          returnTo && isValidAuthReturnPath(returnTo)
            ? `${paths.auth.supabase.register}?returnTo=${encodeURIComponent(returnTo)}`
            : paths.auth.supabase.register
        }
        variant="subtitle2"
        fontWeight={700}
      >
        {t('pages.auth.google.swap_register_action')}
      </Link>
    </Stack>
  );

  return (
    <SupabaseGoogleAuthShell swapSlot={swapSlot}>
      {!!errorMsg && (
        <Alert severity="error" variant="outlined" role="alert" sx={{ mb: 0 }}>
          {errorMsg}
        </Alert>
      )}

      <Stack spacing={1} sx={{ width: '100%' }}>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            textAlign: 'center',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'text.secondary',
          }}
        >
          {t('pages.auth.register.google_fastest')}
        </Typography>

        <Button
          fullWidth
          size="large"
          color="primary"
          variant="contained"
          loading={isGoogleLoading}
          onClick={handleGoogleLogin}
          startIcon={<Iconify icon={ic.google} width={22} />}
          sx={{
            py: 2.5,
            px: 3,
            borderRadius: '2rem',
            fontWeight: 700,
            fontSize: '1rem',
            boxShadow: (theme) => theme.shadows[2],
          }}
        >
          {t('pages.auth.google.cta_google')}
        </Button>

        <Typography
          variant="body2"
          sx={{ textAlign: 'center', color: 'text.secondary', px: 1, lineHeight: 1.4 }}
        >
          {t('pages.auth.register.trust_line')}
        </Typography>
      </Stack>

      <Divider sx={{ my: 0.5 }}>{t('pages.auth.register.divider_email')}</Divider>

      <FormProvider methods={methods} onSubmit={onSubmit}>
        <Stack spacing={2}>
          <RHFTextField
            name="email"
            label={t('pages.auth.login.email_label')}
            type="email"
            autoComplete="email"
            inputProps={{ inputMode: 'email' }}
          />

          <RHFTextField
            name="password"
            label={t('pages.auth.login.password_label')}
            type={passwordVisible.value ? 'text' : 'password'}
            autoComplete="current-password"
            InputProps={{
              endAdornment: (
                <PasswordVisibilityAdornment
                  visible={passwordVisible.value}
                  onToggle={passwordVisible.onToggle}
                />
              ),
            }}
          />

          <Link
            component={RouterLink}
            href={forgotHref}
            variant="body2"
            color="text.secondary"
            sx={{ alignSelf: 'flex-end', fontWeight: 600 }}
          >
            {t('pages.auth.login.forgot_password_link')}
          </Link>

          <Button
            fullWidth
            color="inherit"
            size="large"
            type="submit"
            variant="outlined"
            loading={isSubmitting}
            sx={{
              py: 2,
              borderRadius: '2rem',
              fontWeight: 700,
              fontSize: '1rem',
              borderWidth: 2,
              '&:hover': { borderWidth: 2 },
            }}
          >
            {t('pages.auth.login.button')}
          </Button>
        </Stack>
      </FormProvider>
    </SupabaseGoogleAuthShell>
  );
}
