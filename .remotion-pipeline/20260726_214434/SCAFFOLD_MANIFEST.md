# Scaffold Manifest: RestaurantSpotlight

## Status
✅ Directory structure created
✅ Configuration files generated
✅ Scene templates implemented
✅ Registered in `remotion/src/Root.jsx`

## Generated Structure

```
remotion/src/compositions/RestaurantSpotlight/
├── index.jsx                 # ✅ Main composition
├── constants.js              # ✅ FPS, timing, springs
├── sceneHelpers.js           # ✅ Envelope, stars, dish tile
└── scenes/
    ├── Scene1Hook.jsx        # ✅ Implemented
    ├── Scene2Intro.jsx       # ✅ Implemented
    ├── Scene3Review.jsx      # ✅ Implemented
    └── Scene4CTA.jsx         # ✅ Implemented

remotion/public/
├── logo_circle.png           # ✅ Exists
├── icons/                    # ✅ Exists
├── maps/                     # ✅ Exists (full reel)
├── images/restaurant/        # ✅ Created (optional local hero)
└── audio/
    ├── music/                # ✅ Created (TODO add track)
    └── sfx/                  # ✅ Created (TODO add SFX)
```

## Notes
- Project uses JSX (not TSX) to match existing `remotion/` package.
- Tokens reused from `remotion/src/theme.js`.
- Longer reviews reel remains as `RestaurantReviewsReel` composition.
