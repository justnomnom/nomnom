# NomNom content types

Catalog of outbound and inbound content this repo can actually produce.
Do not invent a format that has no producer.

## Outbound (queued, never auto-posted)

### 1. Restaurant reel — `RestaurantReviewsReel`

- Aspect: 9:16, 1080×1920, 30fps
- Source: one restaurant + real reviews
- Scenes: hook → intro → review tiles → consensus → map → CTA
- Picker: `--kind restaurant`
- Props: `scripts/fetch-restaurant-props.mjs`
- Caption: `captionForRestaurant` in `lib/captions.mjs`

### 2. Review spotlight — `RestaurantSpotlight`

- Same frame as reels
- Source: one quote that can carry a scene
- Picker: `--kind review`
- Caption: `captionForReview` — the quote leads, attributed

### 3. List reel — `ListShowcase`

- Source: a user list with enough real places
- Picker: `--kind list`
- Needs `MIN_LIST_PLACES` usable spots (see `reel-readiness.mjs`)
- Caption: `captionForList`
- Skip system Must-Go / Visited unless `--include-system-lists`

### 4. Punchline still — `nomnom-news-punchline`

- 1080×1080 PNG, parchment paper + 10px terracotta bar (not a full terra fill)
- Albert Sans + Libre Baskerville; no emojis on the image
- Source: viral news (Portugal first) + food trocadilho
- Output: `instagram-posts/`
- Virality bar is part of the skill, not optional

### 5. Reel poster still

- JPG next to each rendered mp4 in `content-queue/<batchId>/`
- Dropped with a warning if the still render fails; the video can still ship

### 6. Factual caption (`.caption.txt`)

- Built only from rendered props
- CTA: `Save it in NomNom → justnomnom.com` (lists use the list CTA)
- Hashtags from real location/chip labels plus `#nomnom`

## Outbound (planned, sibling skills)

### 7. Social variants

Threads, Stories, carousels, LinkedIn. Start from (6) or punchline fields.
Skill: `social-content`. No new facts.

### 8. Paid ads

Headlines / primary text / RSA variants. Skill: `ad-creative`.
Same honesty: no fake ratings or circle claims.

## Inbound (not a social queue)

### 9. Website / product copy

Homepage, features, pricing. Skills: `copywriting`, `website-copy-specialist`.

### 10. SEO / editorial

Pillars, clusters, briefs. Skills: `content-strategy`, `seo-content-strategist`.

### 11. New video composition

A template that does not exist yet. Skill: `create-video-start`, not this machine.

## Readiness by type

| Type | Ready when |
|---|---|
| Restaurant reel | Score from `scoreRestaurant` — photos, quotes, rating, location |
| Review spotlight | `scoreReviewReel` — one usable quote (`MIN_USABLE_QUOTE`) |
| List reel | `scoreList` — enough places with real data |
| Punchline | Story in ≥2 of 5 news sources + a food twist that fits the template |
| Social variant | A factual caption or punchline already exists |
| Ads | Offer + audience known; prefer real review language |
| Site / SEO | Marketing context in `.agents/product-marketing-context.md` |

## What is not a content type here

- In-app UI copy (`src/locales`) — product work, not this queue
- Push notifications — different pipeline
- Email sequences — `email-sequence`
- VSLs / demo videos from a brief — `vsl-storyboard-writer` + `create-video-start`
