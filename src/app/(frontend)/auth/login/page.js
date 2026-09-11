import { localizedDocumentTitle } from 'src/content-platform/page-metadata';

import { DynamicTitle } from 'src/components/dynamic-title';

import { SupabaseLoginView } from 'src/sections/auth/supabase';

// ----------------------------------------------------------------------

export async function generateMetadata() {
  return localizedDocumentTitle('pages.auth.login.title');
}

export default function LoginPage() {
  return (
    <>
      <DynamicTitle titleKey="pages.auth.login.title" />
      <SupabaseLoginView />
    </>
  );
}
