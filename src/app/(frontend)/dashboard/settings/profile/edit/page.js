import { getMyProfile } from 'src/auth/actions/profile-actions';
import { localizedDocumentTitle } from 'src/content-platform/page-metadata';

import { DynamicTitle } from 'src/components/dynamic-title';

import { SettingsEditPage } from 'src/sections/profile/view';

// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return localizedDocumentTitle('pages.dashboard.settings.edit.heading');
}

export default async function DashboardSettingsProfileEditPage() {
  const { profile } = await getMyProfile();

  return (
    <>
      <DynamicTitle titleKey="pages.dashboard.settings.edit.heading" />
      <SettingsEditPage initialProfile={profile} />
    </>
  );
}
