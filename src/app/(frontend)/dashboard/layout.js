import PropTypes from 'prop-types';
import { redirect } from 'next/navigation';

import { paths } from 'src/routes/paths';

import {
  getSupabaseAuthUser,
  getUserOnboardingRow,
} from 'src/libs/supabase/supabase-server-client';

import DashboardClientLayout from './dashboard-client-layout';

// ----------------------------------------------------------------------

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function Layout({ children }) {
  const {
    data: { user },
  } = await getSupabaseAuthUser();

  if (user) {
    const { data: profile, error: profileError } = await getUserOnboardingRow(user.id);

    // Read failures must not be treated as "incomplete" — that loops users into onboarding.
    if (!profileError && !profile?.onboarding_completed_at) {
      redirect(paths.onboarding);
    }
  }

  return <DashboardClientLayout>{children}</DashboardClientLayout>;
}

Layout.propTypes = {
  children: PropTypes.node,
};
