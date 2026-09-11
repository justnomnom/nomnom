import { localizedDocumentTitle } from 'src/content-platform/page-metadata';

import { DynamicTitle } from 'src/components/dynamic-title';

import Error403View from 'src/sections/error/403-view';

// ----------------------------------------------------------------------

export async function generateMetadata() {
  return localizedDocumentTitle('pages.error.403.title');
}

export default function Error403Page() {
  return (
    <>
      <DynamicTitle titleKey="pages.error.403.title" />
      <Error403View />
    </>
  );
}
