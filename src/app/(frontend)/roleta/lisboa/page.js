import { getSiteUrl } from 'src/libs/site-url';
import { getDefaultTranslation } from 'src/locales/default-translations';

import { DynamicTitle } from 'src/components/dynamic-title';

import { PublicRouletteView } from 'src/sections/roulette/view';

// ----------------------------------------------------------------------

export const metadata = {
  title: getDefaultTranslation('pages.public.roulette.lisboa.meta_title'),
  description: getDefaultTranslation('pages.public.roulette.lisboa.metaDescription'),
  alternates: { canonical: `${getSiteUrl()}/roleta/lisboa` },
};

export default function PublicLisboaRoulettePage() {
  return (
    <>
      <DynamicTitle titleKey="pages.public.roulette.lisboa.meta_title" />
      <PublicRouletteView />
    </>
  );
}
