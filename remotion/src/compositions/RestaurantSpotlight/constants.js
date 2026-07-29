// Timing, springs, and scene IDs for RestaurantSpotlight v2 (16s @ 30fps).
// Arc: plate cold-open → identity → review → map+CTA resolve.
export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const DURATION_SECONDS = 16;
export const DURATION_FRAMES = DURATION_SECONDS * FPS;

/** Scene windows in seconds (sequential). */
export const SCENE_DUR = {
  plate: 3.2,
  identity: 3.4,
  review: 5.0,
  resolve: 4.4,
};

/** Frame timing derived from SCENE_DUR. */
export const SCENE_TIMING = (() => {
  let start = 0;
  const map = {};
  for (const [id, durSec] of Object.entries(SCENE_DUR)) {
    const duration = Math.round(durSec * FPS);
    map[id] = { start, end: start + duration, duration, durSec };
    start += duration;
  }
  return map;
})();

export const SPRING_CONFIGS = {
  smooth: { damping: 200, mass: 1, stiffness: 100 },
  snappy: { damping: 20, stiffness: 200, mass: 0.5 },
  bouncy: { damping: 12, mass: 1, stiffness: 120 },
};

export const SCENE_FADE = {
  fadeInSec: 0.38,
  fadeOutSec: 0.36,
  slideInPx: 28,
  slideOutPx: 18,
};
