import { localizedPageMetadata } from 'src/content-platform/page-metadata';

import { DynamicTitle } from 'src/components/dynamic-title';

import { PublicRouletteView } from 'src/sections/roulette/view';

// ----------------------------------------------------------------------

export async function generateMetadata() {
  return localizedPageMetadata({
    titleKey: 'pages.public.roulette.lisboa.meta_title',
    descriptionKey: 'pages.public.roulette.lisboa.metaDescription',
    path: '/roleta/lisboa',
  });
}

export default function PublicLisboaRoulettePage() {
  return (
    <>
      <DynamicTitle titleKey="pages.public.roulette.lisboa.meta_title" />
      <PublicRouletteView />
    </>
  );
}
