import { Suspense } from 'react';

import { fetchRestaurantTagsCatalog } from 'src/auth/actions/location-actions';
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
 * Streams auth + tag catalog under Suspense (async-suspense-boundaries).
 */
async function OnboardingPageContent() {
  const [authResult, tagsResult] = await Promise.all([
    getSupabaseAuthUser(),
    fetchRestaurantTagsCatalog(),
  ]);
  const {
    data: { user },
  } = authResult;
  const { tags } = tagsResult;

  return <OnboardingWizard draftUserId={user?.id ?? ''} initialTags={tags ?? []} />;
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
