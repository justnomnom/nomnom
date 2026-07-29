import { getSiteUrl } from 'src/libs/site-url';

import { PrivacyView } from 'src/sections/legal/view';

// ----------------------------------------------------------------------

export const metadata = {
  title: 'Privacy Policy',
  description: 'How NomNom collects, uses, and protects your personal information.',
  alternates: { canonical: `${getSiteUrl()}/privacy` },
};

export default function PrivacyPage() {
  return <PrivacyView />;
}
