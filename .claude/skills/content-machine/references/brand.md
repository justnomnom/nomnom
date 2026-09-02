# Brand lock — DESIGN.md

Every lane in this skill must look and sound like the app. Source of
truth: `DESIGN.md`, `COMPONENTS.md`, `remotion/src/theme.js`,
`src/theme/palette.js`, `src/theme/typography.js`, `src/theme/spacing.js`.

Generic marketing skills (social-content, ad-creative, copywriting) do
not know these rules. Apply this file after they run.

## Personality and voice

- Cozy · Fun · a little hungry. Never corporate, never judgmental.
- Tagline: **Restaurant picks from people you trust**
- We are human curation — not aggregate star scores, not a cold directory.
- Words: spots, lists, NomNomming, Spin NomNom Roulette. Never establishments,
  locations, entities, "elevate", "seamless", "unleash".
- Buttons and captions: sentence case. Overline ALL CAPS only for short
  section labels (ACCOUNT, source names on punchline stills).
- Errors and empty states: say what happened and what to try. Never
  "An error occurred" / "nothing here".

## Color

Terracotta (`#FF6B35` / `primary.main`) is ~10% of any surface — CTAs,
wordmark, a 10px bar, one chip. Never a full-bleed terracotta canvas.

| Role | Hex | Token |
|---|---|---|
| Paper | `#faf9f5` | `marketing.paper` / `C.bg` |
| Card | `#fdfcfa` | `background.paper` / `C.paper` / `common.white` |
| Ink | `#15130f` | `grey[900]` / `C.ink` |
| Secondary | `#6e6657` | `grey[600]` / `C.ink2` |
| Muted | `#948c7c` | `grey[500]` / `C.ink3` |
| Terra | `#FF6B35` | `primary.main` / `C.terra` |
| Gold stars | `#F59E0B` | `warning.main` / `C.gold` |
| Divider | `#e8e6dc` | `marketing.dividerWarm` |

Banned in stills and reels: cool slate (`#0F172A`, `#64748B`, `#94A3B8`),
pure `#000`, pure `#fff` (use `#fdfcfa` / `C.white`; white on a terracotta
*fill* is the one exception — `PRIMARY_ON_FILL_TEXT`).

Text on filled terracotta is white. Terracotta as small text on parchment
uses `readableAccent` / `primary.darker` (`#B8481F`).

## Type

| Role | Family | Weights |
|---|---|---|
| UI / wordmark / captions | Albert Sans | 400–800, never 900 |
| Display / punchline headline | Libre Baskerville | 400 · 700 only |
| Handles and numbers | JetBrains Mono | 400–700 |

Never Arial, Georgia-as-brand, Inter, or `font-weight: 900`.
Never mix Baskerville into dashboard chrome; stills and marketing reels
may use it for headlines.

## Shape, space, shadow

- Card corners: **32px** (`borderRadius: 2` in sx). Surfaces: `RADIUS.base`
  16 / `loose` 24 / `pill` 9999. The app is very rounded — no sharp cards.
- Space from `SPACE.*` (4 / 8 / 12 / 16 / 24 / 32 / 48 / 64). Do not invent
  20px / 18px radii.
- Shadows from `grey[900]` (`rgba(21,19,15,…)`) or `customShadows.*`.
  Never `rgba(0,0,0,…)`.
- Icons: `ic.*` from `src/assets/icons`. No emoji on punchline stills.
  No inline Iconify strings in product UI.

## Motion (if you touch UI or compositions)

Follow `DESIGN.md` §9. Product UI: CSS + MUI `sx`, `transform`/`opacity`,
`usePrefersReducedMotion`. Reels may use springs in `remotion/src/theme.js`
(`easeOutCubic`; `easeOutBack` is video-only). See `audit-animation`.

## Components

Before new UI around content (sheets, rows, empty states), check
`COMPONENTS.md`: `ResponsiveSheet`, `HubNavRow`, `ProfileListItemRow`,
`touchTargetSx`, `tabularNumsSx`.

## Lane-specific

- **Reels** already tokenise via `remotion/src/theme.js`. Do not pass
  hex that is not in `C`. Flag leftover `#fff` / `#000` in compositions.
- **Punchlines** use `.claude/skills/nomnom-news-punchline/assets/template.html`
  (parchment + 10px terra bar). Do not revive the full-terracotta
  `instagram-posts` look.
- **Captions** stay factual (`lib/captions.mjs`). Voice on top may be
  playful; it may not invent ratings or circle claims.
