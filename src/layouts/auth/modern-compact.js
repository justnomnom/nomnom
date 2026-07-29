'use client';

import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';

import Header from '../common/header-simple';

// ----------------------------------------------------------------------

export default function AuthModernCompactLayout({ children, variant = 'card' }) {
  const isFullscreen = variant === 'fullscreen';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        '@supports (min-height: 100dvh)': {
          minHeight: '100dvh',
        },
        width: '100%',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden',
      }}
    >
      <Header />

      <Box
        component="main"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
          pb: 4,
          pt: { xs: 10, md: 12 },
          position: 'relative',
          overflow: isFullscreen ? 'visible' : 'hidden',
          ...(isFullscreen
            ? { textAlign: 'initial' }
            : {
                textAlign: 'center',
              }),
        }}
      >
        {isFullscreen ? (
          children
        ) : (
          <Card
            sx={{
              py: 5,
              px: 3,
              maxWidth: 420,
              width: '100%',
              borderRadius: '2rem',
            }}
          >
            {children}
          </Card>
        )}
      </Box>
    </Box>
  );
}

AuthModernCompactLayout.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.oneOf(['card', 'fullscreen']),
};
