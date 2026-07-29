import { getDefaultTranslation } from 'src/locales/default-translations';

import { DynamicTitle } from 'src/components/dynamic-title';

import { SupabaseRegisterView } from 'src/sections/auth/supabase';

// ----------------------------------------------------------------------

export const metadata = {
  title: getDefaultTranslation('pages.auth.register.title'),
};

export default function RegisterPage() {
  return (
    <>
      <DynamicTitle titleKey="pages.auth.register.title" />
      <SupabaseRegisterView />
    </>
  );
}
