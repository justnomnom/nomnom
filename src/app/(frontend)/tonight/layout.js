'use client';

import PropTypes from 'prop-types';

import MainLayout from 'src/layouts/main';

// ----------------------------------------------------------------------

/**
 * Public Tonight layout. Minimal chrome: a night link is a task page opened from
 * WhatsApp, so the marketing nav, the sign-up CTA (which collapses to "Join" on
 * mobile and collided with the night's own Join) and the tall footer are dropped.
 */
export default function TonightLayout({ children }) {
  return <MainLayout minimal>{children}</MainLayout>;
}

TonightLayout.propTypes = {
  children: PropTypes.node,
};
