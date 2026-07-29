import Link from 'next/link';
import PropTypes from 'prop-types';
import { forwardRef } from 'react';

// ----------------------------------------------------------------------

/** Default View Transition type for App Router navigations (see global.css). */
export const DEFAULT_LINK_TRANSITION_TYPES = ['fade'];

/** Deeper into the hierarchy (list → restaurant, hub → drill). */
export const NAV_FORWARD_TRANSITION_TYPES = ['nav-forward'];

/** Back up the hierarchy (drill → hub, restaurant → previous). */
export const NAV_BACK_TRANSITION_TYPES = ['nav-back'];

/**
 * App-wide `next/link` wrapper. Applies a subtle `fade` view transition by default.
 * Pass `transitionTypes` to override, or `transitionTypes={null}` / `[]` to disable.
 */
const RouterLink = forwardRef(
  ({ href = '/', transitionTypes = DEFAULT_LINK_TRANSITION_TYPES, ...other }, ref) => (
    <Link
      ref={ref}
      href={href}
      {...(transitionTypes?.length ? { transitionTypes } : {})}
      {...other}
    />
  )
);

RouterLink.propTypes = {
  href: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  transitionTypes: PropTypes.arrayOf(PropTypes.string),
};

export default RouterLink;
