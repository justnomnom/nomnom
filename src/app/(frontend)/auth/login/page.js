import { getDefaultTranslation } from 'src/locales/default-translations';

import { DynamicTitle } from 'src/components/dynamic-title';

import { SupabaseLoginView } from 'src/sections/auth/supabase';

// ----------------------------------------------------------------------

export const metadata = {
  title: getDefaultTranslation('pages.auth.login.title'),
};

export default function LoginPage() {
  return (
    <>
      <DynamicTitle titleKey="pages.auth.login.title" />
      <SupabaseLoginView />
    </>
  );
}
