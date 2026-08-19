# Remotion motion checklist

Use on `remotion/src/` and `remotion/scripts/`. Product UI rules in
DESIGN.md §9 do **not** fully apply here — video may use springs and
short overshoot. Still no layout-property animation for large layers.

Real paths are JavaScript under `remotion/src/`, not `src/remotion/**/*.tsx`.

## Compositions in this repo

| Composition | Entry |
|---|---|
| `RestaurantReviewsReel` | `remotion/src/RestaurantReviewsReel.jsx` |
| `RestaurantSpotlight` | `remotion/src/compositions/RestaurantSpotlight/` |
| `ListShowcase` | `remotion/src/compositions/ListShowcase/` |

Theme/easing: `remotion/src/theme.js`. Scene lengths: `timeline.js` and
each composition's `constants.js`.

## Score tables

### Purpose (0–4)

- 0 Motion that hides missing data (placeholder venue from incomplete props)
- 2 Scenes move, but hold frames are too short to read type
- 4 Each beat matches the scene's job (hook, quote, consensus, map, CTA)

### Properties (0–4)

- 0 Animating layout of full-screen layers
- 4 Transform, opacity, and Remotion `interpolate`/`spring` on those

### Timing / easing (0–4)

- 0 Random springs, text overflow from `MAX_LINE_CHARS` ignored
- 2 Springs exist, stagger too slow/fast vs sibling scenes
- 4 Holds long enough to read; exits faster than enters; matches
  existing `theme.js` easings

### Reduced motion (0–4)

- n/a for exported MP4 (the viewer cannot set CSS prefers-reduced-motion
  inside the file). Score this **only** if a web preview embeds the
  composition. Otherwise omit from the total.

### Coverage (0–4)

- 0 Hook or CTA static while the rest is animated
- 4 Hook, scene enters, quote reveal, map pin, CTA all intentional

### Performance (0–4)

- 0 Huge images, uncached fonts, per-frame `getBoundingClientRect`
- 4 Offline-deterministic assets in `remotion/public/`, no layout reads
  in render

### Remotion craft (0–4)

- 0 `defaultProps` leaking because a props file omitted keys
- 2 Sequences work, no `calculateMetadata` for variable review counts
- 4 Props complete, sequences from `timeline`/constants, springs from
  shared config, no invented copy in motion (numbers from props)

## Always grep

- `spring(`, `interpolate(`, `Easing.`
- omitted props vs `defaultProps` (placeholder restaurant risk)
- word-by-word quote reveal vs caption honesty
- pin drop / map image vs missing `mapImage`
- `MAX_LINE_CHARS` / headline overflow
- `#fff`, `#ffffff`, `#000`, `#000000` that are not `C.white` / `C.ink`
  (`theme.js` already maps these — leftover literals drift from the app)

## Pair with other skills

| Need | Skill |
|---|---|
| Full spec-vs-code review | `remotion-video-reviewer` (fix its TS paths) |
| Parameter dump only | `remotion-animation` |
| Render speed | `remotion-performance-optimizer` |
| Domain rules | `remotion-best-practices` (`rules/animations.md`, `rules/timing.md`) |
| Produce a batch | `content-machine` — this audit does not render |

## P0 for reels

- Incomplete props file that would show Volta dos Sabores defaults
- Hook line that is not backed by a real figure (`lib/hooks.mjs`)
- Circle/community attribution that does not match review source

Those are content-honesty bugs that motion can paper over. Call them
out even if the animation is smooth.
