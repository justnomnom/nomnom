# Pipeline Complete: NomNom Restaurant Showcase (Volta dos Sabores)

## Execution summary

| Step | Skill | Output | Status |
|------|-------|--------|--------|
| 0 | setup | `.remotion-pipeline/20260726_211034/` | ✅ |
| 1 | motion-designer | `VIDEO_SPEC.md` | ✅ |
| 2 | remotion-scaffold | `SCAFFOLD_MANIFEST.md` (existing `remotion/`) | ✅ |
| 3 | remotion-animation | `ANIMATION_CONFIG.md` | ✅ |
| 4 | remotion-composition | `COMPOSITION_STRUCTURE.md` | ✅ |
| 5 | remotion-component-gen | `SCENE_COMPONENTS.md` (existing composition) | ✅ |
| 6 | remotion-render-config | `RENDER_CONFIG.md` | ✅ |
| 7 | remotion-asset-coordinator | `ASSET_MANIFEST.md` | ✅ |

**Skills installed:** all 54 from [ncklrs/startup-os-skills](https://github.com/ncklrs/startup-os-skills) → `.claude/skills/` (incl. 13 video-production skills).

## Showcase configured

| Item | Value |
|------|-------|
| Restaurant | **Volta dos Sabores**, Lisboa |
| Props | `remotion/props/volta-dos-sabores.json` |
| Map | `remotion/public/maps/volta-dos-sabores.png` |
| Studio defaults | `remotion/src/Root.jsx` updated to match |

## Quick start

```bash
cd remotion
npm run dev                 # Remotion Studio — preview RestaurantReviewsReel
npm run still:volta         # QA still at frame 90
npm run render:volta        # MP4 → out/volta-dos-sabores.mp4
```

## Next steps

1. [ ] Open Studio and scrub all scenes for typography / photo crop
2. [ ] (Optional) Add bed music under `public/audio/music/`
3. [ ] Run `/remotion-video-reviewer` against `VIDEO_SPEC.md`
4. [ ] For another spot: `npm run fetch -- --id <uuid> --reviews 3 --render`

## Notes

- Name-based fetch for “Volta dos Sabores” / “Casa Lupo” failed against current DB — use `--id` when regenerating.
- Demo kitchen props (`casa-nomnom-demo-kitchen.json`) use a non-0–5 rating scale; prefer Volta for honest showcase.
