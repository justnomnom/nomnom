// ----------------------------------------------------------------------

import { primary } from 'src/theme/palette';

// Defaults map to brand terracotta tints so the variant matches the NomNom
// palette out of the box. Override `colors` to opt into a different gradient.
// Read from the palette rather than literals (DESIGN.md §12: no hardcoded hex in
// components) so a brand change cannot leave this animation on the old terracotta.
const DEFAULT_BG_COLORS = [primary.lighter, primary.main];

export const varBgColor = (props) => {
  const colors = props?.colors || DEFAULT_BG_COLORS;
  const duration = props?.duration || 5;
  const ease = props?.ease || 'linear';

  return {
    animate: {
      background: colors,
      transition: { duration, ease },
    },
  };
};
