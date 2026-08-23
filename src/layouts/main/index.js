'use client';

import PropTypes from 'prop-types';

import Box from '@mui/material/Box';

import { HEADER } from 'src/config-global';

import SkipToMainLink from 'src/components/a11y/skip-to-main-link';

import Footer from './footer';
import Header from './header';

// ----------------------------------------------------------------------

/**
 * Marketing shell. `minimal` strips the nav, the sign-up CTA and the footer,
 * leaving the brand mark — for public task pages opened from a shared link,
 * where marketing chrome competes with the job the visitor came to do.
 * `mainSx` tints the content column (homepage terracotta wash) without
 * changing header or footer chrome.
 */
export default function MainLayout({ children, minimal = false, mainSx }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 1 }}>
      <SkipToMainLink />

      <Header minimal={minimal} />

      <Box
        component="main"
        id="main-content"
        tabIndex={-1}
        sx={[
          {
            flexGrow: 1,
            /* Fixed AppBar + status bar inset (notched phones) */
            pt: {
              xs: `calc(${HEADER.H_MOBILE}px + env(safe-area-inset-top, 0px))`,
              md: `calc(${HEADER.H_DESKTOP}px + env(safe-area-inset-top, 0px))`,
            },
            '&:focus': { outline: 'none' },
            '&:focus-visible': (theme) => ({
              outline: `2px solid ${theme.palette.primary.main}`,
              outlineOffset: -2,
            }),
          },
          mainSx,
        ]}
      >
        {children}
      </Box>

      {!minimal && <Footer />}
    </Box>
  );
}

MainLayout.propTypes = {
  children: PropTypes.node,
  minimal: PropTypes.bool,
  mainSx: PropTypes.oneOfType([PropTypes.object, PropTypes.func, PropTypes.array]),
};
