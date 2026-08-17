'use client';

import PropTypes from 'prop-types';

import MainLayout from 'src/layouts/main';

// ----------------------------------------------------------------------

/**
 * Public Table layout. Minimal chrome: a table link is a task page opened from
 * WhatsApp, so the marketing nav, the sign-up CTA (which collapses to "Join" on
 * mobile) and the tall footer are dropped.
 */
export default function TableLayout({ children }) {
  return <MainLayout minimal>{children}</MainLayout>;
}

TableLayout.propTypes = {
  children: PropTypes.node,
};
