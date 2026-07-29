import { getSiteUrl } from 'src/libs/site-url';

import { TermsView } from 'src/sections/legal/view';

// ----------------------------------------------------------------------

export const metadata = {
  title: 'Terms of Service',
  description: 'The terms and conditions that govern your use of NomNom.',
  alternates: { canonical: `${getSiteUrl()}/terms` },
};

export default function TermsPage() {
  return <TermsView />;
}
