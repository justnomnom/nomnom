import { pageMetadata } from 'src/content-platform/page-metadata';

import { PrivacyView } from 'src/sections/legal/view';

// ----------------------------------------------------------------------

export const metadata = pageMetadata({
  title: 'Privacy policy',
  description: 'How NomNom collects, uses, and protects your personal information.',
  path: '/privacy',
});

export default function PrivacyPage() {
  return <PrivacyView />;
}
