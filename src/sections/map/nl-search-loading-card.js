'use client';

import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

/** Dropdown-style panel for NL search step messages (matches MapSearchSuggestions chrome). */
export function NlSearchLoadingCard({ phrases, activeStep, phraseKeys }) {
  const activePhrase = phrases[activeStep] ?? phrases[0] ?? '';

  return (
    <Box
      component="section"
      aria-live="polite"
      aria-busy="true"
      sx={(theme) => ({
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: theme.palette.background.paper,
        boxShadow: theme.customShadows?.dropdown ?? theme.shadows[8],
        border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
        px: { xs: 1.25, sm: 1.5 },
        py: 1.25,
      })}
    >
      <Stack spacing={1.1}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary' }}>
          <CircularProgress size={16} />
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
            {activePhrase}
          </Typography>
        </Stack>
        <Stack component="ol" spacing={0.75} sx={{ m: 0, pl: 2.1, listStyle: 'decimal' }}>
          {phrases.map((line, i) => {
            const active = i === activeStep;
            const past = i < activeStep;
            let fontWeight = 400;
            if (active) fontWeight = 600;
            else if (past) fontWeight = 500;
            let color = 'text.disabled';
            if (active) color = 'text.primary';
            else if (past) color = 'text.secondary';
            return (
              <Typography
                key={phraseKeys[i]}
                component="li"
                variant="body2"
                sx={{
                  color,
                  fontWeight,
                  transition: (theme) => theme.transitions.create(['color'], { duration: 280 }),
                  pl: 0.5,
                  fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                }}
              >
                {line}
              </Typography>
            );
          })}
        </Stack>
      </Stack>
    </Box>
  );
}

NlSearchLoadingCard.propTypes = {
  phrases: PropTypes.arrayOf(PropTypes.string).isRequired,
  activeStep: PropTypes.number.isRequired,
  phraseKeys: PropTypes.arrayOf(PropTypes.string).isRequired,
};
