import { localizedDocumentTitle } from 'src/content-platform/page-metadata';

import { DynamicTitle } from 'src/components/dynamic-title';

import { NotFoundView } from 'src/sections/error';

export async function generateMetadata() {
  return localizedDocumentTitle('pages.error.404.title');
}

export default function NotFoundPage() {
  return (
    <>
      <DynamicTitle titleKey="pages.error.404.title" />
      <NotFoundView />
    </>
  );
}
