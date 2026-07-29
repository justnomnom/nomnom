import { getDefaultTranslation } from 'src/locales/default-translations';

import { DynamicTitle } from 'src/components/dynamic-title';

import { SupabaseNewPasswordView } from 'src/sections/auth/supabase';

// ----------------------------------------------------------------------

export const metadata = {
  title: getDefaultTranslation('pages.auth.new_password.title'),
};

export default function NewPasswordPage() {
  return (
    <>
      <DynamicTitle titleKey="pages.auth.new_password.title" />
      <SupabaseNewPasswordView />
    </>
  );
}
