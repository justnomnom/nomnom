---
name: daily-content-pipeline
description: Daily mass-content process for NomNom — one command writes a large reviewable batch (calendar + extras), distinct iterations per type, from real sources, never posted automatically. Use when asked for a content pipeline, daily posting plan, mass content, what to post today/this week, content calendar, or scalable social/SEO content around the app.
---

# Daily content pipeline

Turn the catalog in `content/pipeline/` into a **mass** reviewable day's work.
Do not invent restaurant facts. Do not publish.

The daily command is `npm run content:daily`, not the 4-slot printer.
Read `content/pipeline/DAILY.md` with `README.md`, `catalog.json`, and
`.claude/skills/content-machine/references/brand.md` before writing copy.

## When this runs

- "content pipeline", "mass content", "what do we post", "daily content", "fill the week"
- After `/content-machine` when the user wants cadence, not a one-off batch

## Produce the day's mass batch first

```bash
npm run content:daily
npm run content:daily -- --date YYYY-MM-DD --volume 24
```

That writes `content/pipeline/out/YYYY-MM-DD/` with `REVIEW.md` and one markdown
file per piece. Default volume is 24 (4 calendar slots + 20 rotating extras).

Each piece already has:

- a **type** (restaurant reel, punchline, carousel, …)
- an **iteration** (count hook vs quote hook vs myth-bust vs poll — type-specific)
- a **pack** for app-adjacent types, or a live-data stub for DB/news types
- **copy** filled from pack facts (extras) or a produce command (live heroes)

Then walk `REVIEW.md` top to bottom. Human posts. This skill does not post.

To inspect only the four calendar slots:

```bash
npm run content:plan-day -- --date YYYY-MM-DD
```

For a month of briefs (plans only, not filled copy):

```bash
npm run content:plan-range -- --from YYYY-MM-DD --days 28
```

## Produce live heroes in slot order

1. **Hero**
   - `restaurant_reel` / `review_spotlight` / `list_reel` → follow `content-machine` reels. Run the `produce` command on the piece. Keep the planned **iteration** when writing the hook (figures, not adjectives).
   - `feature_reel` → `cd remotion && node scripts/render-feature-showcases.mjs --only <featureId>`. Do not paraphrase FEATURES.js strings.
   - `punchline` → `nomnom-news-punchline`. Skip the day if nothing clears the virality bar; do not invent news. Fall back to a feature reel with the next iteration.
2. **Social / extras** — copy is already in `pieces/*.md`. `social-content` may adapt voice; it may not add facts.
3. **Engage** — Stories or UGC prompt from a pack, **different** iteration than the feed post.
4. **Inbound** — ship or refresh the MDX path in `pack.seoPath`, or plan ads with `ad-creative` using pack facts only.

## Iteration rule

If the user asks for "more of the same type", advance the iteration, do not clone
the last hook. Iteration ids live on the type in `catalog.json`. Repeating a
type in one week is expected; repeating an iteration is not. The mass extras
rotate by date so consecutive days are not clones.

## Report

Point at the dated `out/` folder, list calendar slots, extra count, live-subject
warnings, and `REVIEW.md`. Stop. Do not offer to post.
