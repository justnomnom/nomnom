import { getDefaultTranslation } from 'src/locales/default-translations';

import { DynamicTitle } from 'src/components/dynamic-title';

import { SupabaseVerifyView } from 'src/sections/auth/supabase';

// ----------------------------------------------------------------------

export const metadata = {
  title: getDefaultTranslation('pages.auth.verify.title'),
};

export default function VerifyPage() {
  return (
    <>
      <DynamicTitle titleKey="pages.auth.verify.title" />
      <SupabaseVerifyView />
    </>
  );
}
