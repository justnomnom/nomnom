import { localizedPageMetadata } from 'src/content-platform/page-metadata';

import { DynamicTitle } from 'src/components/dynamic-title';

import { TermsView } from 'src/sections/legal/view';

// ----------------------------------------------------------------------

export async function generateMetadata() {
  return localizedPageMetadata({
    titleKey: 'pages.legal.terms_title',
    descriptionKey: 'pages.legal.terms_description',
    path: '/terms',
  });
}

export default function TermsPage() {
  return (
    <>
      <DynamicTitle titleKey="pages.legal.terms_title" />
      <TermsView />
    </>
  );
}
