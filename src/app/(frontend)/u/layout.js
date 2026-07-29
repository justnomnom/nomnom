'use client';

import PropTypes from 'prop-types';

import MainLayout from 'src/layouts/main';

// ----------------------------------------------------------------------

export default function PublicUserLayout({ children }) {
  return <MainLayout>{children}</MainLayout>;
}

PublicUserLayout.propTypes = {
  children: PropTypes.node,
};
