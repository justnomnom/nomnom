# ASSET_MANIFEST — Volta dos Sabores showcase

**Skill:** remotion-asset-coordinator

## Status overview

| Status | Count |
|--------|-------|
| 🟢 Ready | 6+ |
| 🟡 Optional | 2 (music / SFX) |
| 🔴 Missing | 0 for silent render |

## Required assets

| Asset | Path | Status |
|-------|------|--------|
| NomNom logo | `public/logo_circle.png` | 🟢 |
| Cuisine / dish icons | `public/icons/*.svg` | 🟢 |
| Map static | `public/maps/volta-dos-sabores.png` | 🟢 |
| Review food photos | Supabase public URLs in props JSON | 🟢 (remote) |
| Showcase props | `props/volta-dos-sabores.json` | 🟢 |

## Optional (polish)

| Asset | Path | Notes |
|-------|------|-------|
| Bed music | `public/audio/music/cafe-warm.mp3` | ~32s, royalty-free, warm acoustic |
| Whoosh / pin SFX | `public/audio/sfx/` | Soft only — not meme whooshes |

## Regenerating map + props

```bash
cd remotion
# Prefer --id when name search is ambiguous
npm run fetch -- --id <restaurant_uuid> --reviews 3
# Writes props/<slug>.json + public/maps/<slug>.png (needs Mapbox token)
```

## Import pattern

Remote photos are passed as URL strings in props (`photo` field). Map uses `staticFile`-style path relative to `public/` via `restaurant.mapImage`.
