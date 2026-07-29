'use client';

import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Container from '@mui/material/Container';

import {
  DASHBOARD_SPACE_BLOCK,
  DASHBOARD_SPACE_SECTION,
} from 'src/sections/profile/view/settings-shell-shared';

import FaqsList from '../faqs-list';
import FaqsForm from '../faqs-form';

// ----------------------------------------------------------------------

export default function FaqsView({ variant = 'page' }) {
  const isSettings = variant === 'settings';

  const grid = (
    <Grid
      container
      spacing={
        isSettings
          ? { xs: DASHBOARD_SPACE_BLOCK, sm: DASHBOARD_SPACE_SECTION }
          : { xs: 3, sm: 4, md: 6 }
      }
    >
      <Grid size={{ xs: 12, md: 12 }}>
        <FaqsList variant={variant} titleHeading={variant === 'page' ? 'h1' : 'h2'} />
      </Grid>
      <Grid size={{ xs: 12, md: 12 }}>
        <FaqsForm
          variant={variant}
          titleHeading={variant === 'page' ? 'h2' : 'h3'}
          analyticsLocation={isSettings ? 'settings_faqs' : 'faq_section'}
        />
      </Grid>
    </Grid>
  );

  if (isSettings) {
    return <Box sx={{ width: 1 }}>{grid}</Box>;
  }

  return (
    <Container
      maxWidth="lg"
      sx={{
        mb: { xs: '20px', sm: '30px', md: '70px' },
        mt: { xs: '40px', sm: '60px', md: '100px' },
        position: 'relative',
        px: { xs: 3, sm: 4, md: 0 },
      }}
    >
      {grid}
    </Container>
  );
}

FaqsView.propTypes = {
  variant: PropTypes.oneOf(['page', 'settings']),
};
