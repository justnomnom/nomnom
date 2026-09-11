import { isAdminUserId } from 'src/libs/auth/admin-allowlist';
import { localizedDocumentTitle } from 'src/content-platform/page-metadata';
import { getSupabaseAuthUser } from 'src/libs/supabase/supabase-server-client';

import { DynamicTitle } from 'src/components/dynamic-title';

import { SettingsHubView } from 'src/sections/profile/view';

// ----------------------------------------------------------------------

export async function generateMetadata() {
  return localizedDocumentTitle('pages.dashboard.settings.title');
}

export default async function DashboardSettingsPage() {
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  const isAdmin = Boolean(user?.id && isAdminUserId(user.id));

  return (
    <>
      <DynamicTitle titleKey="pages.dashboard.settings.title" />
      <SettingsHubView isAdmin={isAdmin} />
    </>
  );
}
