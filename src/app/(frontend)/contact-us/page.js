import { localizedPageMetadata } from 'src/content-platform/page-metadata';

import { DynamicTitle } from 'src/components/dynamic-title';

import { ContactView } from 'src/sections/contact/view';

// ----------------------------------------------------------------------

export async function generateMetadata() {
  return localizedPageMetadata({
    titleKey: 'pages.contact_us.title',
    descriptionKey: 'pages.contact_us.metaDescription',
    path: '/contact-us',
  });
}

export default function ContactPage() {
  return (
    <>
      <DynamicTitle titleKey="pages.contact_us.title" />
      <ContactView />
    </>
  );
}
