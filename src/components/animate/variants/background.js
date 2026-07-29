// ----------------------------------------------------------------------

// Defaults map to brand terracotta tints so the variant matches the NomNom
// palette out of the box. Override `colors` to opt into a different gradient.
const DEFAULT_BG_COLORS = ['#ffe8df', '#ff6b35'];

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
