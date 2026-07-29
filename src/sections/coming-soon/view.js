'use client';

import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import { outlinedInputClasses } from '@mui/material/OutlinedInput';

import { useCountdownDate } from 'src/hooks/use-countdown';

import { useTranslate } from 'src/locales';
import { ComingSoonIllustration } from 'src/assets/illustrations';

// ----------------------------------------------------------------------

export default function ComingSoonView() {
  const { t } = useTranslate();
  const { days, hours, minutes, seconds } = useCountdownDate(new Date('2024-07-07T21:30:00'));

  return (
    <>
      <Typography variant="h3" sx={{ mb: 2 }}>
        {t('pages.coming_soon.title')}
      </Typography>

      <Typography sx={{ color: 'text.secondary' }}>{t('pages.coming_soon.description')}</Typography>

      <ComingSoonIllustration sx={{ my: { xs: 6, md: 10 }, height: 240 }} />

      <Stack
        direction="row"
        justifyContent="center"
        divider={<Box sx={{ mx: { xs: 1, sm: 2.5 } }}>:</Box>}
        sx={{ typography: 'h2' }}
      >
        <TimeBlock label={t('pages.coming_soon.days')} value={days} />

        <TimeBlock label={t('pages.coming_soon.hours')} value={hours} />

        <TimeBlock label={t('pages.coming_soon.minutes')} value={minutes} />

        <TimeBlock label={t('pages.coming_soon.seconds')} value={seconds} />
      </Stack>

      <TextField
        fullWidth
        placeholder={t('pages.coming_soon.emailPlaceholder')}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <Button color="primary" variant="contained" size="large">
                {t('pages.coming_soon.notifyMe')}
              </Button>
            </InputAdornment>
          ),
          sx: {
            pr: 0.5,
            [`&.${outlinedInputClasses.focused}`]: {
              boxShadow: (theme) => theme.customShadows.z20,
              transition: (theme) =>
                theme.transitions.create(['box-shadow'], {
                  duration: theme.transitions.duration.shorter,
                }),
              [`& .${outlinedInputClasses.notchedOutline}`]: {
                border: (theme) => `solid 1px ${alpha(theme.palette.grey[500], 0.32)}`,
              },
            },
          },
        }}
        sx={{ my: 5 }}
      />
    </>
  );
}

// ----------------------------------------------------------------------

function TimeBlock({ label, value }) {
  return (
    <div>
      <Box> {value} </Box>
      <Box sx={{ color: 'text.secondary', typography: 'body1' }}>{label}</Box>
    </div>
  );
}

TimeBlock.propTypes = {
  label: PropTypes.string,
  value: PropTypes.string,
};
