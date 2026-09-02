# NomNom daily content pipeline

Operational layer on top of the existing producers (`content-machine`, Remotion
reels, punchlines, feature showcases). It does **not** post. It does **not**
invent restaurant names, quotes, ratings, or dishes.

## What already existed

| Lane | Status |
|---|---|
| Restaurant / review / list reels | Ready — `remotion/scripts/pick-subjects.mjs` + `run-batch.mjs` |
| Feature showcases | Ready — feed, lists, map, roulette, table |
| News punchline stills | Ready — `nomnom-news-punchline` |
| Article → list | Designed, not the daily queue |
| Editorial MDX | Only three `/use-cases` pages |
| Daily calendar + per-type iterations | Missing — this folder |

## Cadence

Four reviewable slots every day, 7-day rhythm, iterations rotate so the same
type never ships the same cut twice in a row:

| Slot | Mon | Tue | Wed | Thu | Fri | Sat | Sun |
|---|---|---|---|---|---|---|---|
| Hero | restaurant reel | review spotlight | feature reel | list reel | punchline | restaurant reel | feature reel |
| Social | carousel | thread | carousel | thread | carousel | UGC prompt | carousel |
| Engage | story | UGC prompt | story | UGC prompt | story | story | UGC prompt |
| Inbound | resource | feature reel | resource | ads | feature reel | thread | resource |

Each type has its own iteration set (hooks, structures, CTAs). Packs fill
product-true copy for app-adjacent slots. DB slots stay empty until
`pick-subjects` / punchline news supplies a real subject.

## Daily mass process

The production command is **not** the 4-slot plan. It is a mass batch:

```bash
npm run content:daily
npm run content:daily -- --date 2026-08-24 --volume 24
```

That writes `content/pipeline/out/YYYY-MM-DD/` with `REVIEW.md` and filled
piece files. Human review is the last step. See `DAILY.md`.

## Commands

```bash
npm run content:daily
npm run content:daily -- --date 2026-08-24 --volume 40
npm run content:plan-day
npm run content:plan-day -- --date 2026-08-24
npm run content:plan-day -- --date 2026-08-24 --json
npm run content:plan-range -- --from 2026-08-24 --days 28
```

Then produce live heroes with the command printed on the slot (`pick-subjects`,
`run-batch`, `render-feature-showcases`, or the punchline skill). Expand
captions with `social-content` only from facts already in the slot.

## Honesty

- Restaurant / review / list heroes: live rows only.
- Punchlines: trending food news that clears the virality bar. No tragedies.
- Feature copy: `remotion/src/compositions/FeatureShowcase/features.js` wins.
- Packs may talk about Maps chaos, group chats, and stars. They may not name a
  restaurant unless that restaurant is already in `content/` or the DB pick.
- Never auto-post. Human review is the last step.

## Related

- `.claude/skills/daily-content-pipeline/SKILL.md`
- `content/pipeline/DAILY.md`
- `.claude/skills/content-machine/SKILL.md`
- `docs/CONTENT-STRATEGY.md`
