import { svgIcon } from './svg-paths';
import { ic, circleFlagIcon } from './iconify';

export { ic, svgIcon, circleFlagIcon };

/** Every static Iconify id exposed as `ic.<name>` (sorted A–Z). Does not include dynamic `circleFlagIcon()` or API-driven icon strings. */
export const ICONIFY_KEYS = Object.freeze(Object.keys(ic).sort());
