import { getSiteUrl } from 'src/libs/site-url';
import { getDefaultTranslation } from 'src/locales/default-translations';

import { DynamicTitle } from 'src/components/dynamic-title';

import { ContactView } from 'src/sections/contact/view';

// ----------------------------------------------------------------------

export const metadata = {
  title: getDefaultTranslation('pages.contact_us.title'),
  description: getDefaultTranslation('pages.contact_us.metaDescription'),
  alternates: { canonical: `${getSiteUrl()}/contact-us` },
};

export default function ContactPage() {
  return (
    <>
      <DynamicTitle titleKey="pages.contact_us.title" />
      <ContactView />
    </>
  );
}
