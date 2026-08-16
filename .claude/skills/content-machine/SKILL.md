---
name: content-machine
description: Produces a batch of NomNom reels from real database subjects and queues them for human review. Picks restaurants and lists that actually have enough real material to render, fetches props, renders RestaurantReviewsReel / ListShowcase, writes captions, and records what went out so the same subject is not repeated. Use when asked to "make content", "run the content machine", "produce reels", "batch of videos", "what should we post", or "queue some content".
argument-hint: [--kind restaurant|list] [--limit n] [--city name]
---

# Content Machine

Turns the live database into a reviewable batch of reels. It does not invent
subjects, it does not invent facts, and it does not publish anything.

## Scope

| | |
|---|---|
| Produces | Restaurant reels (`RestaurantReviewsReel`), review spotlights (`RestaurantSpotlight`) and list reels (`ListShowcase`) |
| Trigger | On demand — this skill. No cron. |
| Publishing | **Never automatic.** Assets land in `remotion/content-queue/<batchId>/` for manual review and posting. |

Static images (`nomnom-news-punchline`, `instagram-posts/`) and written copy
(`social-content`, `copywriting`) are out of scope — they have their own skills.

## Hard rules

1. **Data honesty.** Props come from `restaurants`, `restaurant_reviews`, `lists`,
   `list_items` and the Google ingest metadata. A field with no real source is
   passed as empty so the composition hides that element. Never hand-write a
   quote, a dish, a rating or a vibe line into a props file.
   Two traps, both already caught once:
   - **Props files must be complete.** Remotion merges a composition's
     `defaultProps` *underneath* the file, so an omitted key renders the
     placeholder venue instead of failing. `props-completeness.test.mjs` guards
     this — if you add a key to a composition, the test tells you.
   - **Attribution follows the source.** "In your NomNom Circle" and "Loved by
     the NomNom community" are only true of on-platform reviews. With a
     Google-sourced pool the badge empties and the line becomes "Rated on
     Google". Do not re-hardcode them.
2. **Hooks come from figures, not adjectives.** `lib/hooks.mjs` opens each reel
   on a real number — mention count, review count, rating — chosen by hashing
   the venue id, so a batch does not repeat one line six times and a venue keeps
   its hook between runs. Generic copy is the floor, used only when a venue has
   no figure worth leading with. New templates must interpolate real values and
   fit `MAX_LINE_CHARS`, or they overflow the 106px headline.
3. **Never post.** Publishing to a real account is outward-facing and
   irreversible. Hand the user the batch; let them post.
4. **The ledger is the memory.** `remotion/content-queue/ledger.json` records
   subjects whose video actually rendered. Do not edit it by hand to force a
   re-run — use `--include-recent`.

## Run it

```bash
cd remotion && node scripts/pick-subjects.mjs --limit 5
```

Scores every candidate against what the compositions actually render and writes
`content-queue/subjects.json`. Read the table before producing: the `!` lines
are real gaps in the data, not style notes.

```bash
cd remotion && node scripts/run-batch.mjs --limit 3
```

Fetches props, renders each reel plus a poster still, writes a caption, and
leaves `manifest.json` + `REVIEW.md` in the batch folder.

### Flags worth knowing

| Flag | Use |
|---|---|
| `--kind restaurant \| review \| list` | Produce one type only. `review` is the single-quote spotlight cut |
| `--allow-duplicates` | Let one venue appear as more than one cut in a batch (off by default) |
| `--city "Lisboa"` | Restrict restaurant picks to a city |
| `--cooldown 45` | Days before a subject can repeat (default 45) |
| `--include-recent` | Ignore the cooldown — for a deliberate re-cut |
| `--include-system-lists` | Also consider the app's built-in Must-Go / Visited lists |
| `--no-render` | Props + captions only; fast, and does not touch the ledger |
| `--dry-run` | Print the plan and stop |
| `--rebuild <batchId>` | Re-produce an existing batch in place after a code change — same subjects and filenames, refreshed manifest and `REVIEW.md`, ledger untouched |
| `--rebuild <id> --no-render` | Metadata-only refresh: rebuild captions, warnings and the manifest against assets already on disk, without re-encoding |

Rendering needs the Remotion CLI: `cd remotion && npm install`. Without it,
`run-batch.mjs` stops early and tells you — use `--no-render` to queue props and
captions in the meantime.

Renders fail intermittently — observed several times, cause not established, and
not reproducible on demand (six controlled re-runs all passed). Two mitigations
are built in: a render is retried once before the item is marked failed, and a
poster frame that will not render is dropped with a warning instead of failing an
item whose video is fine. If an item still fails, re-run the same command before
looking for a data problem.

## Reporting back

After a batch, tell the user:

- what was produced, and the readiness score of each item;
- every warning from `REVIEW.md` — these are the things a viewer would notice
  (missing photos, a single review, places spanning cities);
- what was skipped and why (cooldown, or blocked for having no reviews at all);
- where the files are. Then stop. Do not offer to post them.

## How the pieces fit

```
pick-subjects.mjs ──> content-queue/subjects.json
                        │
run-batch.mjs ──────────┴─> fetch-restaurant-props.mjs ─┐
                            fetch-list-props.mjs ───────┤
                                                        ├─> remotion render
                                                        ├─> lib/hooks.mjs (opening copy)
                                                        ├─> lib/captions.mjs
                                                        └─> content-queue/<batchId>/
                                                              manifest.json, REVIEW.md,
                                                              *.props.json, *.mp4, *.jpg,
                                                              *.caption.txt
                            lib/content-state.mjs ─────────> content-queue/ledger.json
```

Scoring lives in `remotion/scripts/lib/reel-readiness.mjs` and is unit-tested
(`cd remotion && npm test`). Every weight maps to a scene element — change the
compositions and the scores should change with them.

## Related skills — use, don't duplicate

- `create-video-start` — full pipeline for a **new** composition from a brief.
  This skill only feeds the compositions that already exist.
- `motion-designer`, `remotion-best-practices` — craft rules for editing the
  compositions themselves.
- `social-content` / `copywriting` — longer-form captions. The generated caption
  is deliberately factual; hand it to those skills if the user wants voice.
