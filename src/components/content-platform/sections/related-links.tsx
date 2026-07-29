'use client';

import { useId } from 'react';

import NextLink from 'next/link';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { RADIUS, TOUCH_TARGET_SIZE } from 'src/theme/spacing';

type RelatedLinksProps = {
  title: string;
  links: { href: string; label: string }[];
};

/**
 * Internal “continue reading” links — Chip row aligned with blog tag styling.
 */
export function RelatedLinksSection({ title, links }: RelatedLinksProps) {
  const headingId = useId();

  if (!links.length) return null;

  return (
    <Box
      component="section"
      sx={{ mt: 6, pt: 4, borderTop: 1, borderColor: 'divider' }}
      aria-labelledby={headingId}
    >
      <Typography id={headingId} variant="h5" component="h2" gutterBottom>
        {title}
      </Typography>
      <Stack direction="row" flexWrap="wrap" gap={{ xs: 2, sm: 1 }} sx={{ mt: 2 }}>
        {links.map((l) => (
          <Button
            key={l.href}
            component={NextLink}
            href={l.href}
            variant="outlined"
            color="primary"
            sx={{
              borderRadius: RADIUS.pill,
              textTransform: 'none',
              fontWeight: 600,
              minHeight: TOUCH_TARGET_SIZE,
              px: 2,
              py: 1,
              typography: 'body2',
              transition: (theme) =>
                theme.transitions.create(['background-color', 'border-color', 'box-shadow'], {
                  duration: theme.transitions.duration.short,
                }),
              '&:focus-visible': {
                outline: 'none',
                boxShadow: (theme) =>
                  `0 0 0 2px ${theme.palette.background.paper}, 0 0 0 4px ${theme.palette.primary.main}`,
              },
            }}
          >
            {l.label}
          </Button>
        ))}
      </Stack>
    </Box>
  );
}
