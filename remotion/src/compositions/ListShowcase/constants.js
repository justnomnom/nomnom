// Timing for ListShowcase — duration scales with place count.
export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

export const SCENE_DUR = {
  intro: 3.2,
  spot: 2.9,
  recap: 3.6,
  cta: 3.2,
};

/** Build frame windows for intro → N spots → recap → CTA. */
export const buildListTimeline = (placeCount) => {
  const n = Math.max(1, placeCount);
  let start = 0;
  const push = (id, durSec) => {
    const duration = Math.round(durSec * FPS);
    const item = { id, start, end: start + duration, duration, durSec };
    start += duration;
    return item;
  };
  const intro = push('intro', SCENE_DUR.intro);
  const spots = Array.from({ length: n }, (_, i) => push(`spot-${i}`, SCENE_DUR.spot));
  const recap = push('recap', SCENE_DUR.recap);
  const cta = push('cta', SCENE_DUR.cta);
  return { intro, spots, recap, cta, totalFrames: start, totalSeconds: start / FPS };
};

export const SPRING_CONFIGS = {
  smooth: { damping: 200, mass: 1, stiffness: 100 },
  snappy: { damping: 18, stiffness: 220, mass: 0.5 },
  soft: { damping: 28, stiffness: 140, mass: 0.8 },
};

export const SCENE_FADE = {
  fadeInSec: 0.32,
  fadeOutSec: 0.3,
  slideInPx: 26,
  slideOutPx: 16,
};
