import { localizedDocumentTitle } from 'src/content-platform/page-metadata';

import { DynamicTitle } from 'src/components/dynamic-title';

import { FeedbackView } from 'src/sections/feedback';

// ----------------------------------------------------------------------

export async function generateMetadata() {
  return localizedDocumentTitle('pages.dashboard.feedback.title');
}

export default function FeedbackPage() {
  return (
    <>
      <DynamicTitle titleKey="pages.dashboard.feedback.title" />
      <FeedbackView />
    </>
  );
}
