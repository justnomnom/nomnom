# SCAFFOLD_MANIFEST — RestaurantReviewsReel

**Status:** ✅ Using existing NomNom Remotion package (no greenfield scaffold)  
**Skill:** remotion-scaffold (adapted — project already exists)

## Project root

```
remotion/
├── package.json              # nomnom-reels — scripts: dev, render, still, fetch
├── remotion.config.js
├── src/
│   ├── index.js              # registerRoot
│   ├── Root.jsx              # Composition registration + defaultProps
│   ├── RestaurantReviewsReel.jsx
│   ├── timeline.js
│   └── theme.js
├── scripts/
│   └── fetch-restaurant-props.mjs
├── props/
│   └── volta-dos-sabores.json   ← showcase props
├── public/
│   ├── logo_circle.png
│   ├── icons/*.svg
│   └── maps/volta-dos-sabores.png
└── out/                      # render output
```

## Composition registration

- **ID:** `RestaurantReviewsReel`
- **Size:** 1080×1920 @ 30fps
- **Duration:** `buildTimeline(reviews.length).total * FPS` via `calculateMetadata`

## Scaffold decisions

| Decision | Choice | Why |
|----------|--------|-----|
| New package vs existing | Keep `remotion/` | Already production-aligned with DESIGN.md |
| Default props | Volta dos Sabores (Lisboa) | Portugal P0 market + real props on disk |
| Scene files | Single composition file | Matches current architecture; avoid split unless needed |
