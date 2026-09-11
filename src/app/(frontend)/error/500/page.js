import { localizedDocumentTitle } from 'src/content-platform/page-metadata';

import { DynamicTitle } from 'src/components/dynamic-title';

import Error500View from 'src/sections/error/500-view';

// ----------------------------------------------------------------------

export async function generateMetadata() {
  return localizedDocumentTitle('pages.error.500.title');
}

export default function Error500Page() {
  return (
    <>
      <DynamicTitle titleKey="pages.error.500.title" />
      <Error500View />
    </>
  );
}
