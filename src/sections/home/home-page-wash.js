import { alpha } from '@mui/material/styles';

/**
 * Warm terracotta wash for the marketing homepage.
 * Parchment stays the base; terracotta and peach sit as
 * soft radial glows so the page is not a flat near-white field.
 * Terracotta stays a minority of the surface (DESIGN.md colour discipline).
 *
 * @param {import('@mui/material/styles').Theme} theme
 * @returns {import('@mui/material/styles').SxProps}
 */
export function homePageWashSx(theme) {
  const { primary, marketing, mode } = theme.palette;

  if (mode === 'dark') {
    return {
      backgroundColor: marketing.surfaceDarker,
      backgroundImage: [
        `radial-gradient(ellipse 80% 50% at 0% 0%, ${alpha(primary.main, 0.14)} 0%, transparent 55%)`,
        `radial-gradient(ellipse 65% 40% at 100% 8%, ${alpha(primary.light, 0.1)} 0%, transparent 50%)`,
        `radial-gradient(ellipse 70% 35% at 20% 100%, ${alpha(primary.dark, 0.1)} 0%, transparent 55%)`,
      ].join(', '),
    };
  }

  return {
    backgroundColor: marketing.parchment,
    backgroundImage: [
      `radial-gradient(ellipse 80% 50% at 0% 0%, ${alpha(primary.main, 0.12)} 0%, transparent 55%)`,
      `radial-gradient(ellipse 70% 45% at 100% 0%, ${alpha(primary.light, 0.16)} 0%, transparent 52%)`,
      `radial-gradient(ellipse 50% 32% at 50% 18%, ${alpha(primary.lighter, 0.4)} 0%, transparent 60%)`,
      `radial-gradient(ellipse 60% 35% at 90% 75%, ${alpha(primary.main, 0.08)} 0%, transparent 55%)`,
      `linear-gradient(180deg, ${alpha(primary.lighter, 0.28)} 0%, ${marketing.parchment} 42%)`,
    ].join(', '),
  };
}
