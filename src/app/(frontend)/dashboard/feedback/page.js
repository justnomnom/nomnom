import { getDefaultTranslation } from 'src/locales/default-translations';

import { DynamicTitle } from 'src/components/dynamic-title';

import { FeedbackView } from 'src/sections/feedback';

// ----------------------------------------------------------------------

export const metadata = {
  title: getDefaultTranslation('pages.dashboard.feedback.title'),
};

export default function FeedbackPage() {
  return (
    <>
      <DynamicTitle titleKey="pages.dashboard.feedback.title" />
      <FeedbackView />
    </>
  );
}
