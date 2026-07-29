import PropTypes from 'prop-types';

import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';

import SkipToMainLink from 'src/components/a11y/skip-to-main-link';

import Header from '../common/header-simple';

export {
  isDashboardMapRoute,
  isDashboardSettingsRoute,
  isDashboardRestaurantDetailRoute,
} from './dashboard-settings';

// ----------------------------------------------------------------------

export default function CompactLayout({ children }) {
  return (
    <>
      <SkipToMainLink />
      <Header />

      <Container
        component="main"
        id="main-content"
        tabIndex={-1}
        sx={{
          '&:focus': { outline: 'none' },
          '&:focus-visible': (theme) => ({
            outline: `2px solid ${theme.palette.primary.main}`,
            outlineOffset: -2,
          }),
        }}
      >
        <Stack
          sx={{
            py: 12,
            m: 'auto',
            maxWidth: 400,
            minHeight: '100vh',
            '@supports (min-height: 100dvh)': {
              minHeight: '100dvh',
            },
            textAlign: 'center',
            justifyContent: 'center',
          }}
        >
          {children}
        </Stack>
      </Container>
    </>
  );
}

CompactLayout.propTypes = {
  children: PropTypes.node,
};
