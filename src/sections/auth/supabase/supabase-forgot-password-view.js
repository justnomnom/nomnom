'use client';

import * as Yup from 'yup';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { useAuthContext } from 'src/auth/hooks';

import Iconify from 'src/components/iconify';
import FormProvider, { RHFTextField } from 'src/components/hook-form';

// ----------------------------------------------------------------------

export default function SupabaseForgotPasswordView() {
  const { forgotPassword } = useAuthContext();
  const { t } = useTranslate();
  const router = useRouter();

  const [errorMsg, setErrorMsg] = useState('');

  const ForgotPasswordSchema = Yup.object().shape({
    email: Yup.string()
      .required(t('pages.auth.validation.required'))
      .email(t('pages.auth.validation.email')),
  });

  const defaultValues = {
    email: '',
  };

  const methods = useForm({
    resolver: yupResolver(ForgotPasswordSchema),
    defaultValues,
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      setErrorMsg('');

      await forgotPassword?.(data.email);

      const searchParams = new URLSearchParams({
        email: data.email,
        flow: 'recovery',
      }).toString();

      const href = `${paths.auth.supabase.verify}?${searchParams}`;

      router.push(href);
    } catch (error) {
      console.error(error);
      // Generic copy only — echoing error.message could reveal whether the
      // address has an account (enumeration).
      setErrorMsg(t('pages.auth.forgot_password.submit_error'));
    }
  });

  const renderForm = (
    <Stack spacing={3} alignItems="center">
      {!!errorMsg && (
        <Alert severity="error" variant="outlined" role="alert" sx={{ width: '100%' }}>
          {errorMsg}
        </Alert>
      )}

      <RHFTextField name="email" label={t('pages.auth.forgot_password.email_label')} />

      <Button
        fullWidth
        color="primary"
        size="large"
        type="submit"
        variant="contained"
        loading={isSubmitting}
        endIcon={<Iconify icon={ic.arrowIosForwardFill} />}
        sx={{ justifyContent: 'space-between', pl: 2, pr: 1.5 }}
      >
        {t('pages.auth.forgot_password.send_request')}
      </Button>

      <Link
        component={RouterLink}
        href={paths.auth.supabase.login}
        color="inherit"
        variant="subtitle2"
        sx={{
          alignItems: 'center',
          display: 'inline-flex',
        }}
      >
        <Iconify icon={ic.arrowIosBackFill} width={16} />
        {t('pages.auth.forgot_password.return_to_sign_in')}
      </Link>
    </Stack>
  );

  const renderHead = (
    <Stack spacing={1} sx={{ mt: 3, mb: 5 }}>
      <Typography variant="h3">{t('pages.auth.forgot_password.title')}</Typography>

      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('pages.auth.forgot_password.description')}
      </Typography>
    </Stack>
  );

  return (
    <Box sx={{ width: '100%', mx: 'auto', p: { xs: 2, sm: 3 } }}>
      {' '}
      {renderHead}
      <FormProvider methods={methods} onSubmit={onSubmit}>
        {renderForm}
      </FormProvider>
    </Box>
  );
}
