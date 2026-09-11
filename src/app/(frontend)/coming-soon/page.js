import { localizedDocumentTitle } from 'src/content-platform/page-metadata';

import { DynamicTitle } from 'src/components/dynamic-title';

import ComingSoonView from 'src/sections/coming-soon/view';

// ----------------------------------------------------------------------

export async function generateMetadata() {
  return localizedDocumentTitle('pages.coming_soon.title');
}

export default function ComingSoonPage() {
  return (
    <>
      <DynamicTitle titleKey="pages.coming_soon.title" />
      <ComingSoonView />
    </>
  );
}
