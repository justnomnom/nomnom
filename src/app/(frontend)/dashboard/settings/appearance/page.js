import { localizedDocumentTitle } from 'src/content-platform/page-metadata';

import { DynamicTitle } from 'src/components/dynamic-title';

import { SettingsAppearancePage } from 'src/sections/profile/view';

// ----------------------------------------------------------------------

export async function generateMetadata() {
  return localizedDocumentTitle('pages.dashboard.settings.appearance.page_title');
}

export default function DashboardSettingsAppearancePage() {
  return (
    <>
      <DynamicTitle titleKey="pages.dashboard.settings.appearance.page_title" />
      <SettingsAppearancePage />
    </>
  );
}
