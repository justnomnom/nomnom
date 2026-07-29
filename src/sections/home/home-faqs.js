import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Container from '@mui/material/Container';
import { alpha, useTheme } from '@mui/material/styles';

import { bgGradient } from 'src/theme/css';

import { varFade, MotionPart, MotionViewport } from 'src/components/animate';

import FaqsList from '../faqs/faqs-list';
import FaqsForm from '../faqs/faqs-form';

// ----------------------------------------------------------------------

export default function HomeFaqs() {
  const theme = useTheme();

  return (
    <Box
      sx={{
        ...bgGradient({
          direction: 'to bottom',
          startColor:
            theme.palette.mode === 'light'
              ? alpha(theme.palette.marketing.parchment, 0.65)
              : alpha(theme.palette.grey[500], 0.1),
          endColor:
            theme.palette.mode === 'light'
              ? alpha(theme.palette.marketing.paper, 0.9)
              : alpha(theme.palette.grey[500], 0.06),
        }),
        pb: { xs: 6, sm: 10, md: 18 },
        pt: { xs: 6, sm: 10, md: 18 },
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Container
        component={MotionViewport}
        maxWidth="lg"
        sx={{
          px: { xs: 3, sm: 4 },
        }}
      >
        <Grid container spacing={{ xs: 3, sm: 6, md: 12 }} justifyContent="center">
          <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'center' }}>
            <MotionPart
              variants={varFade().inUp}
              style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
            >
              <FaqsList />
            </MotionPart>
          </Grid>

          <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'center' }}>
            <MotionPart
              variants={varFade().inUp}
              style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
            >
              <FaqsForm />
            </MotionPart>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
