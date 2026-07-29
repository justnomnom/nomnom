# NomNom Remotion templates

Video templates for NomNom social content, built with [Remotion](https://remotion.dev).

## RestaurantReviewsReel

9:16 (1080×1920, 30fps) Reels-style video showcasing a restaurant through
reviews from people you trust. Ported 1:1 from the Claude Design project
"Restaurant video creation" (`design-source/reel.jsx` is the imported source
of truth).

### Scenes

| # | Scene | Duration | Purpose |
|---|-------|----------|---------|
| 1 | Hook | 2.6s | Dark pattern-interrupt: "Locals won't stop talking about this spot." |
| 2 | Intro | 3.2s | Brand card: logo, restaurant name, tagline, category chips |
| 3+ | Review (×N) | 4.6s each | Dish tile + review card with word-by-word quote reveal |
| … | Consensus | 4.8s | Detail-page style aggregate: rating count-up, loves / things to know / dishes |
| … | Map | 3.7s | Stylized map, pin drop with social proof, address card |
| … | CTA | 3.6s | Terracotta closing card: "Don't take our word." + Save this spot |

Total duration is computed from the number of reviews in props
(`calculateMetadata`), so passing 1 review reproduces the original 22.5s
design; the default 3 reviews yields 31.7s.

### Commands

```bash
npm install          # once
npm run dev          # Remotion Studio (defaults: Volta dos Sabores · Lisboa)
npm run render:volta # MP4 → out/volta-dos-sabores.mp4 (Lisbon showcase props)
npm run still:volta  # still @ frame 90 → out/volta-still.png
npm run render       # MP4 → out/restaurant-reviews-reel.mp4 (composition defaults)
npx remotion still RestaurantReviewsReel out/frame.png --frame=240
```

Video production pipeline artifacts (create-video-start):  
`.remotion-pipeline/` — see latest folder’s `PIPELINE_COMPLETE.md`.

Render with different content:

```bash
npx remotion render RestaurantReviewsReel out/my-spot.mp4 --props=./my-spot.json
```

### Generate a video from a real restaurant in the database

`scripts/fetch-restaurant-props.mjs` pulls a restaurant and its real
reviews, creator mentions, tags, dish suggestions, and photos from Supabase,
maps them into template props, and (optionally) renders the video.

```bash
# by name (must match exactly one restaurant)
npm run fetch -- --name "Casa Lupo"

# by id or external place id (unambiguous)
npm run fetch -- --id <uuid>
npm run fetch -- --place-id <external_place_id>

# choose how many review scenes, and render in one step
npm run fetch -- --id <uuid> --reviews 3 --render
```

Writes `props/<slug>.json`; render it anytime with
`npx remotion render RestaurantReviewsReel out/<slug>.mp4 --props=props/<slug>.json`.

Env: reads `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SECRET_KEY` from the repo
root `.env.local` / `.env` (same vars the app and `scripts/` use).

**Data mapping** (`restaurants`, `restaurant_reviews`, `restaurant_tags`→`tags`,
`restaurant_images`):

- Ratings are on the app's native 0–5 scale and shown as-is: an aggregate
  `restaurant.rating` (e.g. `4.8`) plus a per-review nom-meter from each
  review's `score` (five stars + `X.X / 5`).
- Review scenes are filled from real user reviews (highest-rated first), then
  Google ingest metadata when available. Rows with an empty body are skipped.
  Needs at least one usable quote or it errors out.
- Chips come from `cuisine`/`vibe` tags; the dish tile emoji is picked from
  the primary cuisine (see `EMOJI_BY_SLUG` in the script). Food photos come
  from `metadata.photos` / `restaurant_images`.
- The map scene shows a **real Mapbox static map** centered on the restaurant's
  `latitude`/`longitude`, downloaded to `public/maps/<slug>.png` at fetch time
  (needs `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`). It uses the same `mapbox/streets-v12`
  style as the in-app dashboard map
  (`src/sections/map/view/dashboard-map-canvas.js`), and the reel's terracotta
  pin + white ring + halo matches the app's selected-restaurant marker. If the
  token or coordinates are missing it falls back to the stylized map. The
  `restaurant.mapImage` prop drives which one renders.
- **Data honesty:** fields with no real source are left empty and the scene
  section hides itself — the script never invents restaurant facts. The
  "things to know" caveats and a personalized "your circle" follow graph have
  no data source, so those are omitted (the map pill reads "Loved by the
  NomNom community" instead of "Saved by your circle").

### Template props (all editable)

See `defaultProps` in `src/Root.jsx` for the full shape. Highlights:

- `restaurant` — name (`nameLines` for the intro line-break), tagline,
  location, rating, address, savedBy
- `reviews[]` — reviewer initials/name/handle, avatar tint, `follows`
  (true → "In your NomNom Circle" badge, false → handle), quote, dish,
  `emoji` (an icon in `public/icons/`), and `photo` — set to a URL or a
  file in `public/` to replace the emoji placeholder with a real food photo
- `consensus` — quote, loves, knows, dishes (label + mention count), reviewCount
- `hookOverline` / `hookLines`, `chips`, `badgeText`, `cta`

### Files

- `src/RestaurantReviewsReel.jsx` — composition + all scenes
- `src/theme.js` — NomNom design tokens (terracotta/parchment/gold), fonts
  (Albert Sans + Libre Baskerville + JetBrains Mono via `@remotion/google-fonts`),
  easings
- `src/timeline.js` — scene durations and dynamic timeline builder
- `scripts/fetch-restaurant-props.mjs` — DB → props generator (see above)
- `props/` — generated per-restaurant prop files (gitignored)
- `public/` — logo + icon SVGs (downloaded from iconify so renders are offline-deterministic)
- `design-source/` — original files imported from Claude Design (reference only, not built)

### Notes

- All motion is frame-driven (`useCurrentFrame`) — the design's CSS
  transition on the quote word-reveal was replaced with a frame-based fade.
- Scene fade/slide envelope matches the design's `seg()` helper
  (0.42s in, 0.4s out).

### Design-system sync (kept aligned with the app)

`src/theme.js` mirrors the app's design system (`DESIGN.md`, `src/theme/*`) so
the reel reads as first-party NomNom:

- **Colors** are the exact `src/theme/palette.js` values (each token is
  annotated with its app name — `terra` = `primary.main`, `bg` =
  `marketing.paper`, `ink` = `grey[900]`, etc.).
- **Fonts** match `src/theme/typography.js`: Albert Sans (UI), Libre
  Baskerville (display, 400/700 only — never fake-bold 800), and JetBrains
  Mono for `@handles` (DESIGN.md §3).
- **Shadows** use the warm near-black base (`grey[900]` → `rgba(21,19,15,…)`),
  per DESIGN.md §6 — not a cold grey.
- **Map** uses the app's `streets-v12` style and terracotta pin (see above).
- **Voice** follows §11 — "spots", "Save this spot", "the spots people you
  trust".

When the app's tokens change, update `src/theme.js` to match.
