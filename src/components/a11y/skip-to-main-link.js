'use client';

import Link from '@mui/material/Link';

import { useTranslate } from 'src/locales';

// ----------------------------------------------------------------------

/**
 * Keyboard skip link → `#main-content`. Use with a `<main id="main-content" tabIndex={-1}>` target.
 */
export default function SkipToMainLink() {
  const { t } = useTranslate();

  return (
    <Link
      href="#main-content"
      sx={(theme) => ({
        clip: 'rect(0 0 0 0)',
        clipPath: 'inset(50%)',
        height: '1px',
        overflow: 'hidden',
        position: 'absolute',
        whiteSpace: 'nowrap',
        width: '1px',
        zIndex: theme.zIndex.tooltip,
        '&:focus, &:focus-visible': {
          clip: 'auto',
          clipPath: 'none',
          height: 'auto',
          width: 'auto',
          overflow: 'visible',
          position: 'fixed',
          left: 16,
          top: 16,
          px: 2,
          py: 1.25,
          typography: 'body2',
          fontWeight: 600,
          borderRadius: 1,
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: 3,
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: 2,
        },
      })}
    >
      {t('common.a11y.skip_to_main')}
    </Link>
  );
}
