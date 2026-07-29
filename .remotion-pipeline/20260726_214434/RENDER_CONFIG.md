# Render Configuration: RestaurantSpotlight

## Status
✅ Render settings defined

## Defaults

| Setting | Value |
|---------|-------|
| Composition | `RestaurantSpotlight` |
| Resolution | 1080×1920 |
| FPS | 30 |
| Codec | H.264 |
| CRF | 18 (high quality) |
| Pixel format | yuv420p (Remotion default) |
| Audio | AAC (when music/SFX added) |

## Commands

From `remotion/`:

```bash
# Preview in Studio
npm run dev
# → select RestaurantSpotlight

# High-quality Reels/TikTok render
npm run render:spotlight

# Or explicit
npx remotion render RestaurantSpotlight out/restaurant-spotlight.mp4 \
  --codec h264 --crf 18

# Smaller file (social drafts)
npx remotion render RestaurantSpotlight out/restaurant-spotlight-draft.mp4 \
  --codec h264 --crf 23

# Still (intro scene, ~4s)
npm run still:spotlight
```

## Platform Notes

- **Instagram Reels / TikTok / Shorts**: 9:16 1080×1920 — this composition
- **Full reviews story**: use existing `RestaurantReviewsReel` / `npm run render:volta`
