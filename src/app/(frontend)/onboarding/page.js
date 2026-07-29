import { fetchRestaurantTagsCatalog } from 'src/auth/actions/location-actions';
import { getSupabaseAuthUser } from 'src/libs/supabase/supabase-server-client';

import { OnboardingWizard } from 'src/sections/onboarding';

// Auth + cookies: never attempt static prerender (avoids DYNAMIC_SERVER_USAGE noise).
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Onboarding',
};

export default async function OnboardingPage() {
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
