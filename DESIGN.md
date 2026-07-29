# NomNom — Design Reference

> Living document. Update when theme tokens change. Last generated from codebase audit + visual inspection of all key screens.

---

## 1. Brand Identity

**Name**: NomNom  
**Tagline**: Restaurant picks from people you trust  
**Personality**: Cozy · Fun · Nom Nom — warm, playful, a little hungry. Never corporate, never judgmental.  
**Voice**: Playful food language ("Nom Nomming!", "Shake It Up", "spots"). Warm and direct about the value of human recommendations.

**What we are**: Human curation from creators and locals you follow — not aggregate star scores.  
**What we are not**: A cold blue food directory. A premium-cold aesthetic. A generic "restaurant app."

---

## 2. Color System

Source of truth: `src/theme/palette.js`

### Primary — Terracotta

| Token | Hex | Use |
|---|---|---|
| `primary.lighter` | `#FFE8DF` | Backgrounds, tinted surfaces (avatar ring, icon bg) |
| `primary.light` | `#FFA070` | Hover accents, secondary highlights |
| `primary.main` | `#FF6B35` | CTAs, active nav, links, focus states, chips |
| `primary.dark` | `#E85A28` | Pressed state |
| `primary.darker` | `#B8481F` | Rare emphasis |
| `primary.contrastText` | `#FFFFFF` | Text on filled primary buttons |

**Rule**: Terracotta is disciplined — roughly 10% of any surface. Overuse kills its warmth. Use it for: active states, primary buttons, single accent per card, icon tint, text links.

### Secondary — Cool Slate (intentional)

| Token | Hex | Use |
|---|---|---|
| `secondary.lighter` | `#F8FAFC` | — (rare) |
| `secondary.light` | `#F1F5F9` | — (rare) |
| `secondary.main` | `#E2E8F0` | Neutral chip backgrounds, dividers in cool-leaning contexts |
| `secondary.dark` | `#CBD5E1` | Pressed neutral chips |
| `secondary.darker` | `#94A3B8` | Rare cool emphasis |
| `secondary.contrastText` | `#0F172A` | Text on filled secondary |

**Rule**: `secondary` is cool slate by design — it gives MUI's `color="secondary"` a neutral fallback that doesn't fight terracotta. Don't use `secondary` for brand surfaces, marketing chrome, or anything next to large parchment fields (temperature mismatch). Prefer `grey.*` or `marketing.*` for neutral surfaces. `secondary` is mainly here to keep MUI components that default to `color="secondary"` from looking broken.

### Semantic Palette

| Role | Main | Use |
|---|---|---|
| `success` | `#10B981` | Confirmation, saved, positive indicators |
| `warning` | `#F59E0B` | Star ratings (yellow-gold), caution states |
| `error` | `#EF4444` | Destructive actions, validation errors |
| `info` | `#3B82F6` | Informational, occasionally links in editorial |

**Rule on semantics**: These are deliberately Tailwind-standard colors, not warmed toward the parchment palette. Reason: semantic colors are read as state signals first, brand second — a warm "success" green reads as olive, a warm "info" blue reads as muddy. Users recognise the cool defaults instantly. Keep terracotta as the only warm-brand color in the UI; let semantics stay cool. If a semantic surface needs to sit on parchment without clashing, lower saturation via `alpha(success.main, 0.12)` for the background and keep the icon/text at full saturation.

### Neutrals — Warm Parchment

Not cold grey. The grey ramp is a warm parchment family (~60° hue, low chroma) so it sits next to the `marketing.*` editorial surfaces without temperature mismatch. Lightness values match the previous slate scale step-for-step, so contrast hierarchy is unchanged — only the temperature shifts.

| Token | Hex | Use |
|---|---|---|
| `grey[0]`   | `#fdfcfa` | Lightest paper / card surface |
| `grey[100]` | `#f8f7f2` | Light hover backgrounds |
| `grey[200]` | `#f1ede4` | Dividers, subtle backgrounds |
| `grey[300]` | `#e2ddd0` | Card borders, input borders |
| `grey[400]` | `#ccc6b6` | Placeholder text, disabled borders |
| `grey[500]` | `#948c7c` | Secondary icons, muted text |
| `grey[600]` | `#6e6657` | Secondary text (`text.secondary`) |
| `grey[700]` | `#4d473c` | Body text |
| `grey[800]` | `#25221c` | Dark backgrounds, dark mode paper |
| `grey[900]` | `#15130f` | Primary text (`text.primary`), dark default bg |

### Marketing / Editorial Surfaces

Used in the marketing shell (homepage, landing pages) and any hero/parchment treatment. **Not** for the dashboard chrome.

| Token | Value | Use |
|---|---|---|
| `marketing.paper` | `#faf9f5` | Default background (light) |
| `marketing.parchment` | `#f5f4ed` | Neutral background, card surfaces |
| `marketing.parchmentDeep` | `#edeae0` | Deeper parchment, hover on parchment |
| `marketing.dividerWarm` | `#e8e6dc` | Dividers on warm backgrounds |
| `marketing.hairline` | `#d1cfc5` | Fine hairline borders |
| `marketing.surfaceDark` | `#1c1b19` | Dark editorial surfaces |
| `marketing.surfaceDarker` | `#141413` | Deepest dark bg |
| `marketing.onDark` | `#faf9f5` | Text / content on dark editorial surfaces |
| `marketing.shadowWarm` | `#30302e` | Warm-tinted shadow base for editorial drop-shadows (use via `alpha()`) |
| `marketing.outlineMuted` | `#4d4c48` | Hairline outlines on dark editorial surfaces |

### Light Mode Backgrounds

| Token | Value | Use |
|---|---|---|
| `background.default` | `#faf9f5` (marketing.paper) | Page background |
| `background.paper` | `#fdfcfa` | Card / sheet surface |
| `background.neutral` | `#f5f4ed` (marketing.parchment) | Section backgrounds, filter areas |

### Dark Mode

Dark mode mirrors the warm intent: `background.default = grey[900]`, `background.paper = grey[800]`. Marketing surfaces remain the same (shared reference). Dark mode is supported but **light is the brand hero** — marketing pages and the core product both default to light.

### Common

| Token | Value | Note |
|---|---|---|
| `common.black` | `#121110` | Warm near-black for overlays; never pure `#000` |
| `common.white` | `#fdfcfa` | Off-white that matches the warm card surface; never pure `#fff` |

---

## 3. Typography

Source of truth: `src/theme/typography.js`

### Font Stack

| Role | Family | Weights | Use |
|---|---|---|---|
| **UI / sans** | Albert Sans | 400 · 500 · 600 · 700 · 800 | All dashboard chrome, body copy, labels |
| **Display / serif** | Libre Baskerville | 400 · 700 | Marketing headlines, editorial emphasis |
| **Mono** | JetBrains Mono | 400 · 500 · 600 · 700 | Code, handles (@username), numeric data |

Fonts are loaded via `next/font/google` and consumed as MUI theme values (`theme.typography.fontFamily`, `fontSecondaryFamily`, `fontFamilyMono`). They are **not** exposed as global CSS variables — always read from the theme, never write `font-family: var(--font-sans)`.

### Weight Tokens

Exposed on `theme.typography` for use in `sx`:

| Token | Value |
|---|---|
| `fontWeightRegular` | 400 |
| `fontWeightMedium` | 500 |
| `fontWeightSemiBold` | 600 |
| `fontWeightBold` | 700 |

Albert Sans is loaded at 400/500/600/700/800. No `900` weight is loaded — see Typography Rules.

### Type Scale

All sizes are in the base `theme.typography` object. `responsiveFontSizes` applies to headings only.

| Variant | Base size | Weight | Line height | Letter spacing | Notes |
|---|---|---|---|---|---|
| `h1` | 28px → 34px (lg) | 800 | 1.2 | -0.02em | Marketing heroes; Albert Sans |
| `h2` | 24px → 30px (lg) | 800 | 1.25 | -0.015em | Section headings |
| `h3` | 22px → 28px (lg) | 700 | 1.3 | -0.01em | Sub-section headings |
| `h4` | 20px → 24px (lg) | 700 | 1.4 | -0.005em | Card titles, sheet headings |
| `h5` | 18px → 20px (lg) | 700 | 1.4 | 0 | |
| `h6` | 17px → 18px (lg) | 700 | 1.45 | 0 | Page headers (modal/sheet titles) |
| `subtitle1` | 15px | 600 | 1.5 | 0 | Restaurant names in cards |
| `subtitle2` | 14px | 600 | ~1.57 (22/14) | 0 | Secondary labels |
| `body1` | 16px | 400 | 1.6 | 0 | Main body copy |
| `body2` | 14px | 400 | ~1.57 (22/14) | 0 | Supporting text, metadata |
| `caption` | 12px | 400 | 1.5 | 0 | Timestamps, fine print |
| `overline` | 12px | 700 | 1.5 | 0.08em | Section labels in ALL CAPS (e.g. "ACCOUNT") |
| `button` | 14px | 700 | ~1.71 (24/14) | 0 | textTransform: unset (no forced caps) |

**Headings tighten as they get bigger.** Negative letter-spacing on h1–h4 compensates for Albert Sans's natural tracking at large sizes — heroes feel deliberate, not loose. Line-height drops with size too (1.2 at h1, 1.45 at h6) so display copy reads as a single sculpted block, not a paragraph. Don't override these per-component; if a hero feels too tight or loose, that's a system-level decision.

**Body1 is 1.6, not 1.5.** Slightly more open than typical for longer-form content (list descriptions, settings hints, marketing body). Don't reduce to 1.5 to "tighten" — that's the contract.

### Sub-scale: Compact Labels

For dense UI elements (tags, badges, metadata chips) where body2/caption are still too large:

| Size | Common use |
|---|---|
| `0.8125rem` (13px) | List tile metadata lines |
| `0.6875rem` (11px) | Settings description text, tag labels |
| `0.65rem` (10.4px) | Compact status chips, tiny rank labels |
| `0.625rem` (10px) | Micro-labels (awards badges, overlaid text) |

These are intentional dense-UI sizes — not errors. Don't "normalize" them to body2.

### Typography Rules

- **Max line length**: 65–75ch for body copy, 80ch absolute max
- **No forced uppercase on buttons**: `textTransform: 'unset'` is global; use Overline variant for label caps instead
- **Pairing**: Albert Sans for UI, Libre Baskerville for marketing display. Never mix serif into dashboard chrome
- **Hierarchy**: Minimum 1.25× ratio between adjacent heading steps
- **Letter-spacing on headings**: Don't override the negative tracking on h1–h4. It's tuned for Albert Sans at display sizes and gets baked into the visual rhythm. If a heading looks loose, check that it's using the right variant before touching `letterSpacing`
- **Overline tracking**: `letterSpacing: 0.08em` is the source of the overline's identity — open caps read as a section label, not shouting. Don't tighten
- **Numbers**: spread `tabularNumsSx` (from `src/theme/spacing.js`) onto labels showing live numbers — ratings, follower/save counts, list sizes, admin tables. Locks digit advance widths so values don't reflow as they tick
- **No `fontWeight: 900`**: Albert Sans is loaded at 400/500/600/700/800. `900` falls back to fake-bold and renders inconsistently across platforms. Cap at `800`

---

### Stacking (z-index)

Source of truth: `src/theme/spacing.js` — `Z_INDEX`. MUI defaults are appBar 1100, drawer 1200, modal 1300, snackbar 1400, tooltip 1500; the `Z_INDEX` tokens stay inside those bands so MUI components keep their expected stacking.

| Token | Value | Use |
|---|---|---|
| `Z_INDEX.belowAppBar` | 1040 | Dashboard chrome scrolling under the bar |
| `Z_INDEX.mobileBottomNav` / `mobileBottomSheet` | 1088 | Mobile bottom nav and bottom sheets |
| `Z_INDEX.dashboardBottomNav` | 1090 | Dashboard's mobile bottom nav |
| `Z_INDEX.navRailToggle` | 1100 | Nav rail show/hide pill |
| `Z_INDEX.searchTypeahead` | 1300 | Search typeahead/suggestions Popper — MUI menu/popover band, clears AppBar and drawers without escalating |
| `Z_INDEX.scrollProgress` | 1999 | Page scroll progress indicator |
| `Z_INDEX.splashScreen` | 9998 | Initial splash |
| `Z_INDEX.routeProgress` | 9999 | Route change progress bar |
| `Z_INDEX.fullscreenBackdrop / Content / Dialog` | 10000 / 10001 / 10002 | Fullscreen takeovers that must beat tooltips and snackbars |

Use named tokens for any new overlay. Avoid raw `zIndex: 9999`-style numbers — they always escalate.

---

## 4. Shape & Border Radius

Source of truth: `src/theme/spacing.js` — `RADIUS` tokens, merged into `theme.shape`.

### Named tokens (preferred)

Import from `src/theme/spacing`:

| Token | px | Use |
|---|---|---|
| `RADIUS.tight` | 8 | Small internal chips, badges, skeleton pills |
| `RADIUS.base` | 16 | Inputs, menu items, small cards, skeleton cards (also `theme.shape.borderRadius`) |
| `RADIUS.loose` | 24 | Dropdown paper, popover surfaces, larger cards |
| `RADIUS.pill` | 9999 | Fully rounded: avatars, filter chips, pill buttons, status badges, progress bars |

**Prefer named tokens.** `sx={{ borderRadius: RADIUS.loose / 8 }}` reads worse than passing the raw px via `style` on non-MUI components, so for non-MUI surfaces use `style={{ borderRadius: RADIUS.base }}`. For `react-loading-skeleton`: `style={{ borderRadius: RADIUS.base }}` for cards, `RADIUS.tight` for pills.

### MUI `sx` multiplier reference

`shape.borderRadius = RADIUS.base = 16`. When you use a number in `sx`, MUI multiplies by this value:

| `sx` value | Computed | Use |
|---|---|---|
| `borderRadius: 0.5` | 8px | = `RADIUS.tight` |
| `borderRadius: 1` | 16px | = `RADIUS.base` — inputs, menu items |
| `borderRadius: 1.5` | 24px | = `RADIUS.loose` — dropdowns, popovers |
| `borderRadius: 2` | 32px | Standard content cards (most cards in app) |
| `borderRadius: 3` | 48px | Large sheet-style cards (roulette card, etc.) |
| `borderRadius: 10` | 160px | Filter chips, pill buttons (effectively full pill at normal heights) |
| `borderRadius: 999` | pill | Equivalent to `RADIUS.pill` for `style` props |

Standard card uses `borderRadius: 2` (32px) — this is **bigger than `RADIUS.loose`** and intentional: the cozy posture lives in the card radius. If you're building a non-card surface, default to `RADIUS.base` (16px) — don't escalate to 32 unless it's actually card-shaped.

**The app is intentionally very rounded.** This contributes to the "cozy" brand feel. Do not introduce sharp-cornered cards.

---

## 5. Spacing

Source of truth: `src/theme/spacing.js` — `SPACE`, `STEP_RHYTHM`, `HEADER_GAP_SX`, `TOUCH_TARGET_SIZE`, `touchTargetSx`. MUI base unit = 8px.

### `SPACE` tokens (preferred)

Values are MUI multipliers — use as `theme.spacing(SPACE.md)` or `sx={{ p: SPACE.md }}`. **Use these instead of inventing fractional values** like `1.75 / 2.25 / 2.75`.

| Token | Multiplier | px | Common use |
|---|---|---|---|
| `SPACE.xxs` | 0.5 | 4 | Icon-to-label gap, chip internal padding |
| `SPACE.xs` | 1 | 8 | Tight grouping within a row |
| `SPACE.sm` | 1.5 | 12 | Related elements, list row internals, menu item padding |
| `SPACE.md` | 2 | 16 | Card padding, default form gap |
| `SPACE.lg` | 3 | 24 | Between groups inside a section |
| `SPACE.xl` | 4 | 32 | Between sections on dense surfaces |
| `SPACE['2xl']` | 6 | 48 | Between sections on marketing pages |
| `SPACE.section` | 8 | 64 | Top-level page section breaks |

### `STEP_RHYTHM` — vertical rhythm for long-form content

Pick ONE per surface; do not mix.

| Token | xs | sm+ | Use |
|---|---|---|---|
| `STEP_RHYTHM.cozy` | `SPACE.lg` (24) | `SPACE.xl` (32) | Wizards, settings hubs, dense forms |
| `STEP_RHYTHM.spacious` | `SPACE.xl` (32) | `SPACE['2xl']` (48) | Marketing flows, onboarding |

### `HEADER_GAP_SX` — toolbar gap

`{ xs: SPACE.xxs, sm: SPACE.xs }` — main and dashboard header toolbars share this gap. Spread it instead of redefining.

### Touch targets

`TOUCH_TARGET_SIZE = 44` (px). Spread `touchTargetSx` onto every icon-button or pill in a header / nav bar. This is a Capacitor/iOS requirement, not a soft guideline.

### Row rhythm sub-scale (list/settings rows)

Tappable rows (settings rows, list-item rows, hub rows) and the skeletons that mirror them use a consistent intermediate rhythm the `SPACE` scale doesn't capture:

| Value | px | Common use |
|---|---|---|
| `py: 1.75` | 14 | List-item rows (`ProfileListItemRow`, loading skeletons) |
| `py: 2.25` | 18 | Settings hub rows, billing cards, drill rows |

These are intentional dense-row paddings — not invented one-offs. Keep skeletons in lockstep with the live row they mirror. Outside row internals, stick to `SPACE.*`.

**Rhythm rule**: Vary spacing to signal hierarchy. Group related elements tight, separate sections generously. Don't apply the same padding everywhere.

---

## 6. Shadows

Source of truth: `src/theme/custom-shadows.js`

Theme shadows use a warm near-black (`grey[900]`) base in light mode, `common.black` in dark. Primary-colored shadows used on CTA buttons.

| Token | Use |
|---|---|
| `customShadows.z1` | Subtle card lift (hairline) |
| `customShadows.z4` | Light card hover |
| `customShadows.z8` | Default card elevation |
| `customShadows.z12` | Hovered elevated card |
| `customShadows.z16` | Active states, focused cards |
| `customShadows.z20` | Deep hover, large floating sheets (between z16 and z24) |
| `customShadows.z24` | Dialog / modal |
| `customShadows.card` | `0 0 0 1px grey[300], 0 1px 2px …` — standard card outline+lift |
| `customShadows.dropdown` | Popover / menu dropdowns |
| `customShadows.dialog` | Modal dialog |
| `customShadows.primary` | CTA button resting shadow (terracotta-tinted) |
| `customShadows.primaryHover` | CTA button hover shadow (stronger terracotta) |
| `customShadows.chipGlow` | Selected/active filter chips and pill toggles — terracotta glow (`0 4px 14px -4px primary @ 0.45`) |
| `customShadows.secondary` | Soft slate-tinted shadow for `color="secondary"` contained buttons |
| `customShadows.info` | Info-tinted shadow (blue) for filled info CTAs |
| `customShadows.success` | Success-tinted shadow (green) for filled success CTAs |
| `customShadows.warning` | Warning-tinted shadow (amber) for filled warning CTAs |
| `customShadows.error` | Error-tinted shadow (red) for filled destructive CTAs |

**Rule on colored shadows**: Only contained buttons in `primary` color receive a colored shadow automatically. The other tinted shadows (`info` / `success` / `warning` / `error`) exist for explicit semantic CTAs (e.g., a green "Confirm save" or red "Delete forever") — apply them via `boxShadow: theme.customShadows.error` on the specific element, not as a default for every error-colored button.

**Rule**: Never use `box-shadow: none` on contained primary buttons — the terracotta shadow is part of the CTA's identity.

---

## 7. Component Patterns

### Buttons

Four variants available: `contained`, `outlined`, `text`, `soft`.

| Variant | When to use |
|---|---|
| **contained primary** | One primary action per screen (Save, Confirm, SHAKE IT UP) |
| **soft primary** | Secondary brand action, less urgency |
| **outlined** | Destructive-ish or neutral (Delete, Cancel) — 2px border |
| **text** | Inline actions, header right-side actions (e.g., "Save" in Edit Profile header) |

Sizes: `small` (h=30), `medium` (default), `large` (h=48, 15px font).

Contained primary buttons automatically receive `customShadows.primary` and `customShadows.primaryHover` — do not override this.

**Always declare `color` explicitly on `variant="contained"`.** The theme defaults `MuiButton` to `color="inherit"`, so a contained button without a color renders `grey[800]` near-black — not terracotta. Write `color="primary"` on every brand CTA; use `color="inherit"` only when you deliberately want a neutral/grey button.

**Dark editorial CTA (sanctioned exception).** Onboarding and similar full-bleed editorial moments may use a dark CTA: explicit `bgcolor: 'text.primary'` + `color: 'background.paper'` + warm black shadow (see `primaryCtaSx` in `src/sections/onboarding/onboarding-wizard.js`). The tell that it's intentional is the explicit `bgcolor` — a contained button that's dark only because it *omitted* `color` is a bug, not this pattern. Don't mix dark CTAs and terracotta CTAs on the same screen.

**Never make every button primary.** One contained per screen maximum.

### Cards

Standard card style:

```js
sx={{
  borderRadius: 2,           // 32px
  boxShadow: theme.customShadows.card,
  bgcolor: 'background.paper',
  overflow: 'hidden',
}}
```

For list tiles with press feedback:
```js
sx={{
  borderRadius: 2,
  transition: 'border-color 0.2s, transform 0.15s',
  '&:active': { transform: 'scale(0.98)' },
}}
```

**No nested cards.** If you need layering, use a surface tint (`background.neutral`) or a border, not a card inside a card.

### Settings Rows

Consistent pattern used throughout Settings hub:

- White card (`background.paper`), `borderRadius: 2`
- Left: icon in `primary.lighter` circle (40×40), `borderRadius: '50%'`, icon color `primary.main`
- Center: bold label + `text.secondary` description
- Right: `chevronRight` icon in `grey[400]`
- Full-width touchable row, `minHeight: 64px`

### Filter Chips / Pill Buttons

Pill shape via `borderRadius: 10` (160px effective). Used for:
- Discover filters (Cuisine, Dishes, Vibe, etc.)
- Map view filters (Following, Saved, More…)
- Toggle tabs (Momentum / Trending, All / My own / Following)

Active chip: `bgcolor = primary.main`, `color = primary.contrastText`  
Inactive chip: `bgcolor = background.paper` or transparent with border, `color = text.secondary`

### Rating Badge

Overlaid on restaurant imagery:
```js
sx={{
  display: 'inline-flex', alignItems: 'center', gap: 0.5,
  px: 1.25, py: 0.5, borderRadius: 10,
  bgcolor: alpha(common.black, 0.45),
  color: 'common.white', fontWeight: 600,
  border: `1px solid ${alpha(common.white, 0.12)}`,
}}
```
Star icon: `warning.main` (gold/amber).

### Bottom Navigation (Mobile)

Four tabs: Discover · Map · Lists · Profile  
Active state: icon + label in `primary.main`. Inactive: `text.secondary` / `grey[500]`.  
Notification dot: small `primary.main` circle overlay on icon.

### Page Headers (Dashboard Drill Screens)

Consistent across Lists, Settings, Edit Profile, Roulette:
- Left: back chevron (grey circle button)
- Centre: bold title (`typography.h6` or similar, `fontWeight: 700`)
- Right (optional): text-variant action ("Save", "+")

### Loading States

**Use `react-loading-skeleton` + `SkeletonTheme`**. Not MUI's `Skeleton`. This is the established pattern across the entire app.

`SkeletonTheme` colors are computed from the current MUI theme mode:
```js
const isDark = theme.palette.mode === 'dark';
{
  baseColor: isDark ? alpha(common.white, 0.09) : alpha(common.black, 0.07),
  highlightColor: isDark ? alpha(common.white, 0.18) : alpha(common.black, 0.12),
}
```

Border radius for skeletons: pass raw px in `style` prop (not sx), e.g. `style={{ borderRadius: 16 }}` to match card radius, `style={{ borderRadius: 8 }}` for inline chips.

### Empty States

Empty states should **teach the interface**, not just announce absence.  
- Icon: relevant Iconify icon via `ic` object, muted (`text.disabled` or `grey[400]`)
- Heading: concise ("No lists yet")
- Body: one sentence explaining what this section does and how to populate it
- CTA: contained primary if the user can take action from here

Do not use generic "nothing here" illustrations. Keep it warm and direct.

---

## 8. Icons

Source of truth: `src/assets/icons/iconify.js` → imported via `import { ic } from 'src/assets/icons'`

All icons in the product are Iconify icons accessed via the `ic` object. **Never import icon strings inline.** Add new icons to the `ic` object and reference them as `ic.myIcon`.

Country flag icons: `circleFlagIcon(countryCode)` — dynamic, not in `ic`.

Iconify component: `import Iconify from 'src/components/iconify'`

Common icon sizes: `width={16}` (inline), `width={20}` (standard), `width={24}` (nav/header).

Icon tinting in settings rows: explicitly set `sx={{ color: 'primary.main' }}` on the Iconify component inside the circle background.

---

## 9. Motion

### Principles

- Motion explains state changes (entrance, exit, feedback). It is not decoration.
- Use `prefers-reduced-motion`: wrap optional transitions in `@media (prefers-reduced-motion: no-preference)` or check via the hook.
- Prefer `transform` and `opacity` — never animate `width`, `height`, `padding`, or `margin`.
  - Narrow exception: sub-16px indicator dots (e.g. carousel pagination pills) may animate `width` — `scaleX` would distort their pill radius, and layout cost at that size is negligible. Anything larger uses `transform`.

### Common Values

| Duration | Use |
|---|---|
| `0.08s` | Micro: map pin opacity |
| `0.15s` | Fast: press transform (`scale(0.98)`) |
| `0.2s` | Standard: hover states, color transitions |
| `0.4s` | Progress bar fill |
| `0.65s–0.7s` | Entrance animations, image parallax |

Easing: `ease` or `ease-out` for most transitions. `ease-out` for entrances (decelerate in). Avoid elastic/bounce — they feel dated.

### Interaction Feedback

Cards and touchable rows get subtle press feedback:
```js
transition: 'transform 0.15s',
'&:active': { transform: 'scale(0.98)' },
```

Hovered elevated cards:
```js
transition: 'box-shadow 0.2s',
'&:hover': { boxShadow: theme.customShadows.z12 },
```

---

## 10. Layout Patterns

### Dashboard Shell

- **Desktop**: Left sidebar (fixed, ~280px) + main content scroll area
- **Mobile**: Full-width content + fixed bottom nav (4 tabs)
- Safe areas respected via Capacitor/CSS env() for iOS

### Content Max-width

Long-form body copy: `maxWidth: '65ch'` or `maxWidth: 680`  
Dashboard content area: no fixed max-width (responsive to sidebar)  
Marketing pages: content column `maxWidth: 'lg'` (1200px), centred

### Grid

List tiles: 2-column grid on mobile (`repeat(2, 1fr)`), expanding on desktop.  
Discover feed: single column list (full-width feed cards).  
Settings: single column list of rows.

### Spacing Rhythm

Sections within a page: `gap: 3` (24px) between groups  
Within a card: `p: 2` (16px) default inner padding, `p: 2.5` (20px) for larger cards  
Page-level vertical padding: `py: 3` (24px) top, `pb: 10` to clear fixed bottom nav

---

## 11. Writing (Microcopy)

- **Nom Nom language**: Use "spots" not "restaurants/venues/places" in UI copy. Use "Nom Nom" phrasing for branded moments (lists = "Nom Nom lists", roulette = "Nom Nom Roulette").
- **Avoid corporate**: Never "establishments", "locations", "entities". Keep it human-sized.
- **Action labels**: Start with verbs — "Save to a list", "Shake it up", "Change area", "Add a spot".
- **Empty states**: Teach, don't lament. "Create a list to group your favourite spots." not "You have no lists."
- **Errors**: Be direct and helpful. Never "An error occurred." Say what happened and what to try.
- **Section labels**: Use `overline` variant ALL CAPS for section headings (e.g., "ACCOUNT", "HELP & FEEDBACK"). Keep them short.
- **Buttons**: Sentence case, no forced caps (the theme unsets textTransform). Exception: overline labels.

---

## 12. Anti-patterns

These patterns are explicitly banned. If you find yourself writing any of these, stop and redesign the element:

| Anti-pattern | Why | Fix |
|---|---|---|
| `border-left: Npx solid color` (N > 1) on cards/rows | Overused AI-slop tell; never looks intentional | Use full border, background tint, or bold leading icon |
| Gradient text (`background-clip: text`) | Decorative crutch; AI tell | Solid color. Use weight or size for emphasis |
| Hardcoded hex colors in component files | Bypasses theme; breaks dark mode | Always use `theme.palette.*` tokens |
| `const COLOR = '#hex'` local constants | Same as above | Remove; use `theme.palette.*` inline |
| Card inside card nesting | Visual noise, confusing depth | Flatten; use surface tint or divider |
| Glassmorphism everywhere | Decorative, not purposeful | Use actual surfaces; blur only for scrim/overlay use cases |
| `Modal` for confirmations | Lazy; breaks flow | Use bottom sheet, inline confirmation, or snackbar |
| Generic "nothing here" empty states | Teaches nothing | Explain what the section does + how to fill it |
| All buttons `contained` | Destroys hierarchy | One contained CTA per screen max |
| Modifying `PRIMARY` outside theme | Bypasses theming | `theme.palette.primary.main` always |

---

## 13. Forms

Forms across NomNom use MUI inputs (`TextField`, `Select`, `Switch`, `Checkbox`, `Radio`) styled in `src/theme/overrides/components/`. Don't roll custom input components — extend the MUI ones via theme overrides if a pattern recurs.

### TextField

- Outlined variant is the default. Filled is reserved for inline search bars on neutral backgrounds.
- Radius: `RADIUS.base` (16px). Borders use `grey[300]` resting, `primary.main` focused.
- Helper text uses `body2` color `text.secondary`; error helper uses `error.main` — never both colored *and* iconned, pick one.
- Labels are `caption` weight 600 floated above the input on focus/fill. Don't disable the float — it's how the form rhythm survives long labels.
- Required indicator: trailing `*` in `primary.main`, no parentheses.

### Switch / Checkbox / Radio

- `Switch`: terracotta thumb when checked. Track uses `grey[400]` off / `primary.light` on. Don't use `success.main` for the on-state — it reads as a save indicator.
- `Checkbox` / `Radio`: `primary.main` checked, `grey[500]` unchecked. Hit target is the full row in settings rows, not just the control.
- All three: `disabled` halves opacity, never grays out the label color directly.

### Form layout

- Field gap: `SPACE.md` (16px) vertically between fields, `SPACE.lg` (24px) between field groups.
- Inline two-up fields on `sm+` (e.g., First / Last name). Stack on `xs`.
- Submit button is one contained primary at the bottom, full-width on mobile, right-aligned on desktop.
- Inline validation fires on blur, not on every keystroke. Submit-time validation reveals all errors at once and scrolls to the first.

### Error states

- Field-level: red border + helper text. Don't add an error icon inside the field — it fights the input's own icons.
- Form-level (server error from Supabase): banner above the form using `error.lighter` background + `error.darker` text, dismissable. Direct copy ("That email is already in use") — never generic ("An error occurred").

---

## 14. Bottom Sheets

NomNom uses bottom sheets aggressively for mobile confirmations, deletions, share menus, and the PWA install prompt — they're the mobile-native alternative to modal dialogs.

Source of truth: `src/components/sheet-shell/` — `mobileBottomSheetDrawerPaperSx`, `mobileBottomSheetDialogPaperSx`, `mobileBottomSheetTopCorners`, `SwipeDismissBottomSheetContent`.

### Shell pattern

- **MUI `Drawer` anchor="bottom"** for sheets that the user can swipe down to dismiss. Apply `mobileBottomSheetDrawerPaperSx` to `PaperProps.sx`. Critical: this keeps `Paper` transparent so `SwipeDismissBottomSheetContent` owns the visible card — when pulled down, the transform moves the whole surface and you don't see an empty white strip.
- **MUI `Dialog`** with `mobileBottomSheetDialogPaperSx` for slide-up sheets that don't need swipe dismissal (e.g., confirmations).
- Top corners follow `mobileBottomSheetTopCorners`: `16px` on `xs`, `2.5rem` on `sm+`. This matches the map bottom-glass shell so sheets don't read as more pill-shaped than the map edge.

### Anatomy

- **Drag handle**: ~36×4px pill in `grey[300]`, centered, 8px from the top. Indicates "this can be pulled".
- **Header**: `h6` title, optional close button on the right.
- **Body**: padding `SPACE.lg` (24px) on `xs`, `SPACE.xl` (32px) on `sm+`. Max-height `min(92dvh, calc(100dvh - env(safe-area-inset-top, 0px)))`.
- **Actions footer**: stacked on `xs` (full-width buttons), inline on `sm+`. Always include safe-area padding: `pb: 'max(4px, env(safe-area-inset-bottom, 0px))'`.

### When NOT to use a bottom sheet

- Don't use for trivial confirmations ("Saved!"). Use a Snackbar.
- Don't use for destructive actions that need a hard pause — use a centered `Dialog` so the user can't dismiss by accident.
- Don't nest a bottom sheet inside a Drawer.

---

## 15. Image Treatment

Restaurant photography is the largest visual surface in the product — it deserves its own rules.

### Aspect ratios

- **Feed / Discover cards**: 4:3. Crops focus on the dish, not the room.
- **Restaurant detail hero**: 16:9 on desktop, 4:3 on mobile. Always edge-to-edge horizontally.
- **List cover (Nom Nom list)**: 1:1 square. Collage layout of 1, 2, or 4 dish images depending on list size.
- **Avatar (creator)**: 1:1 square cropped to circle via `borderRadius: RADIUS.pill`.
- **Map pin preview**: 3:2.

### Treatment

- **Border radius**: `borderRadius: 2` (32px) on card-embedded images. Edge-to-edge images (hero) get no radius on the touching edge.
- **Overflow**: always `overflow: 'hidden'` on the image container so the radius clips correctly.
- **Loading**: use `next/image` with `placeholder="blur"` where a blurDataURL is available, otherwise a `react-loading-skeleton` block at the same aspect ratio.
- **Fallback** (missing/broken image): `marketing.parchment` background + centered Iconify food icon at `grey[400]`. Never a broken-image icon, never stock generic-food art.

### Rating-badge overlay

When a rating sits on a restaurant photo, use the §7 Rating Badge pattern — placed bottom-left, `16px` inset, `alpha(common.black, 0.45)` scrim, white text. Top-right is reserved for the save/bookmark control.

### Don't

- Don't apply a gradient overlay just to "soften" the image. Use a real scrim only where text sits on the image.
- Don't desaturate or color-grade images globally — creators upload what they upload, and the warmth comes from the chrome around the photo, not filters on it.
- Don't use box-shadows on images. The card carries the elevation, the image sits inside.

---

## 16. Dark Mode Posture

Dark mode is supported but **light is the brand hero**. Treat dark mode as a respected secondary mode, not a parity feature.

### What's hero in light

- Marketing pages (homepage, landing, About) — light only. Don't redesign these for dark; the parchment + serif treatment is the brand.
- Onboarding and first-run — light only. New users see the warm posture first.
- Image-heavy flows (Discover feed, restaurant detail) — light is preferred because terracotta + parchment frames food photography better than near-black.

### What works in dark

- Dashboard chrome (settings, lists, profile) — full dark support.
- Map view — dark map style is genuinely useful at night.
- Reading-heavy screens (notes, descriptions) — dark is comfortable.

### Dark mode rules

- **Surfaces**: `background.default = grey[900]` (`#15130f` — warm near-black, not slate), `background.paper = grey[800]`. Marketing surface tokens are shared between modes — don't fork them.
- **Terracotta in dark**: `primary.main` stays `#FF6B35`. It pops against the warm dark surface. Don't shift to `primary.light` or warm it further — over-saturation reads as alarm.
- **Shadows**: `customShadows` automatically use `common.black` as the base in dark mode and dial up opacity (`z24` goes 0.18 → 0.35). Use the same tokens — don't write dark-mode-specific shadow values.
- **Borders over shadows**: in dark, borders carry more of the elevation signal than shadows. The `card.border` and `paper.border` tokens (alpha grey[600]) are the workhorses.
- **Semantic colors**: same hex values in both modes. Don't desaturate semantics in dark — users need state signals to read consistently.

### Don't

- Don't redesign components for dark mode. If a component looks wrong in dark, fix the token, not the component.
- Don't add a "midnight" or "OLED black" mode. The warm near-black is the brand's dark mode.

---

## 17. Localisation Typography

NomNom ships in `en` and `pt`. Portuguese has its own typographic implications.

### Length

- Portuguese strings are typically **15–25% longer** than English (e.g., "Save" → "Guardar", "Add to list" → "Adicionar à lista").
- Test all button labels, navigation tabs, and section overlines in both locales — overlines especially are tight on width.
- Don't fix length issues by shrinking the font. Either rewrite the copy, allow wrap, or expand the container.

### Accents and diacritics

- Portuguese uses `ã`, `õ`, `ç`, `á`, `é`, `í`, `ó`, `ú`, `â`, `ê`, `ô`, `à`. Albert Sans renders all of these well at all weights.
- Heading line-heights are tuned for English (1.2 at h1) and stay safe for Portuguese because Albert Sans's accent marks fit within the ascender height. Don't increase line-height "for accents" — it makes English heroes look loose.
- Libre Baskerville's italic forms are wider in Portuguese; avoid italic in marketing display where the line is already long.

### Sentence rhythm

- Portuguese prefers fewer, longer sentences. Body copy may need a slightly tighter line-length cap (60ch instead of 65–75ch) so longer sentences don't sprawl across the column.
- Don't translate microcopy literally. "Shake it up" is "Vamos sortear" or similar — preserve the *energy*, not the words. The "Nom Nom" voice (§11) applies to both locales.

### Tabular numbers

- `tabularNumsSx` works identically in both locales. Portuguese uses comma as decimal separator (`4,5`) where English uses period (`4.5`) — make sure you're formatting via `Intl.NumberFormat(locale)`, not hard-coding.

---

## 18. Localisation

Locales: `en` and `pt` (Portuguese). All user-visible strings must exist in both `src/locales/langs/en.json` and `pt.json`.

Key translation namespaces:
- `pages.dashboard.*` — all dashboard screens
- `pages.dashboard.settings.*` — settings hub and sub-pages
- `pages.coming_soon.*` — coming soon page
- `pages.blank.*` — blank placeholder

Missing keys silently fall back to the key string — always add both locales when adding copy.

---

## 19. Accessibility

- **Minimum touch target**: 44×44px for interactive elements (buttons, nav items, list rows)
- **WCAG AA contrast** for all body text; primary `#FF6B35` on white meets AA for large text only — do not use it as small body text colour
- **Focus styles**: MUI default focus ring inherits `primary.main` at `0.24` opacity — do not remove
- **`prefers-reduced-motion`**: All non-essential animations must respect this preference
- **Screen reader labels**: Iconify icons used as standalone buttons need `aria-label` on the wrapping `IconButton`
- **Bottom nav**: All four tabs always present and reachable; do not hide tabs on any viewport

---

## 20. Tech Context

| Concern | Detail |
|---|---|
| Framework | Next.js 16, App Router, React 19 |
| UI library | MUI v7 (`sx` prop, theme tokens, component overrides) |
| Database | Supabase (Postgres + PostGIS, RLS, RPCs) |
| Auth | Supabase Auth → Server Actions (`'use server'`) |
| Map | Mapbox GL JS |
| Mobile | Capacitor v8 (iOS) — safe areas, touch targets critical |
| Skeleton | `react-loading-skeleton` + `SkeletonTheme` (NOT MUI Skeleton) |
| Icons | Iconify via `ic` object in `src/assets/icons` |
| Animation | CSS transitions + MUI sx — no animation library |
| i18n | `react-i18next`, `en` + `pt` locales |

---

## Decisions Log

| Date | Change | Why |
|---|---|---|
| 2026-06-07 | Typography section reconciled with `src/theme/typography.js` | Documented line-heights had drifted from code (h1 1.5→1.2, h2 1.5→1.25, h3 1.5→1.3, h4 1.5→1.4, body1 1.5→1.6). Added negative letter-spacing on h1–h4 (`-0.02em` → `-0.005em`), overline tracking (`0.08em`), and the `fontWeightSemiBold: 600` token. Doc now matches code. |
| 2026-06-07 | Fixed false CSS-vars claim | `--font-sans` / `--font-serif` / `--font-mono` are NOT exposed globally. Fonts are consumed via `theme.typography.*` (set by `next/font/google`). Updated §3 Font Stack to make this explicit. |
| 2026-06-07 | Added missing `marketing.shadowWarm` and `marketing.outlineMuted` tokens | Both exist in `src/theme/palette.js` but weren't documented. Added to §2 Marketing / Editorial Surfaces table. |
| 2026-06-07 | Documented cool-slate `secondary` palette as intentional | `secondary` (`#E2E8F0` slate) is cool by design — it gives MUI's default `color="secondary"` a neutral fallback without fighting terracotta. Added a rule that `secondary` is NOT for brand surfaces. |
| 2026-06-07 | Locked semantic palette as Tailwind-standard, not warmed | Decision: semantic colors (`success`, `warning`, `error`, `info`) read as state signals first and stay cool. Warm-brand color is terracotta only. For semantic surfaces on parchment, use `alpha(success.main, 0.12)` background not warmed semantics. |
| 2026-06-07 | Rewrote §4 Shape and §5 Spacing to lead with `RADIUS` and `SPACE` named tokens | `src/theme/spacing.js` exports `SPACE`, `STEP_RHYTHM`, `RADIUS`, `HEADER_GAP_SX`, `TOUCH_TARGET_SIZE`, `touchTargetSx` — none were documented. Doc previously described raw `spacing(N)` and `borderRadius: N` MUI multipliers; now leads with semantic tokens and keeps the multiplier reference as secondary. Also reconciled the gap that card uses `borderRadius: 2` (32px) which is bigger than `RADIUS.loose` (24px) — intentional. |
| 2026-06-07 | Documented missing shadow tokens | Added `z20`, `secondary`, `info`, `success`, `warning`, `error` color-tinted shadows to §6, plus rule that only `primary` contained buttons receive a colored shadow automatically. |
| 2026-06-07 | Added §13 Forms | TextField/Switch/Checkbox/Radio rules, form layout, error states. Switch on-state stays terracotta — never `success.main` (reads as save indicator). |
| 2026-06-07 | Added §14 Bottom Sheets | Documented `mobileBottomSheetDrawerPaperSx`, `mobileBottomSheetDialogPaperSx`, `mobileBottomSheetTopCorners`, and `SwipeDismissBottomSheetContent` from `src/components/sheet-shell/`. Locked the rule that `Paper` stays transparent so the swipe-dismiss content owns the visible card. |
| 2026-06-07 | Added §15 Image Treatment | Aspect ratios by surface (feed 4:3, hero 16:9/4:3, list cover 1:1, avatar 1:1, map pin 3:2). Rating-badge bottom-left, save top-right. No gradient overlays, no global color grading. |
| 2026-06-07 | Added §16 Dark Mode Posture | Made the "light is the brand hero" rule explicit. Marketing + onboarding + image-heavy flows stay light. Dashboard + map + reading flows support dark. Borders carry elevation in dark; semantics keep same hex values both modes. |
| 2026-06-07 | Added §17 Localisation Typography | Portuguese ~15–25% longer than English; don't shrink fonts to compensate. Heading line-heights stay tuned for English (Albert Sans accents fit). Tighter line-length cap (60ch) for `pt` body copy. Format numbers via `Intl.NumberFormat(locale)`. |
| 2026-06-07 | Renumbered Accessibility → §19, Tech Context → §20 | Knock-on from inserting §13–§17. Old Localisation became §18. |
| 2026-07-02 | §7 Buttons: explicit-`color` contract + dark editorial CTA exception | Brand audit found 17 contained CTAs rendering near-black because the theme defaults `MuiButton` to `color="inherit"` (fixed in FINDING-001). Rule added: every `variant="contained"` declares `color` explicitly. Onboarding's dark CTA (`primaryCtaSx`, explicit `bgcolor: 'text.primary'`) codified as the sanctioned dark-editorial exception. |
| 2026-07-02 | Documented `Z_INDEX.searchTypeahead` (1300) | Token existed in `src/theme/spacing.js` but was missing from the §3 stacking table and COMPONENTS.md. |
| 2026-07-02 | Serif weight cap enforced in restaurant detail | Restaurant title used `fontWeight: 800` on Libre Baskerville (ships 400/700 only → fake-bold). Fixed to 700 (FINDING-002). Rule already existed in §3; re-affirmed: serif weights are 400/700, nothing else. |
| 2026-07-03 | Added `customShadows.chipGlow` token | The selected-chip glow (`0 4px 14px -4px primary @ 0.45`) was duplicated verbatim in 4 places (scrollable-chip-select ×3, home-hero-showcase). Extracted to a token (FINDING-006). |
| 2026-07-03 | §5 row rhythm sub-scale documented | `py: 1.75` (14px) and `py: 2.25` (18px) are used consistently across settings/list rows and their skeletons — a de-facto rhythm the SPACE scale doesn't capture. Documented as sanctioned (like §3's compact labels) instead of churning 25+ files to 12/16px without visual verification. |
| 2026-07-03 | §9 indicator-dot width-animation exception | Carousel pagination dots animate `width` 4→10px; `scaleX` would distort the pill radius. Codified as the one sanctioned layout-property animation (sub-16px indicators only). |
| 2026-07-03 | Ratings localised via `fRating` (FINDING-007) | Rating displays hardcoded `.toFixed(1)` — pt users saw `4.5` instead of `4,5`, violating §17. New `fRating(value, currentLang, { trimTrailingZero })` in `src/utils/format-number.js`; UI surfaces wired to it. SEO-only pages stay en-formatted. |
| 2026-07-03 | `autoFocus` guarded on Capacitor (FINDING-008) | Bare `autoFocus` pops the iOS keyboard and shifts sheets. Standard: `autoFocus={!isCapacitorNative()}` on every autofocused field. |
