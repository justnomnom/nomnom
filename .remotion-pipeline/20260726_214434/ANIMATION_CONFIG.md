# Animation Configuration: RestaurantSpotlight

## Status
✅ Animation parameters defined
✅ Mirrored in `constants.js` + scene helpers

## Spring Configurations

```javascript
export const SPRING_CONFIGS = {
  smooth: { damping: 200, mass: 1, stiffness: 100 },
  snappy: { damping: 20, stiffness: 200, mass: 0.5 },
  bouncy: { damping: 12, mass: 1, stiffness: 120 },
};
```

## Scene Envelope

```javascript
fadeInSec: 0.42   // easeOutCubic opacity + slideIn 34px
fadeOutSec: 0.4   // linear fade + slideOut -22px
```

## Per-Scene Motion

| Scene | Element | Technique | Notes |
|-------|---------|-----------|-------|
| Hook | Lines | easeOutBack + stagger 0.13p | Last line terra |
| Intro | Logo | easeOutBack scale to p/0.34 | Soft terra shadow |
| Intro | Chips | Opacity + Y after p=0.35 | |
| Review | Dish | Ken-burns 1→1.06 | Scale 0.92→1 |
| Review | Stars | Fill by progress | Gold |
| Review | Quote | Word opacity by progress | |
| CTA | Button | spring snappy from frame 18 | Scale 0.92→1 |

## Interpolation Patterns

- Progress `p = localSec / durSec` clamped 0–1
- Stagger: `(p - (base + i * step)) / window`
- Always drive from `useCurrentFrame()` (no CSS transitions)
