import { localizedPageMetadata } from 'src/content-platform/page-metadata';
import { getServerViewerLang } from 'src/libs/i18n-server';
import { getTranslation } from 'src/locales/default-translations';

import { DynamicTitle } from 'src/components/dynamic-title';
import { JsonLd } from 'src/components/content-platform/seo/json-ld.tsx';

import { FaqsView } from 'src/sections/faqs/view';

// ----------------------------------------------------------------------

const FAQ_IDS = [
  { category: 'general', id: 'general-1' },
  { category: 'general', id: 'general-2' },
  { category: 'general', id: 'general-3' },
  { category: 'general', id: 'general-4' },
  { category: 'general', id: 'general-5' },
  { category: 'payment', id: 'payment-1' },
  { category: 'payment', id: 'payment-2' },
  { category: 'getting_started', id: 'getting_started-2' },
  { category: 'getting_started', id: 'getting_started-3' },
];

export async function generateMetadata() {
  return localizedPageMetadata({
    titleKey: 'pages.faqs.list.title',
    descriptionKey: 'pages.faqs.metaDescription',
    path: '/faqs',
  });
}

export default async function FaqsPage() {
  const lang = await getServerViewerLang();
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_IDS.map(({ category, id }) => ({
      '@type': 'Question',
      name: getTranslation(lang, `pages.faqs.${category}.${id}.question`),
      acceptedAnswer: {
        '@type': 'Answer',
        text: getTranslation(lang, `pages.faqs.${category}.${id}.answer`),
      },
    })),
  };

  return (
    <>
      <JsonLd data={faqLd} />
      <DynamicTitle titleKey="pages.faqs.list.title" />
      <FaqsView />
    </>
  );
}
