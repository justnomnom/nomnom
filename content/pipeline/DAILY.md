# Daily mass-content process

One command, one dated folder, a human still posts.

This is the production ritual. `content:plan-day` only prints four slots.
`content:daily` fills a **mass** review queue (calendar + extras).

## Every morning (10–20 min)

```bash
npm run content:daily
# or a specific day / bigger dump
npm run content:daily -- --date 2026-08-24 --volume 40
```

That writes `content/pipeline/out/YYYY-MM-DD/`:

| File | What it is |
|---|---|
| `REVIEW.md` | Checklist. Tick, reject, or send back. |
| `manifest.json` | Machine index of the batch. |
| `pieces/*.md` | Ready-to-edit copy. Pack extras are filled. DB/news heroes are stubs. |

Then:

1. Open `REVIEW.md`. Work top to bottom.
2. **Calendar (4)** — these are today’s posts. Produce live heroes (`pick-subjects` / punchline skill) before you write a restaurant name.
3. **Mass extras** — overflow for the same day or the rest of the week. Copy is already in the file. Do not add facts that are not in **Facts**.
4. Post the approved pieces yourself (Meta, TikTok, X, site). Nothing in this folder publishes.

## Rules that do not move

- No invented restaurant names, quotes, ratings, or dishes.
- Punchlines only from real trending food news that clears the virality bar. No tragedies, no identity fights.
- Feature copy stays aligned with `remotion/src/compositions/FeatureShowcase/features.js`.
- Social copy is PT-PT. Editorial MDX stays EN.
- Human review is the last step. Never auto-post.

## Volume

Default is **24** pieces: 4 calendar slots, live stubs for any db/news type not on the calendar, then pack extras until the volume is full. Every catalog type appears at least once. Raise `--volume` when you batch a week in one sitting. Consecutive days rotate extras so you do not clone yesterday.

## If a live slot has no subject

Skip it or swap in a feature reel. Do not fabricate a restaurant to keep the calendar full.
