import { localizedDocumentTitle } from 'src/content-platform/page-metadata';

import { DynamicTitle } from 'src/components/dynamic-title';

import { SettingsDeleteView } from 'src/sections/profile/view';

// ----------------------------------------------------------------------

export async function generateMetadata() {
  return localizedDocumentTitle('pages.dashboard.settings.delete_account.title');
}

export default function DashboardSettingsDeleteAccountPage() {
  return (
    <>
      <DynamicTitle titleKey="pages.dashboard.settings.delete_account.title" />
      <SettingsDeleteView />
    </>
  );
}
