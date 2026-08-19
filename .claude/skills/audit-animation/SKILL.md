---
name: audit-animation
description: Audits product UI motion and Remotion video animation against NomNom DESIGN.md §9 and composition craft rules. Scores each motion type, lists P0–P3 issues, and does not implement fixes unless asked. Use when the user says "audit animation", "review motion", "animation review", "check transitions", "prefers-reduced-motion audit", "reel motion QA", "why does this feel janky", or wants a motion pass across all animation types before adding more.
argument-hint: "[ui|remotion|all] [target path or composition]"
---

# Audit Animation

Review motion. Do not add animation in this skill — that is `animate`
(UI) or `remotion-animation` / `motion-designer` (video). Do not ship
content — that is `content-machine`.

If the user asked to **add** motion, stop and use `animate` (product) or
the Remotion pipeline (video), but keep the NomNom overrides in
[references/skill-review.md](references/skill-review.md).

## Scope

| Ask | Surface | Checklist |
|---|---|---|
| omitted, `all`, a feature folder | Product UI first, Remotion if the folder is under `remotion/` | [ui-checklist.md](references/ui-checklist.md) |
| `ui` / a `src/` path | CSS / MUI sx / existing `src/components/animate` | ui-checklist |
| `remotion` / a composition name | `remotion/src/` | [remotion-checklist.md](references/remotion-checklist.md) |

Default to **all types of motion** on the target, not one hero animation.

## NomNom stack (do not follow generic animate defaults)

Source of truth: `DESIGN.md` (especially §2 color, §3 type, §4–6 shape/space/shadow,
§9 Motion, §12 anti-patterns, §19 a11y) and `COMPONENTS.md`. Motion that
uses off-brand color, Arial/Georgia, `font-weight: 900`, or a custom
sheet instead of `ResponsiveSheet` is a design-system fail, not a pass.

- **Library:** CSS transitions + MUI `sx`. No new animation library.
  Framer Motion already exists in `src/components/animate/` (`m` from
  `framer-motion`) — reuse those wrappers; do not add GSAP, lottie-web,
  or a second motion runtime.
- **Hook:** `usePrefersReducedMotion` from `src/hooks/use-prefers-reduced-motion.js`
  or `@media (prefers-reduced-motion: reduce)` / `no-preference`.
- **Properties:** `transform` and `opacity` only. Exception: sub-16px
  indicator dots may animate `width` (carousel pills). Nothing larger.
- **Durations (product UI):**

  | Duration | Use |
  |---|---|
  | `0.08s` | Micro: map pin opacity |
  | `0.15s` | Fast press `scale(0.98)` |
  | `0.2s` | Hover, color, box-shadow |
  | `0.4s` | Progress fill |
  | `0.65s–0.7s` | Entrance, image parallax |

- **Easing:** `ease` or `ease-out`. No bounce, no elastic.
- **Press:** `transition: 'transform 0.15s'` + `&:active: { transform: 'scale(0.98)' }`.
- **Hover cards:** `box-shadow` 0.2s to `theme.customShadows.z12`.

Generic `animate` skill timings (100–800ms, Framer/GSAP, quart/quint/expo
beziers) **do not apply** to NomNom product UI. Flag them if a previous
pass introduced them.

Existing Framer defaults in `src/components/animate/variants/transition.js`
(`0.32` hover, `0.64` enter, `0.48` exit) are allowed only inside that
folder. New `sx` transitions use the DESIGN.md table above.

## Motion types — review every one that exists on the target

1. **Entrance** — page/section load, stagger, hero
2. **Micro-interaction** — press, hover, like, toggle, checkbox
3. **State change** — show/hide, expand, enable/disable, success/error
4. **Navigation** — tabs, sheets, route, carousel
5. **Feedback / guidance** — tooltips, drag, copy-confirm, focus
6. **Loading** — skeleton vs spinner vs splash (`src/components/loading-screen`)
7. **Scroll** — sticky, parallax, horizontal row
8. **Delight** — empty states, celebrations (must still respect reduced motion)
9. **Remotion scene motion** — springs, interpolations, staggers, holds
   (only if the target is a composition)

A type that is absent on the target is `n/a`, not a fail — unless the
type is required (press feedback on tappable cards, reduced-motion on
any non-essential motion).

## Procedure

1. **Lock the target.** Feature, page, component, or composition. If
   unset, ask once; if they said "all", scan `src/components/animate`,
   sheets, home hero, roulette, loading screens, and `remotion/src`.
2. **Read DESIGN.md §9** (and §2/§3/§12 if the target also restyles) plus
   `COMPONENTS.md` for any sheet/row/skeleton you are scoring.
3. **Grep before reading files:**
   - `transition:`, `animation:`, `@keyframes`, `transform`, `framer-motion`, `m.`
   - `width`/`height`/`top`/`left`/`margin`/`padding` inside transitions
   - `cubic-bezier`, `bounce`, `elastic`, `spring(`
   - `prefers-reduced-motion`, `usePrefersReducedMotion`
4. **Score each dimension 0–4** using the tables in the checklists.
5. **Write the report. Stop.** Do not implement unless the user then
   asks to fix. If they want both, report first, then fix P0/P1 only.

## Report format

```markdown
# Animation audit: [target]

## Health

| Dimension | Score (0–4) | Key finding |
|---|---|---|
| Purpose | | |
| Properties (GPU) | | |
| Timing / easing | | |
| Reduced motion | | |
| Coverage (types) | | |
| Performance | | |
| Remotion craft | n/a or score | |

**Total:** /24 (UI) or /28 (with Remotion)

## By motion type
| Type | Present | Verdict | Notes |
|---|---|---|---|

## Issues
### P0 — ships broken / a11y fail
### P1 — jank, layout animation, missing press feedback on primary actions
### P2 — duration/easing drift from DESIGN.md
### P3 — polish

## Do not fix from generic skills
[List any animate / delight / remotion-animation advice that would
violate DESIGN.md if applied here]
```

Scoring: 0 = absent or harmful, 4 = matches DESIGN.md and feels
intentional. Total is the sum of scored dimensions (skip `n/a`).

## After the report

- Fixes for product UI → implement against DESIGN.md, reuse
  `src/components/animate` wrappers if Framer is already in that tree.
- Fixes for Remotion → `remotion-best-practices` + composition files
  under `remotion/src/` (JS, not the TS paths in older Remotion skills).
- Spec mismatch on a video → `remotion-video-reviewer` as a second pass.
- Adding delight → `delight` / `microinteractions`, still bound by §9.

## Constraints

- Do not add bounce/elastic easing to product UI.
- Do not introduce GSAP, Lottie, or a new motion library.
- Do not animate layout properties except the sub-16px pill exception.
- Do not ignore `prefers-reduced-motion`.
- Do not treat Remotion bounce springs as a precedent for product UI.
