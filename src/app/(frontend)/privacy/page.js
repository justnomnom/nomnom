import { localizedPageMetadata } from 'src/content-platform/page-metadata';

import { DynamicTitle } from 'src/components/dynamic-title';

import { PrivacyView } from 'src/sections/legal/view';

// ----------------------------------------------------------------------

export async function generateMetadata() {
  return localizedPageMetadata({
    titleKey: 'pages.legal.privacy_title',
    descriptionKey: 'pages.legal.privacy_description',
    path: '/privacy',
  });
}

export default function PrivacyPage() {
  return (
    <>
      <DynamicTitle titleKey="pages.legal.privacy_title" />
      <PrivacyView />
    </>
  );
}
