'use client';

import PropTypes from 'prop-types';

import MainLayout from 'src/layouts/main';

// ----------------------------------------------------------------------

export default function PublicRestaurantLayout({ children }) {
  return <MainLayout>{children}</MainLayout>;
}

PublicRestaurantLayout.propTypes = {
  children: PropTypes.node,
};
