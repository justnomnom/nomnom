# Composition Structure: RestaurantSpotlight

## Status
✅ Sequence layout defined
✅ Timing calculations complete

## Composition Overview

**Total Duration:** 15 seconds (450 frames @ 30fps)
**Scenes:** 4
**Transitions:** Soft per-scene fade envelope (~0.4s), no overlapping Sequences

## Scene Timing Constants

```javascript
const FPS = 30;

export const SCENE_TIMING = {
  hook:   { start: 0,   end: 90,  duration: 90  }, // 0–3s
  intro:  { start: 90,  end: 210, duration: 120 }, // 3–7s
  review: { start: 210, end: 360, duration: 150 }, // 7–12s
  cta:    { start: 360, end: 450, duration: 90  }, // 12–15s
};
```

## Sequence Layout

```jsx
<AbsoluteFill>
  <Sequence from={0} durationInFrames={90}><Scene1Hook /></Sequence>
  <Sequence from={90} durationInFrames={120}><Scene2Intro /></Sequence>
  <Sequence from={210} durationInFrames={150}><Scene3Review /></Sequence>
  <Sequence from={360} durationInFrames={90}><Scene4CTA /></Sequence>
</AbsoluteFill>
```
