# VIDEO_SPEC — NomNom Restaurant Showcase Reel

**Composition ID:** `RestaurantReviewsReel`  
**Project:** `remotion/` (existing NomNom Remotion package)  
**Showcase subject:** Volta dos Sabores · Lisboa  
**Date:** 26 July 2026  
**Pipeline:** create-video-start → motion-designer

---

## 1. Overview

| Field | Value |
|-------|-------|
| **Title** | Restaurant Reviews Reel — Volta dos Sabores |
| **Duration** | ~31.7s with 3 reviews (dynamic via `buildTimeline`) |
| **Dimensions** | 1080 × 1920 (9:16 Reels / TikTok / Stories) |
| **Frame Rate** | 30 fps |
| **Style** | Warm parchment + terracotta; human social proof, not critic gloss |
| **Mood** | Relief + belonging — “spots people you trust” (Everyperson + Jester splash) |
| **Target platforms** | Instagram Reels, TikTok, WhatsApp status |

**Narrative arc**

```
Hook (0–2.6s)  → Pattern interrupt: locals won’t stop talking about this spot
Intro (2.6–5.8s) → Brand card: logo, name, tagline, cuisine chips
Consensus (5.8–10.6s) → Aggregate verdict: rating, loves, dishes
Reviews (10.6–24.4s) → 3× trusted voices with dish tile + quote reveal
Map (24.4–28.1s) → Pin drop on real Mapbox streets + address
CTA (28.1–31.7s) → Terracotta close: “Don’t take our word.” → Save this spot
```

---

## 2. Color palette (NomNom design system)

| Token | Hex | Use |
|-------|-----|-----|
| `bg` / paper | `#faf9f5` / `#fdfcfa` | Scene backgrounds |
| `ink` | `#15130f` | Primary text |
| `ink2` | `#6e6657` | Secondary text |
| `terra` | `#FF6B35` | CTA, pin, accents (~10% of surface) |
| `terraLight` | `#FFE8DF` | Avatar / chip tints |
| `gold` | `#F59E0B` | Star ratings |
| `green` | `#10B981` | Positive / check accents |

**Typography:** Albert Sans (UI) · Libre Baskerville (display, 400/700 only) · JetBrains Mono (`@handles`)

---

## 3. Audio strategy

| Layer | Spec | Status |
|-------|------|--------|
| Background music | Warm indie / acoustic café, low energy, 40–50% volume; soft swell into CTA | Optional — not bundled (add later) |
| SFX — hook | Soft whoosh / paper slide @ 0.0s | Optional |
| SFX — review word reveal | Subtle tick / soft pop per word cluster | Optional |
| SFX — map pin | Soft drop @ map scene start +0.4s | Optional |
| Voiceover | None (text-led social native) | N/A |

Volume envelope: music beds under text; duck 20% during dense quote frames if VO added later.

---

## 4. Scene breakdown

### Scene 1: Hook (0.0s – 2.6s · 78 frames)

**Visual:** Near-black / deep parchment interrupt. Overline `Lisboa · right now`. Stacked display lines: “Locals / won’t stop / talking about / this spot.”

**Animation:**
- Overline fades in frames 0–12
- Lines stagger up + fade (easeOutCubic), ~8–10 frames apart
- Soft scale 1.02 → 1.0 on last line
- Exit: fade/slide envelope 0.4s out

**Purpose:** Pattern interrupt before brand chrome.

---

### Scene 2: Intro (2.6s – 5.8s · 96 frames)

**Visual:** Brand card — NomNom circle logo, restaurant name (`Volta dos` / `Sabores`), tagline, category chips (Romantic · Casual · Coffee).

**Animation:**
- Card rises with easeOutBack (spring feel)
- Chips stagger left→right
- Logo subtle settle

**Purpose:** Name lock + category context.

---

### Scene 3: Consensus / Aggregate (5.8s – 10.6s · 144 frames)

**Visual:** Detail-page style aggregate — rating count-up (4.8), review count, “loves” bullets, dish mention list (Portuguese Food, Octopus, Chorizo…).

**Animation:**
- Rating numerals count up
- Loves / dishes list stagger in
- Empty “things to know” section stays hidden (data honesty)

**Purpose:** Social consensus before individual voices.

---

### Scenes 4–6: Review ×3 (each 4.6s · 138 frames)

**Visual per review:** Dish photo/emoji tile + review card (initials, name, optional Circle badge, score /5, word-by-word quote).

| # | Reviewer | Dish cue |
|---|----------|----------|
| 1 | Thomas Fowler | Portuguese Food |
| 2 | Charlotte Bae | Octopus |
| 3 | Juan Coronado | Chorizo |

**Animation:**
- Tile + card enter with scene envelope (0.42s in)
- Quote words fade in sequentially (frame-driven, not CSS transition)
- Exit 0.4s out into next review

**Purpose:** Named human proof — NomNom’s bet vs star-only directories.

---

### Scene 7: Map (24.4s – 28.1s · 111 frames)

**Visual:** Mapbox `streets-v12` static map (`public/maps/volta-dos-sabores.png`), terracotta pin + white ring + shadow, address card `R. da Barroca 106…`, pill “Loved by the NomNom community”.

**Animation:**
- Map fade + slight zoom
- Pin drop with overshoot (easeOutBack)
- Address card slides up

**Purpose:** Visitability — clip → door.

---

### Scene 8: CTA (28.1s – 31.7s · 108 frames)

**Visual:** Full terracotta card. Display: “Don’t take / our word.” Sub: “Take theirs…” Button: “Save this spot”. Footer: `Join the Nom Nom Circle · nomnom.app`

**Animation:**
- Headline stagger
- Button scale settle
- Hold for end-frame screenshot / loop cut

**Purpose:** Soft CTA — no FOMO urgency (brand rule).

---

## 5. Transitions

All scenes use the design `seg()` envelope: **0.42s fade/slide in**, **0.4s out**. No hard cuts. No hero overlays / floating badges on food photos beyond in-card UI.

---

## 6. Props source of truth

| Source | Path |
|--------|------|
| Live showcase props | `remotion/props/volta-dos-sabores.json` |
| Map asset | `remotion/public/maps/volta-dos-sabores.png` |
| Composition | `remotion/src/RestaurantReviewsReel.jsx` |
| Timeline | `remotion/src/timeline.js` |
| Tokens | `remotion/src/theme.js` |

Regenerate from DB when the name resolves:

```bash
cd remotion && npm run fetch -- --id <uuid> --reviews 3
```

---

## 7. Brand / anti-pattern checks

- ✅ Named humans + quotes (not anonymous stars)
- ✅ Real Lisbon neighbourhood address (Bairro Alto / Barroca)
- ✅ Terracotta discipline; parchment atmosphere
- ❌ No “locals eat here” badge without proof criterion
- ❌ No FOMO urgency / exclusivity flex
- ❌ No tourist-postcard Baixa gloss as the hero idea
