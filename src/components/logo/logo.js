import Image from 'next/image';
import PropTypes from 'prop-types';

import Link from '@mui/material/Link';
import { styled } from '@mui/material/styles';

import { RouterLink } from 'src/routes/components';

import { APP } from 'src/config-global';

// ----------------------------------------------------------------------

/**
 * `next/image` wrapped in MUI `styled` so callers keep the existing `sx` API
 * (height / maxWidth / margins / objectFit) while the wordmark is served as a
 * resized AVIF/WebP instead of the raw 533 KB `/logo/logo_single.png`.
 *
 * The intrinsic raster is 1881×836 (~2.25:1) — handed to `next/image` for the
 * aspect ratio + srcset. Callers size via CSS `height` + `width: 'auto'`, so the
 * width/height attributes also reserve space (no layout shift on load). `styled`
 * forwards `src`/`width`/`height`/`sizes`/`alt` to `next/image` and turns `sx`
 * into the className `next/image` applies to its `<img>`.
 */
const LogoImage = styled(Image)({});

const LOGO_INTRINSIC_WIDTH = 1881;
const LOGO_INTRINSIC_HEIGHT = 836;

const Logo = ({ disabledLink = false, icon = false, sx }) => {
  const logo = (
    <LogoImage
      src="/logo/logo_single.png"
      alt={APP.name}
      width={LOGO_INTRINSIC_WIDTH}
      height={LOGO_INTRINSIC_HEIGHT}
      // Display width is at most ~90px (height ≤40 × 2.25); 2x covers retina.
      sizes="96px"
      sx={{
        height: icon ? 32 : 40,
        width: 'auto',
        maxWidth: icon ? 200 : 220,
        cursor: 'pointer',
        objectFit: 'contain',
        display: 'block',
        ...sx,
      }}
    />
  );

  if (disabledLink) {
    return logo;
  }

  return (
    <Link component={RouterLink} href="/" sx={{ display: 'contents' }}>
      {logo}
    </Link>
  );
};

Logo.propTypes = {
  disabledLink: PropTypes.bool,
  icon: PropTypes.bool,
  sx: PropTypes.object,
};

export default Logo;
