import { pageMetadata } from 'src/content-platform/page-metadata';

import { TermsView } from 'src/sections/legal/view';

// ----------------------------------------------------------------------

export const metadata = pageMetadata({
  title: 'Terms of service',
  description: 'The terms and conditions that govern your use of NomNom.',
  path: '/terms',
});

export default function TermsPage() {
  return <TermsView />;
}
