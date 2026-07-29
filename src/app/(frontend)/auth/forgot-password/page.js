import { getDefaultTranslation } from 'src/locales/default-translations';

import { DynamicTitle } from 'src/components/dynamic-title';

import { SupabaseForgotPasswordView } from 'src/sections/auth/supabase';

// ----------------------------------------------------------------------

export const metadata = {
  title: getDefaultTranslation('pages.auth.forgot_password.title'),
};

export default function ForgotPasswordPage() {
  return (
    <>
      <DynamicTitle titleKey="pages.auth.forgot_password.title" />
      <SupabaseForgotPasswordView />
    </>
  );
}
