import { getDefaultTranslation } from 'src/locales/default-translations';

import { DynamicTitle } from 'src/components/dynamic-title';

import Error500View from 'src/sections/error/500-view';

// ----------------------------------------------------------------------

export const metadata = {
  title: getDefaultTranslation('pages.error.500.title'),
};

export default function Error500Page() {
  return (
    <>
      <DynamicTitle titleKey="pages.error.500.title" />
      <Error500View />
    </>
  );
}
