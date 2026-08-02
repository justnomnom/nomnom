/**
 * Twitter card — same art as the default Open Graph card.
 *
 * Bound locally rather than `export { … } from './opengraph-image'`: Next's metadata-route
 * loader cannot see a default export through a re-export, and pairing one with a local
 * `runtime` makes webpack report "does not contain a default export (possible exports:
 * runtime)". The route still served an image, but on the default runtime rather than the
 * `nodejs` one the 1 MB edge limit requires.
 */

import OpenGraphImage, {
  alt as imageAlt,
  size as imageSize,
  contentType as imageContentType,
} from './opengraph-image';

export const runtime = 'nodejs';

export const alt = imageAlt;

export const size = imageSize;

export const contentType = imageContentType;

export default OpenGraphImage;
