# ANIMATION_CONFIG — RestaurantReviewsReel

**Skill:** remotion-animation  
**Implementation:** `remotion/src/theme.js` + scene envelopes in `RestaurantReviewsReel.jsx`

## Timing constants (`timeline.js`)

```js
export const FPS = 30;
export const SCENE_DUR = {
  hook: 2.6,
  intro: 3.2,
  review: 4.6,
  agg: 4.8,
  map: 3.7,
  cta: 3.6,
};
```

## Easings (`theme.js`)

| Name | Use |
|------|-----|
| `easeOutCubic` | Primary entrances, fades |
| `easeOutBack` | Pin drop, card settle (spring-like overshoot) |
| `clamp` | Bound progress 0–1 |

## Scene envelope (seg)

- **In:** 0.42s (~13 frames @ 30fps)
- **Out:** 0.40s (~12 frames)
- Progress driven by `useCurrentFrame()` — never CSS transitions for quote reveal

## Patterns

| Pattern | Spec |
|---------|------|
| Stagger text lines | 8–10 frames between lines |
| Word-by-word quote | Opacity 0→1 per word; ~2–4 frames spacing |
| Rating count-up | Interpolate 0 → rating over ~45 frames |
| Pin drop | translateY + scale with easeOutBack |
| Chip stagger | 4–6 frames between chips |

## Remotion primitives preferred

- `interpolate(frame, …)` for linear mappings
- Frame-local opacity / transform (GPU-friendly: opacity + transform only)
- Avoid animating layout (width/height/top/left)
