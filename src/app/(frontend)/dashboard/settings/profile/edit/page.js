import { getMyProfile } from 'src/auth/actions/profile-actions';
import { getDefaultTranslation } from 'src/locales/default-translations';

import { DynamicTitle } from 'src/components/dynamic-title';

import { SettingsEditPage } from 'src/sections/profile/view';

// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';

export const metadata = {
  title: getDefaultTranslation('pages.dashboard.settings.edit.heading'),
};

export default async function DashboardSettingsProfileEditPage() {
  const { profile } = await getMyProfile();

  return (
    <>
      <DynamicTitle titleKey="pages.dashboard.settings.edit.heading" />
      <SettingsEditPage initialProfile={profile} />
    </>
  );
}
