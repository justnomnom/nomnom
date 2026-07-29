import PropTypes from 'prop-types';
import { redirect } from 'next/navigation';

import { paths } from 'src/routes/paths';

import {
  getSupabaseAuthUser,
  getUserOnboardingRow,
} from 'src/libs/supabase/supabase-server-client';

// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function Layout({ children }) {
  const {
    data: { user },
  } = await getSupabaseAuthUser();

  if (!user) {
    const q = new URLSearchParams({ returnTo: paths.onboarding });
    redirect(`${paths.auth.supabase.login}?${q.toString()}`);
  }

  const { data: profile } = await getUserOnboardingRow(user.id);

  if (profile?.onboarding_completed_at) {
    redirect(paths.dashboard.discover);
  }

  return <>{children}</>;
}

Layout.propTypes = {
  children: PropTypes.node,
};
