'use client';

import PropTypes from 'prop-types';

import MainLayout from 'src/layouts/main';

// ----------------------------------------------------------------------

export default function ListsLayout({ children }) {
  return <MainLayout>{children}</MainLayout>;
}

ListsLayout.propTypes = {
  children: PropTypes.node,
};
