import { getDefaultTranslation } from 'src/locales/default-translations';

import { DynamicTitle } from 'src/components/dynamic-title';

import { NotFoundView } from 'src/sections/error';

export const metadata = {
  title: getDefaultTranslation('pages.error.404.title'),
};

export default function NotFoundPage() {
  return (
    <>
      <DynamicTitle titleKey="pages.error.404.title" />
      <NotFoundView />
    </>
  );
}
