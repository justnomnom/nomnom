'use client';

import Image from 'next/image';
import PropTypes from 'prop-types';

import Box from '@mui/material/Box';

import { isOptimizableRemoteImageUrl } from 'src/utils/remote-image-url';

/**
 * Uses `next/image` for configured remote URLs; otherwise a lazy `<img>`.
 * - `fill`: parent must be `position: 'relative'` with a defined size.
 * - `width` + `height`: fixed raster size (e.g. avatars).
 */
export default function RemoteCoverImage({ src, alt, fill, sizes, width, height, sx, className }) {
  if (!src) return null;

  if (isOptimizableRemoteImageUrl(src)) {
    if (fill) {
      return (
        <Image
          src={src}
          alt={alt || ''}
          fill
          sizes={sizes}
          className={className}
          style={{
            objectFit: 'cover',
            // Let parent `<button>` / link receive taps (iOS + next/image hit-testing).
            pointerEvents: 'none',
          }}
        />
      );
    }
    if (width != null && height != null) {
      return (
        <Image
          src={src}
          alt={alt || ''}
          width={width}
          height={height}
          sizes={sizes}
          className={className}
          style={{ objectFit: 'cover', maxWidth: '100%', height: 'auto' }}
        />
      );
    }
  }

  const fallbackSx = fill
    ? {
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block',
        pointerEvents: 'none',
        ...sx,
      }
    : {
        width: width != null ? width : undefined,
        height: height != null ? height : undefined,
        maxWidth: '100%',
        objectFit: 'cover',
        display: 'block',
        ...sx,
      };

  return (
    <Box
      component="img"
      src={src}
      alt={alt || ''}
      loading="lazy"
      decoding="async"
      className={className}
      sx={fallbackSx}
    />
  );
}

RemoteCoverImage.propTypes = {
  alt: (props, propName) => {
    if (props.src && props[propName] === undefined) {
      return new Error(
        'RemoteCoverImage: `alt` is required when `src` is set (use an empty string for decorative images).'
      );
    }
    return null;
  },
  className: PropTypes.string,
  fill: PropTypes.bool,
  height: PropTypes.number,
  sizes: PropTypes.string,
  src: PropTypes.string.isRequired,
  sx: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  width: PropTypes.number,
};
