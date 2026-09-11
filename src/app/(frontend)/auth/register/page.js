import { localizedDocumentTitle } from 'src/content-platform/page-metadata';

import { DynamicTitle } from 'src/components/dynamic-title';

import { SupabaseRegisterView } from 'src/sections/auth/supabase';

// ----------------------------------------------------------------------

export async function generateMetadata() {
  return localizedDocumentTitle('pages.auth.register.title');
}

export default function RegisterPage() {
  return (
    <>
      <DynamicTitle titleKey="pages.auth.register.title" />
      <SupabaseRegisterView />
    </>
  );
}
