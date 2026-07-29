# RENDER_CONFIG — RestaurantReviewsReel

**Skill:** remotion-render-config  
**Primary target:** Instagram Reels / TikTok (9:16)

## Output

| Setting | Value |
|---------|-------|
| Format | MP4 |
| Codec | H.264 |
| Pixel format | yuv420p (default) |
| Audio | AAC (when music added) |
| Resolution | 1080×1920 |
| FPS | 30 |
| CRF | 18 (high quality social) / 23 (smaller file) |

## Commands

```bash
cd remotion

# Studio preview (defaults = Volta dos Sabores after Root update)
npm run dev

# Render showcase with real Lisbon props
npx remotion render RestaurantReviewsReel out/volta-dos-sabores.mp4 \
  --props=./props/volta-dos-sabores.json \
  --codec h264 --crf 18

# Convenience script
npm run render:volta

# Still for thumbnail / QA (intro-ish frame)
npx remotion still RestaurantReviewsReel out/volta-still.png \
  --props=./props/volta-dos-sabores.json --frame=90
```

## Platform presets

| Platform | CRF | Notes |
|----------|-----|-------|
| Reels / TikTok | 18 | Keep 1080×1920; under ~50MB preferred |
| WhatsApp | 23 | Smaller file, same resolution |
| LinkedIn / X crop | — | Do not crop; native 9:16 only for this template |
