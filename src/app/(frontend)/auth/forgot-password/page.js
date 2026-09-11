import { localizedDocumentTitle } from 'src/content-platform/page-metadata';

import { DynamicTitle } from 'src/components/dynamic-title';

import { SupabaseForgotPasswordView } from 'src/sections/auth/supabase';

// ----------------------------------------------------------------------

export async function generateMetadata() {
  return localizedDocumentTitle('pages.auth.forgot_password.title');
}

export default function ForgotPasswordPage() {
  return (
    <>
      <DynamicTitle titleKey="pages.auth.forgot_password.title" />
      <SupabaseForgotPasswordView />
    </>
  );
}
