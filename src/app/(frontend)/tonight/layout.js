'use client';

import PropTypes from 'prop-types';

import MainLayout from 'src/layouts/main';

// ----------------------------------------------------------------------

/**
 * Public Tonight layout (MainLayout chrome).
 */
export default function TonightLayout({ children }) {
  return <MainLayout>{children}</MainLayout>;
}

TonightLayout.propTypes = {
  children: PropTypes.node,
};
