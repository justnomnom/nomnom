import { localizedDocumentTitle } from 'src/content-platform/page-metadata';

import { DynamicTitle } from 'src/components/dynamic-title';

import { SupabaseNewPasswordView } from 'src/sections/auth/supabase';

// ----------------------------------------------------------------------

export async function generateMetadata() {
  return localizedDocumentTitle('pages.auth.new_password.title');
}

export default function NewPasswordPage() {
  return (
    <>
      <DynamicTitle titleKey="pages.auth.new_password.title" />
      <SupabaseNewPasswordView />
    </>
  );
}
