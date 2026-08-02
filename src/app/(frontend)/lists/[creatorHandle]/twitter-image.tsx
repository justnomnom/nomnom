/**
 * Twitter card — same art as the Open Graph card. Bound locally rather than re-exported:
 * Next's metadata-route loader cannot see a default export through `export { … } from`.
 */

import ListOpenGraphImage, {
  alt as imageAlt,
  size as imageSize,
  contentType as imageContentType,
} from './opengraph-image';

export const runtime = 'nodejs';

export const alt = imageAlt;

export const size = imageSize;

export const contentType = imageContentType;

export default ListOpenGraphImage;
