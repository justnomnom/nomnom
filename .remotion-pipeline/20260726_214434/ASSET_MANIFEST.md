# Asset Manifest: RestaurantSpotlight

## Status Overview
- 🟢 Ready: logo, icons, remote dish photo, fonts
- 🔴 Not started: background music, SFX

**Progress:** 4/6 asset groups ready for silent render

## Required Assets

### Images

#### 1. NomNom logo circle
- **Status:** 🟢 Ready
- **Path:** `remotion/public/logo_circle.png`
- **Usage:** `staticFile('logo_circle.png')` in Scene2Intro

#### 2. Dish hero photo
- **Status:** 🟢 Ready (remote)
- **Source:** Supabase `restaurant_images` URL in default props
- **Local optional:** `remotion/public/images/restaurant/hero.jpg`
- **Import:** remote URL on `review.photo` or `staticFile('images/restaurant/hero.jpg')`

#### 3. Vibe / dish icons
- **Status:** 🟢 Ready
- **Path:** `remotion/public/icons/{sparkles,hot-beverage,fork-and-knife}.svg`

### Fonts
- **Status:** 🟢 Ready via `@remotion/google-fonts` in `theme.js`
  - Albert Sans, Libre Baskerville, JetBrains Mono

### Audio

#### 4. Background music
- **Status:** 🔴 Not Started
- **Suggested path:** `remotion/public/audio/music/restaurant-warm.mp3`
- **Spec:** ~15s (or loopable), warm acoustic/indie, ~95–105 BPM, no vocals preferred
- **Sources:** Epidemic Sound, Artlist, Pixabay Music (check license)
- **Wire:** `<Audio src={staticFile('audio/music/restaurant-warm.mp3')} volume={0.45} />` in `index.jsx`

#### 5. SFX (whoosh / pop / chime)
- **Status:** 🔴 Not Started
- **Suggested paths:**
  - `remotion/public/audio/sfx/whoosh-soft.mp3`
  - `remotion/public/audio/sfx/pop-soft.mp3`
  - `remotion/public/audio/sfx/chime-soft.mp3`
- **Sources:** Freesound, Pixabay (normalize −6 LUFS peak-safe)

## Preparation Checklist
- [x] Logo present
- [x] Icons present
- [x] Dish photo URL in props
- [ ] Add music track
- [ ] Add SFX + Sequence timing
- [ ] Optional: download dish photo locally for offline renders
