import { localizedDocumentTitle } from 'src/content-platform/page-metadata';

import { DynamicTitle } from 'src/components/dynamic-title';

import { SupabaseVerifyView } from 'src/sections/auth/supabase';

// ----------------------------------------------------------------------

export async function generateMetadata() {
  return localizedDocumentTitle('pages.auth.verify.title');
}

export default function VerifyPage() {
  return (
    <>
      <DynamicTitle titleKey="pages.auth.verify.title" />
      <SupabaseVerifyView />
    </>
  );
}
