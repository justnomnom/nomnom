# COMPOSITION_STRUCTURE — RestaurantReviewsReel

**Skill:** remotion-composition  
**File:** `remotion/src/RestaurantReviewsReel.jsx` + `timeline.js`

## Sequence order (runtime)

Computed by `buildTimeline(reviewCount)`:

| Order | Scene id | Duration | Notes |
|-------|----------|----------|-------|
| 1 | `hook` | 2.6s | Pattern interrupt |
| 2 | `intro` | 3.2s | Brand + restaurant name |
| 3 | `agg` | 4.8s | Consensus **before** reviews |
| 4… | `review-0` … `review-N-1` | 4.6s each | One Sequence per review |
| … | `map` | 3.7s | Mapbox pin |
| … | `cta` | 3.6s | Terracotta close |

**Total (3 reviews):** 2.6+3.2+4.8+(3×4.6)+3.7+3.6 = **31.7s** → **951 frames** @ 30fps

## Layout model

- Root: `AbsoluteFill` composition
- Each scene: absolute positioned segment with local frame = `frame - start*FPS`
- Transitions: overlapping fade via envelope (not Remotion `<TransitionSeries>` — intentional design parity)

## Props contract

See `defaultProps` in `Root.jsx` / `props/volta-dos-sabores.json`:

- `restaurant`, `reviews[]`, `consensus`, `chips`, `hook*`, `cta`, `badgeText`
