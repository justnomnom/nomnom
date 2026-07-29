# Restaurant Spotlight — Volta dos Sabores

## Overview

- **Title**: Restaurant Spotlight (NomNom)
- **Duration**: 15 seconds
- **Dimensions**: 1080×1920 (9:16 vertical)
- **Frame Rate**: 30 fps
- **Total Frames**: 450
- **Style**: Warm parchment editorial; social-proof food reel (not luxury critic gloss)
- **Mood**: Friendly confidence — relief that the table is decided; light delight
- **Target Audience**: Lisboa 24–34 (Inês persona) — Instagram Reels / TikTok
- **Product**: NomNom — discover restaurants through people you trust
- **Featured restaurant**: Volta dos Sabores, Lisboa

## Color Palette

```
Primary / Terra: #FF6B35 — brand accent, CTA, emphasis lines
Background:      #faf9f5 — marketing.paper
Paper:           #fdfcfa — cards / surfaces
Parchment:       #f5f4ed — soft fills
Ink:             #15130f — headlines
Ink secondary:   #6e6657 — taglines
Gold:            #F59E0B — star ratings
Hairline:        #d1cfc5 — borders
```

## Typography

- **Headline (display)**: Libre Baskerville, 700, 72–96px — restaurant name / hook lines
- **UI / labels**: Albert Sans, 700–800, 22–28px — overlines, chips, CTA
- **Body / quote**: Albert Sans, 500–600, 28–34px — review excerpt
- **Mono (optional)**: JetBrains Mono — handles / counts if shown

## Audio Strategy

### Background Music
- **Style/Genre**: Warm acoustic / soft indie pop (no hard EDM)
- **BPM**: ~95–105
- **Mood**: Inviting, evening-out energy (medium-low)
- **Energy Level**: Medium
- **Volume**: 45% base; duck to ~25% on SFX
- **Key Sync Points**:
  - 0s: Soft swell under hook
  - 3s: Downbeat with restaurant name
  - 7s: Light lift under review card
  - 12s: Hold under CTA; fade from 13.5s

### Sound Effects

| Time | SFX Type | Description | Volume | Purpose |
|------|----------|-------------|--------|---------|
| 0.2s | Soft whoosh | Warm entrance | 55% | Hook lines land |
| 3.1s | Soft pop | Logo settle | 50% | Intro brand mark |
| 7.0s | Paper / soft click | Card reveal | 45% | Review card in |
| 12.0s | Soft chime | CTA emphasis | 55% | Button attention |

### Ambient Texture (Optional)
- **Type**: Distant café murmur (very light)
- **Volume**: 15%
- **Duration**: Scenes 2–3 only

---

## Scene Breakdown

### Scene 1: Hook (0s – 3s, Duration: 3s)

**Purpose**: Grab attention — local social proof without FOMO urgency.

**Visual Description**:
- Full-bleed dark ink background `#15130f` with soft terra radial glow at top-center
- Overline: `LISBOA · RIGHT NOW` in terra, uppercase, tracked
- Stacked serif lines: `Locals` / `won't stop` / `talking about` / `this spot.` (last line terra)
- No cards, no floating badges on media

**Animation Details**:
- Overline fades 0–12f
- Each hook line springs in with stagger (~4f), easeOutBack scale 0.9→1, Y +44→0
- Scene fade-out last 12f with slight upward slide (−22px)

**Timing** (local frames @ 30fps):
- Frame 0–12: overline
- Frame 8–55: line stagger
- Frame 78–90: exit fade

**Audio**: Music swell; soft whoosh at 0.2s

**Transitions**: Crossfade into parchment intro (overlap ~0.35s via scene fade)

**Focus Points**: Last hook line (`this spot.`) in terra

---

### Scene 2: Restaurant Intro (3s – 7s, Duration: 4s)

**Purpose**: Name the place + vibe chips + NomNom mark.

**Visual Description**:
- Parchment background `#faf9f5`
- Centered NomNom circle logo (168px)
- Overline: `WHAT REAL DINERS ARE SAYING`
- Serif name lines: `Volta dos` / `Sabores`
- Tagline: `Romantic · Casual · Coffee · Lisboa`
- Chips: Romantic / Casual / Coffee with icons
- Optional: rating `4.8` with gold stars under tagline

**Animation Details**:
- Logo scale spring easeOutBack 0→1 over ~0.34 of scene progress
- Name + tagline fade/slide after logo
- Chips stagger in from bottom

**Timing**:
- Frame 0–25: logo
- Frame 18–60: name/tagline
- Frame 40–90: chips
- Frame 108–120: exit

**Audio**: Soft pop when logo settles (~3.1s global)

**Focus Points**: Restaurant name

---

### Scene 3: Hero Review (7s – 12s, Duration: 5s)

**Purpose**: One trusted voice + dish photo = proof.

**Visual Description**:
- Parchment bg
- Overline: `A REVIEW FROM SOMEONE YOU TRUST`
- Dish photo tile (rounded 36px) with dish label pill
- Paper card: avatar initials, name, 5 gold stars filling, word-reveal quote
- Dish label example: Portuguese Food / photo from restaurant_images

**Animation Details**:
- Dish tile scale 0.92→1 + subtle ken-burns 1→1.06
- Card slides up under tile
- Stars fill over ~0.42 of scene progress
- Quote words reveal by progress

**Audio**: Soft paper click at card in (7.0s)

**Focus Points**: Quote + stars, then dish photo

---

### Scene 4: CTA (12s – 15s, Duration: 3s)

**Purpose**: Resolve — save the spot on NomNom.

**Visual Description**:
- Warm parchment with soft terra wash
- Serif headline: `Don't take` / `our word.`
- Sub: `Take theirs. Save the spots people you trust recommend.`
- Primary button: `Save this spot` (terra fill, white type)
- Footer: `Join the Nom Nom Circle · nomnom.app`

**Animation Details**:
- Headline lines stagger in
- Button scales spring snappy 0.92→1
- Footer fades last

**Audio**: Soft chime at 12.0s; music fade from 13.5s

**Focus Points**: CTA button

---

## Technical Specifications (Remotion)

- **Composition id**: `RestaurantSpotlight`
- **Path**: `remotion/src/compositions/RestaurantSpotlight/`
- **FPS**: 30
- **Width / Height**: 1080 / 1920
- **Animation primitives**: `useCurrentFrame()`, scene envelope fade/slide, `easeOutCubic` / `easeOutBack`, springs for logo/CTA
- **Shared tokens**: `remotion/src/theme.js` (`C`, `SANS`, `SERIF`)
- **Props-driven**: restaurant name, chips, one review, CTA copy (defaults = Volta dos Sabores)

## Assets Required

### Images
- NomNom logo circle: `public/logo_circle.png` (exists)
- Dish photo: remote Supabase restaurant image OR `public/images/restaurant/hero.jpg`
- Icons: `sparkles`, `hot-beverage`, `fork-and-knife` SVGs in `public/icons/`

### Audio
- `public/audio/music/restaurant-warm.mp3` (TODO — optional for v1)
- SFX whoosh / pop / chime in `public/audio/sfx/` (TODO — optional for v1)

### Fonts
- Loaded via `@remotion/google-fonts` in `theme.js` (Albert Sans, Libre Baskerville)

## Narrative Arc

```
Hook (0–3s)     → Grab: locals talking
Build (3–7s)    → Name the restaurant
Peak (7–12s)    → Real review + plate
Resolve (12–15s)→ Save on NomNom
```
