import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

// ----------------------------------------------------------------------

export default function BreadcrumbsLink({ link, activeLast, disabled }) {
  const styles = {
    typography: 'body2',
    alignItems: 'center',
    color: 'text.primary',
    display: 'inline-flex',
    ...(disabled &&
      !activeLast && {
        cursor: 'default',
        pointerEvents: 'none',
        color: 'text.disabled',
      }),
  };

  const renderContent = (
    <>
      {link.icon && (
        <Box
          component="span"
          sx={{
            mr: 1,
            display: 'inherit',
            '& svg': { width: 20, height: 20 },
          }}
        >
          {link.icon}
        </Box>
      )}

      {link.name}
    </>
  );

  /** Current page crumb: not a link — avoids inert anchors and satisfies aria-current. */
  if (link.href && disabled && !activeLast) {
    return (
      <Typography
        component="span"
        aria-current="page"
        sx={{
          typography: 'body2',
          alignItems: 'center',
          color: 'text.primary',
          display: 'inline-flex',
          fontWeight: 600,
        }}
      >
        {renderContent}
      </Typography>
    );
  }

  if (link.href) {
    return (
      <Link component={RouterLink} href={link.href} sx={styles}>
        {renderContent}
      </Link>
    );
  }

  return <Box sx={styles}> {renderContent} </Box>;
}

BreadcrumbsLink.propTypes = {
  activeLast: PropTypes.bool,
  disabled: PropTypes.bool,
  link: PropTypes.shape({
    href: PropTypes.string,
    icon: PropTypes.node,
    name: PropTypes.string,
  }),
};
