import { isAdminUserId } from 'src/libs/auth/admin-allowlist';
import { getDefaultTranslation } from 'src/locales/default-translations';
import { getSupabaseAuthUser } from 'src/libs/supabase/supabase-server-client';

import { DynamicTitle } from 'src/components/dynamic-title';

import { SettingsHubView } from 'src/sections/profile/view';

// ----------------------------------------------------------------------

export const metadata = {
  title: getDefaultTranslation('pages.dashboard.settings.title'),
};

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
