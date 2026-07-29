import PropTypes from 'prop-types';
import { notFound, redirect } from 'next/navigation';

import { paths } from 'src/routes/paths';

import { isAdminUserId } from 'src/libs/auth/admin-allowlist';
import { getSupabaseAuthUser } from 'src/libs/supabase/supabase-server-client';

// ----------------------------------------------------------------------

export default async function AdminSectionLayout({ children }) {
  const {
    data: { user },
  } = await getSupabaseAuthUser();

  if (!user?.id) {
    redirect(paths.auth.supabase.login);
  }

  if (!isAdminUserId(user.id)) {
    notFound();
  }

  return children;
}

AdminSectionLayout.propTypes = {
  children: PropTypes.node,
};
