import { getDefaultTranslation } from 'src/locales/default-translations';

import { DynamicTitle } from 'src/components/dynamic-title';

import Error403View from 'src/sections/error/403-view';

// ----------------------------------------------------------------------

export const metadata = {
  title: getDefaultTranslation('pages.error.403.title'),
};

export default function Error403Page() {
  return (
    <>
      <DynamicTitle titleKey="pages.error.403.title" />
      <Error403View />
    </>
  );
}
