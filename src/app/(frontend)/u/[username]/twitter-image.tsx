/**
 * Twitter card — same art as the Open Graph card.
 *
 * Bound locally rather than `export { … } from './opengraph-image'`: Next's metadata-route
 * loader cannot see through a re-export, and combining one with a local `runtime` makes it
 * report "does not contain a default export (possible exports: runtime)".
 */

import ProfileOpenGraphImage, {
  alt as imageAlt,
  size as imageSize,
  contentType as imageContentType,
} from './opengraph-image';

export const runtime = 'nodejs';

export const alt = imageAlt;

export const size = imageSize;

export const contentType = imageContentType;

export default ProfileOpenGraphImage;
