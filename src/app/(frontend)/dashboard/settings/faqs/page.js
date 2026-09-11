import { localizedDocumentTitle } from 'src/content-platform/page-metadata';

import { DynamicTitle } from 'src/components/dynamic-title';

import { SettingsFaqsPage } from 'src/sections/faqs/view';

// ----------------------------------------------------------------------

export async function generateMetadata() {
  return localizedDocumentTitle('pages.faqs.title');
}

export default function DashboardSettingsFaqsPage() {
  return (
    <>
      <DynamicTitle titleKey="pages.faqs.title" />
      <SettingsFaqsPage />
    </>
  );
}
