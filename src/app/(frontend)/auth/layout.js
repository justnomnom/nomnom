import PropTypes from 'prop-types';

// ----------------------------------------------------------------------

export const metadata = {
  robots: { index: false, follow: false },
};

export default function AuthSegmentLayout({ children }) {
  return children;
}

AuthSegmentLayout.propTypes = {
  children: PropTypes.node,
};
