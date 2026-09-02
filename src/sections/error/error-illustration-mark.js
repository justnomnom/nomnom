'use client';

import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';

import { readableAccent } from 'src/theme/readable-accent';

// ----------------------------------------------------------------------

export default function ErrorIllustrationMark() {
  return (
    <Box
      sx={{
        mx: 'auto',
        mb: 3,
        width: 168,
        height: 168,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        '@media (prefers-reduced-motion: no-preference)': {
          animation: 'error-mark-float 6s ease-in-out infinite',
        },
        '@keyframes error-mark-float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          bgcolor: (theme) =>
            theme.palette.mode === 'light'
              ? alpha(theme.palette.primary.main, 0.08)
              : alpha(theme.palette.primary.main, 0.12),
        }}
      />
      <Box
        aria-hidden
        component="svg"
        viewBox="0 0 120 120"
        sx={{
          position: 'relative',
          width: 96,
          height: 96,
          color: (theme) => readableAccent(theme),
        }}
      >
        <Box
          component="circle"
          cx="60"
          cy="60"
          r="52"
          sx={{
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: 4,
            opacity: 0.35,
          }}
        />
        <Box
          component="path"
          d="M60 34 L60 70"
          sx={{
            stroke: 'currentColor',
            strokeWidth: 8,
            strokeLinecap: 'round',
            fill: 'none',
          }}
        />
        <Box component="circle" cx="60" cy="86" r="5" sx={{ fill: 'currentColor' }} />
      </Box>
    </Box>
  );
}
