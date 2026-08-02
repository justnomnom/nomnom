import { pageMetadata } from 'src/content-platform/page-metadata';
import { getDefaultTranslation } from 'src/locales/default-translations';

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

export const metadata = pageMetadata({
  title: getDefaultTranslation('pages.faqs.title'),
  description: getDefaultTranslation('pages.faqs.metaDescription'),
  path: '/faqs',
});

export default function FaqsPage() {
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_IDS.map(({ category, id }) => ({
      '@type': 'Question',
      name: getDefaultTranslation(`pages.faqs.${category}.${id}.question`),
      acceptedAnswer: {
        '@type': 'Answer',
        text: getDefaultTranslation(`pages.faqs.${category}.${id}.answer`),
      },
    })),
  };

  return (
    <>
      <JsonLd data={faqLd} />
      <DynamicTitle titleKey="pages.faqs.title" />
      <FaqsView />
    </>
  );
}
