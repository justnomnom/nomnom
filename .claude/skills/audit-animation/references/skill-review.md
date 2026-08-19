# Animation skill review

Reviewed 2026-08-19. Generic motion skills fight DESIGN.md. This file
is the NomNom override map.

## Inventory

| Skill | Job | NomNom status |
|---|---|---|
| **audit-animation** | Review all motion types, scored report, no implement | Source of truth for audits |
| **animate** | Add UI motion | Useful categories; **wrong** timings, easing list, and libraries |
| **microinteractions** | Trigger / rules / feedback / loops | Keep the four-part structure; duration still DESIGN.md |
| **delight** | Joy moments | Easy to over-animate. Reduced motion required. No confetti on core flows. |
| **polish** | Last visual pass | Mentions motion; defer motion findings to this audit |
| **audit** | A11y/perf/theme/responsive | Overlaps reduced-motion and layout animation. Use audit-animation when the ask is motion-first. |
| **motion-designer** | VIDEO_SPEC.md | Video only. 12 principles OK. NomNom reel length is ~20–35s, not a 90s film. |
| **remotion-animation** | Spring/interp constants, **no components** | Fine for video params. Bouncy springs stay in Remotion, never product UI. |
| **remotion-best-practices** | Remotion rule files | Follow for `remotion/` code. |
| **remotion-video-reviewer** | Spec compliance QA | Paths assume `src/remotion/...tsx`. Real tree is `remotion/src/**/*.jsx`. |
| **remotion-composition** | Sequence layout | Same path mismatch. |
| **remotion-component-gen** | Scene components | Same path mismatch; generate JS. |
| **remotion-scaffold** | Folders | Same. |
| **remotion-render-config** | Output settings | Fine. |
| **remotion-asset-coordinator** | Asset manifest | Fine; maps live in `remotion/public/maps/`. |
| **remotion-performance-optimizer** | Render bottlenecks | Fine. |
| **remotion-spec-translator** | Spec → skills | Orchestrator; do work in-process. |
| **create-video-start** | New composition pipeline | Do not `claude -p`. JS under `remotion/src/`. |
| **content-machine** | Produce reels/posts | Not an animation skill. |

## Conflicts to enforce

### 1. Library

- `animate` says Framer Motion or GSAP.
- DESIGN.md says CSS + MUI sx, no animation library.
- Repo already has `framer-motion` inside `src/components/animate/`.

**Rule:** Reuse `MotionContainer` / `MotionViewport` / `motion-part`.
Do not add GSAP. Do not sprinkle `m.div` in random feature files without
the reduced-motion `Box` fallback those wrappers already implement.

### 2. Duration

- `animate`: 100–150ms feedback, 200–300ms state, 500–800ms entrance.
- DESIGN.md: 80ms / 150ms / 200ms / 400ms / 650–700ms.

**Rule:** DESIGN.md wins on product UI. Remotion uses frame counts at 30fps.

### 3. Easing

- `animate`: forbid bounce/elastic; recommend quart/quint/expo.
- DESIGN.md: `ease` or `ease-out` only.
- `remotion-animation`: documents bouncy springs.

**Rule:** Product UI = ease/ease-out. Remotion springs are video-only.

### 4. Layout properties

All three of DESIGN.md, `animate`, and React Native AGENTS.md agree:
do not animate width/height/top/left. NomNom's **only** exception is
sub-16px carousel pills.

`save-to-list-sheet.js` and similar sheets are high-risk for height
animation — flag them.

### 5. Path / language drift (Remotion pack)

Older Remotion skills were copied from a TypeScript template. This
repo's templates are JSX in `remotion/`. When those skills say
`constants.ts` / `Root.tsx`, write `constants.js` / `Root.jsx` here.

## Trigger collisions

| User says | Winner |
|---|---|
| "add animation" / "make it feel alive" | **animate**, then apply this review's overrides |
| "audit animation" / "review motion" / "all types of animation" | **audit-animation** |
| "microinteraction" / "button feedback" as design theory | **microinteractions** |
| "delight" / "confetti" | **delight** (constrained) |
| "review the video against the spec" | **remotion-video-reviewer** |
| "configure springs" | **remotion-animation** |
| "this reel batch" | **content-machine** |

## Types covered vs who owns adding them

| Type | Add via | Audit via |
|---|---|---|
| Entrance | animate | audit-animation |
| Micro-interaction | animate + microinteractions | audit-animation |
| State / nav / sheets | animate | audit-animation |
| Loading / skeleton | existing skeleton system | audit-animation |
| Delight | delight | audit-animation |
| Remotion scene | remotion-animation + component-gen | audit-animation then video-reviewer |

An "all types" animation review means the audit walks that table, not
that every type must be added.
