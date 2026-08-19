---
name: content-machine
description: Produces and routes all NomNom outbound content — restaurant/review/list reels, punchline stills, Instagram posts, social captions, ads, and SEO/copy lanes — from real sources, then queues for human review. Never invents facts and never publishes. Use when asked to "make content", "run the content machine", "produce reels", "batch of videos", "all types of content", "what should we post", "queue some content", "punchline posts", "Instagram content", or "content batch".
argument-hint: "[--type reel|punchline|social|ads|copy|seo|all] [--kind restaurant|review|list] [--limit n] [--city name]"
---

# Content Machine

Turns real NomNom material into a reviewable batch. It does not invent
subjects, it does not invent facts, and it does not publish anything.

If the user names a type, produce that type. If they say "all types" /
"every kind of content", run the mixed batch in [All types](#all-types).
If they only say "make content" or "content machine", default to **reels**.

Read [references/brand.md](references/brand.md) before producing anything
visual or written — DESIGN.md / `remotion/src/theme.js` win over generic
marketing skills.
Read [references/types.md](references/types.md) for the full catalog.
Read [references/skill-review.md](references/skill-review.md) before
handing work to a sibling skill.

## Lanes

| `--type` / ask | Produces | Who runs it |
|---|---|---|
| `reel` (default) | `RestaurantReviewsReel`, `RestaurantSpotlight`, `ListShowcase` | This skill |
| `punchline` | 1080×1080 news-trocadilho stills | `nomnom-news-punchline` |
| `social` | Captions, threads, Stories, carousels | `social-content` on real captions/facts |
| `ads` | Paid creative variations | `ad-creative` |
| `copy` | Site/product copy | `copywriting` / `website-copy-specialist` |
| `seo` | Pillars, clusters, page briefs | `content-strategy` then `seo-content-strategist` |
| `all` | Mixed queue across ready lanes | This skill orchestrates |

A new Remotion composition from a brief is **not** this skill — use
`create-video-start`. This skill only feeds compositions that already exist.

## Hard rules (every lane)

1. **Data honesty.** Reels and captions come from `restaurants`,
   `restaurant_reviews`, `lists`, `list_items` and Google ingest metadata.
   A field with no real source is empty so the composition hides it. Never
   hand-write a quote, dish, rating or vibe line into a props file.
   Two traps, both already caught once:
   - **Props files must be complete.** Remotion merges a composition's
     `defaultProps` *underneath* the file, so an omitted key renders the
     placeholder venue instead of failing. `props-completeness.test.mjs`
     guards this — if you add a key to a composition, the test tells you.
   - **Attribution follows the source.** "In your NomNom Circle" and
     "Loved by the NomNom community" are only true of on-platform reviews.
     With a Google-sourced pool the badge empties and the line becomes
     "Rated on Google". Do not re-hardcode them.
2. **Hooks come from figures, not adjectives.** `lib/hooks.mjs` opens each
   reel on a real number — mention count, review count, rating — chosen by
   hashing the venue id. Generic copy is the floor. New templates must
   interpolate real values and fit `MAX_LINE_CHARS`, or they overflow the
   106px headline.
3. **Never post.** Publishing is outward-facing and irreversible. Hand the
   user the batch; let them post.
4. **The ledger is reel memory.** `remotion/content-queue/ledger.json`
   records subjects whose video actually rendered. Do not edit it by hand
   to force a re-run — use `--include-recent`.
5. **Punchlines stay news-tied.** `nomnom-news-punchline` stills need a
   story that is actually trending (2 of 5 sources). Do not invent news.
8. **No punchlines from tragedies.** Hospitalisations, deaths, and
   political identity fights are out — even when they are the most viral
   stories of the day. Pick food news that clears the virality bar, or
   skip the lane.

---

## Reels (default)

```bash
cd remotion && node scripts/pick-subjects.mjs --limit 5
```

Scores every candidate against what the compositions actually render and
writes `content-queue/subjects.json`. Read the table before producing:
the `!` lines are real gaps in the data, not style notes.

```bash
cd remotion && node scripts/run-batch.mjs --limit 3
```

Fetches props, renders each reel plus a poster still, writes a caption,
and leaves `manifest.json` + `REVIEW.md` in the batch folder.

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
| `--rebuild <batchId>` | Re-produce an existing batch in place after a code change |
| `--rebuild <id> --no-render` | Metadata-only refresh against assets already on disk |

Rendering needs the Remotion CLI: `cd remotion && npm install`. Without it,
`run-batch.mjs` stops early and tells you — use `--no-render` to queue
props and captions in the meantime.

Renders fail intermittently — observed several times, cause not established,
and not reproducible on demand (six controlled re-runs all passed). Two
mitigations are built in: a render is retried once before the item is marked
failed, and a poster frame that will not render is dropped with a warning
instead of failing an item whose video is fine. If an item still fails,
re-run the same command before looking for a data problem.

### How the pieces fit

```
pick-subjects.mjs ──> content-queue/subjects.json
                        │
run-batch.mjs ──────────┴─> fetch-restaurant-props.mjs ─┐
                            fetch-list-props.mjs ───────┤
                                                        ├─> remotion render
                                                        ├─> lib/hooks.mjs
                                                        ├─> lib/captions.mjs
                                                        └─> content-queue/<batchId>/
                            lib/content-state.mjs ─────────> ledger.json
```

Scoring lives in `remotion/scripts/lib/reel-readiness.mjs` and is
unit-tested (`cd remotion && npm test`). Every weight maps to a scene
element — change the compositions and the scores should change with them.

---

## Punchline stills

Read and follow `.claude/skills/nomnom-news-punchline/SKILL.md`. Output
lands as 1080×1080 PNGs under `instagram-posts/`. Use the parchment
template in that skill's `assets/template.html` (synced with
`instagram-posts/template.html`). Do not skip the virality bar. After
images exist, write captions that name the news source and date — no
invented quotes, no emojis in the image.

## Social copy

Start from facts already in the batch (reel `*.caption.txt`, punchline
fields, restaurant/list rows). Then read `social-content`, then re-apply
`references/brand.md` voice (spots, not establishments; sentence case;
no invented metrics). Platform adaptation is allowed; new facts are not.

The generated reel caption is deliberately factual. Hand it to
`social-content` / `copywriting` only when the user wants voice on top.

## Ads

Read `ad-creative`. Same honesty rule: no fake social proof, no
star-ratings that are not in the DB. Prefer angles from real reviews and
list titles already on platform.

## Site copy and SEO

These are inbound, not a social queue. Route:

- Page copy → `copywriting` or `website-copy-specialist`
- What to write → `content-strategy`
- Keyword clusters / technical SEO → `seo-content-strategist`

Do not mix those outputs into `remotion/content-queue/`.

---

## All types

When the user asks for every kind of content, do this in order and stop
after the report — do not publish.

1. **Inventory** — list what each lane can produce right now (reel
   candidates via `pick-subjects.mjs --limit 5`, punchline news that
   clears the virality bar, whether ad/copy context exists in
   `.agents/product-marketing-context.md`). `pick-subjects` always prints
   the table; `--dry-run` exists on `run-batch.mjs` only.
2. **Reels** — `run-batch.mjs --kind all --limit 3` (or `--no-render` if
   Remotion CLI is missing). Default `--kind both` skips review
   spotlights; `--kind all` covers restaurant, review, and list.
3. **Punchlines** — up to 3 stills via `nomnom-news-punchline`.
4. **Captions** — keep the factual reel/punchline captions in the queue.
   Only expand via `social-content` if the user asked for platform variants.
5. **Ads / site / SEO** — plan only unless the user named those lanes.
   A mixed social batch does not silently rewrite the homepage.

---

## Reporting back

After a batch, tell the user:

- what was produced, by lane, and the readiness score of each reel;
- every warning from `REVIEW.md` — missing photos, a single review,
  places spanning cities;
- what was skipped and why (cooldown, no reviews, news not viral enough);
- where the files are. Then stop. Do not offer to post them.

## Related skills — use, don't duplicate

- `create-video-start` — full pipeline for a **new** composition from a brief
- `audit-animation` — review motion in product UI or Remotion, do not produce content
- `motion-designer`, `remotion-best-practices` — craft rules for editing compositions
- `nomnom-news-punchline` — punchline stills
- `social-content` / `copywriting` — voice on top of factual captions
- `ad-creative` — paid variants
