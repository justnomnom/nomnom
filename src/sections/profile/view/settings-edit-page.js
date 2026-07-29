'use client';

import PropTypes from 'prop-types';

import { paths } from 'src/routes/paths';

import { useAuthContext } from 'src/auth/hooks';

import SettingsEditForm from '../settings-edit-form';

// ----------------------------------------------------------------------

export default function SettingsEditPage({ initialProfile }) {
  const { user } = useAuthContext();

  return (
    <SettingsEditForm
      user={user}
      initialProfile={initialProfile}
      cancelHref={paths.dashboard.settings}
    />
  );
}

SettingsEditPage.propTypes = {
  initialProfile: PropTypes.object,
};
