'use client';

import * as Yup from 'yup';
import { useForm } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { yupResolver } from '@hookform/resolvers/yup';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { useBoolean } from 'src/hooks/use-boolean';

import { useTranslate } from 'src/locales';
import { useAuthContext } from 'src/auth/hooks';
import { useAnalytics } from 'src/libs/analytics/analytics-provider';

import FormProvider, { RHFTextField } from 'src/components/hook-form';

import PasswordVisibilityAdornment from './password-visibility-adornment';

// ----------------------------------------------------------------------

export default function SupabaseNewPasswordView() {
  const router = useRouter();
  const { t } = useTranslate();
  const [errorMsg, setErrorMsg] = useState('');
  const analytics = useAnalytics();

  const [hasHashError] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !!new URLSearchParams(window.location.hash.slice(1)).get('error');
  });

  useEffect(() => {
    if (hasHashError) {
      router.replace(paths.auth.supabase.login);
    }
  }, [hasHashError, router]);

  const { updatePassword } = useAuthContext();

  const password = useBoolean();

  const NewPasswordSchema = Yup.object().shape({
    password: Yup.string()
      .min(6, t('pages.auth.validation.password_min'))
      .required(t('pages.auth.validation.required')),
    confirmPassword: Yup.string()
      .required(t('pages.auth.validation.required'))
      .oneOf([Yup.ref('password')], t('pages.auth.validation.passwords_match')),
  });

  const defaultValues = {
    password: '',
    confirmPassword: '',
  };

  const methods = useForm({
    mode: 'onChange',
    resolver: yupResolver(NewPasswordSchema),
    defaultValues,
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  if (hasHashError) return null;

  const onSubmit = handleSubmit(async (data) => {
    try {
      await updatePassword?.(data.password);

      analytics.trackEvent('password_reset_completed');

      router.push(paths.dashboard.discover);
    } catch (error) {
      console.error(error);
      reset({ password: '', confirmPassword: '' });
      setErrorMsg(typeof error === 'string' ? error : error.message);

      // Track password update error
      analytics.trackError(error, {
        context: 'new_password_form',
        error_type: 'password_update_failed',
      });
    }
  });

  const renderHead = (
    <Stack spacing={1} sx={{ mt: 3, mb: 5 }}>
      <Typography variant="h3">{t('pages.auth.new_password.title')}</Typography>

      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('pages.auth.new_password.description')}
      </Typography>
    </Stack>
  );

  const renderForm = (
    <Stack spacing={3}>
      <RHFTextField
        name="password"
        label={t('pages.auth.new_password.password_label')}
        type={password.value ? 'text' : 'password'}
        InputProps={{
          endAdornment: (
            <PasswordVisibilityAdornment visible={password.value} onToggle={password.onToggle} />
          ),
        }}
      />

      <RHFTextField
        name="confirmPassword"
        label={t('pages.auth.new_password.confirm_password_label')}
        type={password.value ? 'text' : 'password'}
        InputProps={{
          endAdornment: (
            <PasswordVisibilityAdornment visible={password.value} onToggle={password.onToggle} />
          ),
        }}
      />

      <Button
        fullWidth
        color="primary"
        type="submit"
        size="large"
        variant="contained"
        loading={isSubmitting}
      >
        {t('pages.auth.new_password.update_password')}
      </Button>
    </Stack>
  );

  return (
    <Box sx={{ width: '100%', mx: 'auto', p: { xs: 2, sm: 3 } }}>
      {' '}
      {renderHead}
      {!!errorMsg && (
        <Alert severity="error" variant="outlined" role="alert" sx={{ textAlign: 'left', mb: 3 }}>
          {errorMsg}
        </Alert>
      )}
      <FormProvider methods={methods} onSubmit={onSubmit}>
        {renderForm}
      </FormProvider>
    </Box>
  );
}
