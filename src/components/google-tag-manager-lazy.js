'use client';

import dynamic from 'next/dynamic';
import PropTypes from 'prop-types';

// Load after hydration so the root layout server chunk stays smaller and dev HMR/chunk loads are less likely to time out.
const GoogleTagManagerLazy = dynamic(
  () => import('@next/third-parties/google').then((mod) => mod.GoogleTagManager),
  { ssr: false }
);

export default function GoogleTagManagerLazyClient({ gtmId }) {
  if (!gtmId) {
    return null;
  }
  return <GoogleTagManagerLazy gtmId={gtmId} />;
}

GoogleTagManagerLazyClient.propTypes = {
  gtmId: PropTypes.string,
};
