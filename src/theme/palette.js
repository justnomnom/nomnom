import { alpha } from '@mui/material/styles';

// ----------------------------------------------------------------------

// Warm-tinted neutrals (parchment hue family, ~60° hue at low chroma) to match
// `marketing.*` editorial surfaces. Lightness values match the prior slate scale
// step-for-step, so existing UI keeps its contrast hierarchy — only the temperature shifts.
export const grey = {
  0: '#fdfcfa',
  100: '#f8f7f2',
  200: '#f1ede4',
  300: '#e2ddd0',
  400: '#ccc6b6',
  500: '#948c7c',
  600: '#6e6657',
  700: '#4d473c',
  800: '#25221c',
  900: '#15130f',
};

export const primary = {
  lighter: '#FFE8DF',
  light: '#FFA070',
  main: '#FF6B35',
  dark: '#E85A28',
  darker: '#B8481F',
  /**
   * Warm ink, not white. White on `main` is 2.77:1 — below AA for the 12-14px
   * labels that sit on every filled terracotta surface (contained CTAs,
   * selected filter chips, badges). Ink clears AA on the whole ramp
   * (light 9.29:1, main 6.54:1, dark 5.23:1) and keeps the terracotta itself
   * untouched. Same value as `grey[900]` / `text.primary`.
   */
  contrastText: '#15130f',
};

export const secondary = {
  lighter: '#F8FAFC',
  light: '#F1F5F9',
  main: '#E2E8F0',
  dark: '#CBD5E1',
  darker: '#94A3B8',
  contrastText: '#0F172A',
};

export const info = {
  lighter: '#DBEAFE',
  light: '#93C5FD',
  main: '#3B82F6',
  dark: '#2563EB',
  darker: '#1D4ED8',
  contrastText: '#FFFFFF',
};

export const success = {
  lighter: '#D1FAE5',
  light: '#6EE7B7',
  main: '#10B981',
  dark: '#059669',
  darker: '#047857',
  contrastText: '#FFFFFF',
};

export const warning = {
  lighter: '#FEF3C7',
  light: '#FCD34D',
  main: '#F59E0B',
  dark: '#D97706',
  darker: '#B45309',
  contrastText: '#0F172A',
};

export const error = {
  lighter: '#FEE2E2',
  light: '#FCA5A5',
  main: '#EF4444',
  dark: '#DC2626',
  darker: '#B91C1C',
  contrastText: '#FFFFFF',
};

export const common = {
  /** Warm near-black for overlays and scrims (not pure #000). */
  black: '#121110',
  white: '#fdfcfa',
};

/**
 * Warm editorial / parchment neutrals (terracotta-adjacent, not cool slate).
 * Use via `theme.palette.marketing.*` for marketing chrome, hero gradients, and cards.
 */
export const marketing = {
  parchment: '#f5f4ed',
  parchmentDeep: '#edeae0',
  paper: '#faf9f5',
  dividerWarm: '#e8e6dc',
  hairline: '#d1cfc5',
  shadowWarm: '#30302e',
  surfaceDark: '#1c1b19',
  surfaceDarker: '#141413',
  onDark: '#faf9f5',
  outlineMuted: '#4d4c48',
};

const createActionColors = () => ({
  hover: alpha(grey[500], 0.08),
  selected: alpha(grey[500], 0.16),
  disabled: alpha(grey[500], 0.8),
  disabledBackground: alpha(grey[500], 0.24),
  focus: alpha(primary.main, 0.24),
  hoverOpacity: 0.08,
  disabledOpacity: 0.48,
});

const createBaseColors = () => ({
  primary,
  secondary,
  info,
  success,
  warning,
  error,
  grey,
  common,
  divider: alpha(grey[600], 0.2),
  action: createActionColors(),
});

// ----------------------------------------------------------------------

export function palette(mode) {
  const base = createBaseColors();

  const light = {
    ...base,
    mode: 'light',
    marketing,
    text: {
      primary: grey[900],
      secondary: grey[600],
      disabled: grey[500],
    },
    background: {
      paper: '#fdfcfa',
      default: marketing.paper,
      neutral: marketing.parchment,
    },
    action: {
      ...base.action,
      active: grey[600],
    },
    card: {
      background: '#fdfcfa',
      border: alpha(grey[300], 0.9),
    },
    paper: {
      background: '#fdfcfa',
      border: alpha(grey[300], 0.7),
    },
  };

  const dark = {
    ...base,
    mode: 'dark',
    marketing,
    text: {
      primary: grey[100],
      secondary: grey[400],
      disabled: grey[500],
    },
    background: {
      paper: grey[800],
      default: grey[900],
      neutral: alpha(grey[500], 0.16),
    },
    action: {
      ...base.action,
      active: grey[400],
    },
    card: {
      background: grey[800],
      border: alpha(grey[600], 0.6),
    },
    paper: {
      background: grey[800],
      border: alpha(grey[600], 0.6),
    },
  };

  return mode === 'light' ? light : dark;
}
