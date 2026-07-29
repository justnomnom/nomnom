'use client';

import * as Yup from 'yup';
import { useForm } from 'react-hook-form';
import { useRef, useState, useEffect } from 'react';
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
import { isValidAuthReturnPath } from 'src/utils/auth-return-path';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { useAuthContext } from 'src/auth/hooks';
import { useAnalytics } from 'src/libs/analytics/analytics-provider';

import Iconify from 'src/components/iconify';
import FormProvider, { RHFTextField } from 'src/components/hook-form';

import SupabaseGoogleAuthShell from './supabase-google-auth-shell';
import PasswordVisibilityAdornment from './password-visibility-adornment';

// ----------------------------------------------------------------------

/** Detect Supabase "email already registered" errors for a recovery CTA. */
function isAlreadyRegisteredError(error) {
  const code = error?.code || '';
  const msg = (typeof error === 'string' ? error : error?.message || '').toLowerCase();
  return (
    code === 'user_already_exists' ||
    code === 'email_exists' ||
    msg.includes('already registered') ||
    msg.includes('already been registered') ||
    msg.includes('user already exists')
  );
}

// ----------------------------------------------------------------------

export default function SupabaseRegisterView() {
  const {
    supabase,
    register: registerUser,
    authenticated,
    loading: authLoading,
  } = useAuthContext();
  const { t } = useTranslate();
  const analytics = useAnalytics();
  const router = useRouter();
  const passwordVisible = useBoolean();
  const formStartedRef = useRef(false);
  const blurredFieldsRef = useRef(new Set());

  const [errorMsg, setErrorMsg] = useState('');
  const [alreadyRegisteredEmail, setAlreadyRegisteredEmail] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const searchParams = useSearchParams();
  const rawReturnTo = searchParams.get('returnTo') || paths.dashboard.discover;
  const returnTo = isValidAuthReturnPath(rawReturnTo) ? rawReturnTo : paths.dashboard.discover;

  const oauthError =
    searchParams.get('error_description') ||
    searchParams.get('error') ||
    searchParams.get('message');

  const RegisterSchema = Yup.object().shape({
    email: Yup.string()
      .required(t('pages.auth.validation.required'))
      .email(t('pages.auth.validation.email')),
    password: Yup.string()
      .min(6, t('pages.auth.validation.password_min'))
      .required(t('pages.auth.validation.required')),
  });

  const methods = useForm({
    mode: 'onBlur',
    reValidateMode: 'onChange',
    resolver: yupResolver(RegisterSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  useEffect(() => {
    analytics.trackEvent('signup_form_viewed', {});
  }, [analytics]);

  useEffect(() => {
    if (authLoading) return;
    if (!authenticated) return;

    router.push(returnTo);
  }, [authenticated, authLoading, router, returnTo]);

  useEffect(() => {
    if (!oauthError) return;
    setErrorMsg(decodeURIComponent(oauthError));
    setIsGoogleLoading(false);
  }, [oauthError]);

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

  const markFormStarted = (source) => {
    if (formStartedRef.current) return;
    formStartedRef.current = true;
    analytics.trackEvent('signup_form_started', { source });
  };

  const handleFieldBlur = (field) => {
    markFormStarted('email');
    if (blurredFieldsRef.current.has(field)) return;
    blurredFieldsRef.current.add(field);
    analytics.trackEvent('signup_field_blurred', { field });
  };

  const onSubmit = handleSubmit(async (data) => {
    try {
      setErrorMsg('');
      setAlreadyRegisteredEmail('');
      analytics.trackSignup('email', {
        destination: paths.auth.supabase.verify,
        return_to: returnTo,
      });
      const result = await registerUser?.(data.email, data.password, returnTo);

      if (result?.session) {
        analytics.trackEvent('signup_session_ready', {
          method: 'email',
          skipped_verify: true,
        });
        router.push(returnTo);
        return;
      }

      const q = new URLSearchParams({ email: data.email, flow: 'signup' }).toString();
      router.push(`${paths.auth.supabase.verify}?${q}`);
    } catch (error) {
      console.error(error);
      if (isAlreadyRegisteredError(error)) {
        setAlreadyRegisteredEmail(data.email);
        setErrorMsg(t('pages.auth.register.already_registered'));
        return;
      }
      const errorMessage = typeof error === 'string' ? error : error?.message || 'Unknown error';
      setErrorMsg(errorMessage);

      analytics.trackError(error instanceof Error ? error : new Error(errorMessage), {
        context: 'email_password_register',
        return_to: returnTo,
      });
    }
  });

  const handleGoogleSignup = async () => {
    try {
      setErrorMsg('');
      setAlreadyRegisteredEmail('');
      setIsGoogleLoading(true);
      markFormStarted('google');
      analytics.trackSignup('google', {
        destination: paths.auth.supabase.callback,
        return_to: returnTo,
      });

      if (!supabase) {
        throw new Error('Supabase client is not available');
      }

      const returnToPath = isValidAuthReturnPath(returnTo) ? returnTo : paths.dashboard.discover;
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

      analytics.trackError(error instanceof Error ? error : new Error(errorMessage), {
        context: 'google_oauth_register',
        return_to: returnTo,
      });
    }
  };

  const loginHref = (() => {
    const q = new URLSearchParams();
    if (alreadyRegisteredEmail) q.set('email', alreadyRegisteredEmail);
    if (isValidAuthReturnPath(returnTo)) q.set('returnTo', returnTo);
    const qs = q.toString();
    return qs ? `${paths.auth.supabase.login}?${qs}` : paths.auth.supabase.login;
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
        {t('pages.auth.google.swap_login_prompt')}
      </Typography>
      <Link
        component={RouterLink}
        href={
          isValidAuthReturnPath(returnTo)
            ? `${paths.auth.supabase.login}?returnTo=${encodeURIComponent(returnTo)}`
            : paths.auth.supabase.login
        }
        variant="subtitle2"
        fontWeight={700}
      >
        {t('pages.auth.google.swap_login_action')}
      </Link>
    </Stack>
  );

  return (
    <SupabaseGoogleAuthShell swapSlot={swapSlot}>
      {!!errorMsg && (
        <Alert severity="error" variant="outlined" role="alert" sx={{ mb: 0 }}>
          {errorMsg}
          {alreadyRegisteredEmail ? (
            <>
              {' '}
              <Link component={RouterLink} href={loginHref} fontWeight={700} color="inherit">
                {t('pages.auth.register.already_registered_action')}
              </Link>
            </>
          ) : null}
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
          onClick={handleGoogleSignup}
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
            label={t('pages.auth.register.email_label')}
            type="email"
            autoComplete="email"
            inputProps={{ inputMode: 'email' }}
            onFocus={() => markFormStarted('email')}
            onBlur={() => handleFieldBlur('email')}
          />

          <RHFTextField
            name="password"
            label={t('pages.auth.register.password_label')}
            type={passwordVisible.value ? 'text' : 'password'}
            helperText={t('pages.auth.register.password_helper')}
            autoComplete="new-password"
            onFocus={() => markFormStarted('email')}
            onBlur={() => handleFieldBlur('password')}
            InputProps={{
              endAdornment: (
                <PasswordVisibilityAdornment
                  visible={passwordVisible.value}
                  onToggle={passwordVisible.onToggle}
                />
              ),
            }}
          />

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
            {t('pages.auth.register.submit')}
          </Button>
        </Stack>
      </FormProvider>
    </SupabaseGoogleAuthShell>
  );
}
