# Product UI motion checklist

Use on `src/` (and Capacitor webviews). Skip this file for Remotion-only audits.

## Score tables

### Purpose (0–4)

- 0 Motion with no state-change story, or motion that hides a bug
- 2 Some feedback, several decorative loops
- 4 Every animation explains entrance, exit, or feedback

### Properties (0–4)

- 0 Animating `width`/`height`/`top`/`left`/`margin`/`padding` on real UI
- 2 Mix of transform and layout
- 4 Transform + opacity only, plus the documented sub-16px pill exception

### Timing / easing (0–4)

- 0 Bounce/elastic, or >500ms on press/hover
- 2 Durations in the right ballpark, easing is `ease-in-out` everywhere
- 4 Matches DESIGN.md table; press 0.15s scale(0.98); hover shadow 0.2s

### Reduced motion (0–4)

- 0 Non-essential motion with no media query / hook
- 2 Some paths gated, skeletons or splash still thrash
- 4 `usePrefersReducedMotion` or CSS; content remains visible; no infinite loops

### Coverage (0–4)

- 0 Tappable cards with no press state; sheets snap
- 2 Primary CTAs feedback, lists/sheets incomplete
- 4 Types that exist on the target all have a verdict; required types present

### Performance (0–4)

- 0 Layout thrash, `will-change` on everything, animating large filters
- 2 Occasional jank on low-end / Capacitor
- 4 60fps plausible; `will-change` rare and removed after; no extra libraries

## Required patterns

**Press (cards, rows, icon buttons that feel tappable):**

```js
transition: 'transform 0.15s',
'&:active': { transform: 'scale(0.98)' },
```

**Hover elevation:**

```js
transition: 'box-shadow 0.2s',
'&:hover': { boxShadow: theme.customShadows.z12 },
```

**Reduced motion in sx:**

```js
'@media (prefers-reduced-motion: reduce)': { transition: 'none' },
```

Or skip the animation branch when `usePrefersReducedMotion()` is true
(see `MotionContainer`, splash, roulette).

## Known hotspots (scan these on an "all" UI audit)

| Area | Why |
|---|---|
| `src/components/animate/` | Framer wrappers — reduced-motion must fall back to `Box` |
| `src/components/loading-screen/` | Splash/logo motion |
| `src/sections/home/home-hero-showcase.js` | Parallax / entrance |
| `src/sections/roulette/` | Spin bob — already gated |
| `src/sections/lists/save-to-list-sheet.js` | Sheet height vs transform |
| `src/components/horizontal-scroll-row/` | Scroll snapping vs smooth |
| `src/sections/onboarding/onboarding-wizard.js` | Multi-step transitions |
| `src/components/dashboard/dashboard-motion.js` | Dashboard delight |
| `src/components/empty-content/` | Empty-state float |

## Tokens next to motion (flag as P2 if motion is otherwise fine)

Motion that looks right but paints off-brand is still a fail:

- Cool slate hex (`#0F172A`, `#64748B`, `#94A3B8`) instead of parchment greys
- Pure `#000` / `#fff` shadows or fills (`common.black` / `C.white` / `grey[900]`)
- `font-weight: 900` (Albert Sans caps at 800)
- Invented radius (20px, 18px) instead of 8 / 16 / 24 / 32 / pill
- Custom bottom sheet while `ResponsiveSheet` / `sheet-shell` already fits
- Tappable row missing press `scale(0.98)` *and* not using `HubNavRow` /
  `ProfileListItemRow` / `SettingsSelectionRow`

## Fail immediately (P0)

- Infinite animation under `prefers-reduced-motion: reduce`
- Layout animation on a sheet/drawer larger than 16px using `height`/`top`
- New `framer-motion` import outside `src/components/animate/` without a
  reduced-motion static fallback
- Bounce/elastic easing on product UI

## P1

- Primary tappable surface missing press scale
- Route or sheet change with no opacity/transform, feels like a snap
- Skeleton that never respects reduced motion

## Do not flag

- MUI ripple on buttons (platform default)
- `react-loading-skeleton` pulse (product standard; still check reduced motion)
- Mapbox camera motion (map engine, not CSS)
