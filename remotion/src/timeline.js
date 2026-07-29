// Scene timeline for the Restaurant Reviews Reel.
// Durations (seconds) match the imported design; the review scene repeats
// once per review passed in props, so total duration is computed dynamically.
export const FPS = 30;

export const SCENE_DUR = {
  hook: 2.6,
  intro: 3.2,
  review: 4.6,
  agg: 4.8,
  map: 3.7,
  cta: 3.6,
};

export const buildTimeline = (reviewCount) => {
  const items = [];
  let t = 0;
  const push = (id, dur) => {
    items.push({ id, start: t, dur });
    t += dur;
  };
  push('hook', SCENE_DUR.hook);
  push('intro', SCENE_DUR.intro);
  // Community consensus lands before the individual reviews: set the overall
  // verdict first, then let the reviews back it up.
  push('agg', SCENE_DUR.agg);
  for (let i = 0; i < reviewCount; i++) push(`review-${i}`, SCENE_DUR.review);
  push('map', SCENE_DUR.map);
  push('cta', SCENE_DUR.cta);
  return { items, total: t };
};
