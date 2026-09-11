import { localizedDocumentTitle } from 'src/content-platform/page-metadata';

import { DynamicTitle } from 'src/components/dynamic-title';

import { SettingsSupportPage } from 'src/sections/contact/view';

// ----------------------------------------------------------------------

export async function generateMetadata() {
  return localizedDocumentTitle('pages.contact_us.title');
}

export default function DashboardSettingsSupportPage() {
  return (
    <>
      <DynamicTitle titleKey="pages.contact_us.title" />
      <SettingsSupportPage />
    </>
  );
}
