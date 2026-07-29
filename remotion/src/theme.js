// NomNom design tokens for video templates.
// Kept in sync with the app's design system (see DESIGN.md + src/theme/*).
// Fonts match src/theme/typography.js; colors match src/theme/palette.js.
import { loadFont as loadAlbertSans } from '@remotion/google-fonts/AlbertSans';
import { loadFont as loadLibreBaskerville } from '@remotion/google-fonts/LibreBaskerville';
import { loadFont as loadJetBrainsMono } from '@remotion/google-fonts/JetBrainsMono';

// UI / sans — Albert Sans 400·500·600·700·800 (no 900; app caps at 800).
const albert = loadAlbertSans('normal', {
  weights: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
});
loadAlbertSans('italic', { weights: ['400', '800'], subsets: ['latin'] });
// Display / serif — Libre Baskerville 400·700 only (app rule: never fake-bold 800).
const baskerville = loadLibreBaskerville('normal', {
  weights: ['400', '700'],
  subsets: ['latin'],
});
// Mono — JetBrains Mono for @handles and numeric data (DESIGN.md §3).
const jetbrains = loadJetBrainsMono('normal', {
  weights: ['400', '500', '600', '700'],
  subsets: ['latin'],
});

export const SANS = `'${albert.fontFamily}', system-ui, sans-serif`;
export const SERIF = `'${baskerville.fontFamily}', Georgia, serif`;
export const MONO = `'${jetbrains.fontFamily}', ui-monospace, monospace`;

// Colors mirror src/theme/palette.js exactly (token name in comment).
export const C = {
  bg: '#faf9f5', //        marketing.paper (background.default)
  paper: '#fdfcfa', //     background.paper / grey[0] / common.white
  parch: '#f5f4ed', //     marketing.parchment (background.neutral)
  parchDeep: '#edeae0', // marketing.parchmentDeep
  hairline: '#d1cfc5', //  marketing.hairline
  divider: 'rgba(110,102,87,0.2)', // grey[600] @ 0.2
  ink: '#15130f', //       grey[900] / text.primary
  ink2: '#6e6657', //      grey[600] / text.secondary
  ink3: '#948c7c', //      grey[500]
  terra: '#FF6B35', //     primary.main
  terraDark: '#E85A28', // primary.dark
  terraDarker: '#B8481F', //primary.darker
  terraLight: '#FFE8DF', // primary.lighter
  gold: '#F59E0B', //      warning.main (star ratings)
  goldBg: 'rgba(245,158,11,0.14)',
  green: '#10B981', //     success.main
  greenBg: 'rgba(16,185,129,0.12)',
  white: '#fdfcfa', //     common.white (never pure #fff)
};

// Warm-black shadow base = grey[900] (#15130f → rgb 21,19,15), per DESIGN.md §6.
export const CARD_SHADOW = '0 10px 26px -8px rgba(21,19,15,0.22)';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
export const lerp = (a, b, t) => a + (b - a) * t;
