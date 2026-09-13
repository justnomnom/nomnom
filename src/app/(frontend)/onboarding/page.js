import { Suspense } from 'react';

import { getSupabaseAuthUser } from 'src/libs/supabase/supabase-server-client';
import { localizedDocumentTitle } from 'src/content-platform/page-metadata';

import { DynamicTitle } from 'src/components/dynamic-title';
import { SplashScreen } from 'src/components/loading-screen';

import { OnboardingWizard } from 'src/sections/onboarding';

// Auth + cookies: never attempt static prerender (avoids DYNAMIC_SERVER_USAGE noise).
export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return localizedDocumentTitle('pages.onboarding.document_title');
}

/**
 * Streams auth under Suspense (async-suspense-boundaries).
 */
async function OnboardingPageContent() {
  const {
    data: { user },
  } = await getSupabaseAuthUser();

  return <OnboardingWizard draftUserId={user?.id ?? ''} />;
}

export default function OnboardingPage() {
  return (
    <>
      <DynamicTitle titleKey="pages.onboarding.document_title" />
      <Suspense fallback={<SplashScreen />}>
        <OnboardingPageContent />
      </Suspense>
    </>
  );
}
