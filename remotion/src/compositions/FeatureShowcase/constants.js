export const FPS = 30;
export const REEL_W = 1080;
export const REEL_H = 1920;
export const SLIDE_W = 1080;
export const SLIDE_H = 1080;

export const REEL_SCENE = {
  hook: 3.2,
  mock: 6.2,
  beats: 5.0,
  cta: 3.6,
};

export const SLIDE_COUNT = 5;
export const SLIDE_SEC = 2.8;

export const REEL_FADE = {
  fadeInSec: 0.28,
  fadeOutSec: 0.26,
  slideInPx: 28,
  slideOutPx: 14,
};

/** Frame windows for hook → mock → beats → CTA. */
export function buildReelTimeline() {
  let start = 0;
  const push = (id, durSec) => {
    const duration = Math.round(durSec * FPS);
    const item = { id, start, duration, end: start + duration };
    start += duration;
    return item;
  };
  const hook = push('hook', REEL_SCENE.hook);
  const mock = push('mock', REEL_SCENE.mock);
  const beats = push('beats', REEL_SCENE.beats);
  const cta = push('cta', REEL_SCENE.cta);
  return { hook, mock, beats, cta, totalFrames: start };
}

export const getFeatureReelDuration = () => buildReelTimeline().totalFrames;

export const getFeatureSlideshowDuration = () => Math.round(SLIDE_COUNT * SLIDE_SEC * FPS);

export const getSlideFrame = (index) => {
  const slideFrames = Math.round(SLIDE_SEC * FPS);
  return index * slideFrames + Math.floor(slideFrames / 2);
};
