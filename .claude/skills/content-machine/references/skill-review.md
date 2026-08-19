# Content skill review

Reviewed 2026-08-19 against the NomNom repo. Use this when routing.
Generic skills are useful; several of them will invent facts or ignore
the reel pipeline if you follow them blindly.

## Keep / follow as-is

| Skill | Verdict |
|---|---|
| **content-machine** | Source of truth for queued production. Default lane is reels. |
| **nomnom-news-punchline** | Only stills producer. Virality bar is load-bearing. |
| **copywriting** | Site/product copy. Not captions for reels. |
| **copy-editing** | Edit existing copy; do not use to "improve" reel captions with adjectives. |
| **website-copy-specialist** | SaaS page copy. Fine for justnomnom.com marketing pages. |
| **ad-creative** | Paid variants. Strip any fabricated social proof before shipping. |
| **seo-content-strategist** | Inbound SEO. Do not mix into `content-queue/`. |
| **content-strategy** | What to write, not the writing. Overlaps seo-content-strategist — strategy first, SEO second. |
| **copy-anatomy** | Reverse-engineer a caption into a template. Safe; does not invent. |
| **gtm-copywriter** | GTM messaging. Not social batches. |
| **vsl-storyboard-writer** | Sales videos. Hands off to motion-designer. Not the reel machine. |
| **paid-ads** | Campaign strategy, not creative. Pair with ad-creative. |
| **lead-magnets** | Gated assets. Out of social queue. |

## Use with NomNom overrides

| Skill | Conflict | Override |
|---|---|---|
| **social-content** | Generic B2B cadence, LinkedIn-first, invents hooks. Triggers on "what should I post" — same phrase as content-machine. | Content-machine wins for NomNom batches. Social-content only adapts captions that already exist. No fake metrics. Portugal/IG/TikTok, not LinkedIn-default. |
| **content-strategy** | SaaS blog pillars. NomNom's daily outbound is reels + punchlines. | Use for blog/SEO only. |
| **create-video-start** | Shells out to `claude -p`, assumes TS `src/remotion/`. This repo is `remotion/src/` JS. | Follow the *order* of skills (spec → scaffold → animation → composition → components). Do the work in-process; do not spawn `claude -p`. Write JS, not TS, unless the folder already uses TS. |
| **motion-designer** | Generic 30–90s brand-film arc. NomNom reels are 20–35s, terracotta, data-driven. | Keep 12 principles. Match `remotion/src/theme.js` and existing scene timing. No invented copy in the spec. |
| **case-study-builder** | Fine for customer stories. | Quotes must be real reviews. |

## Do not use for NomNom social

| Skill | Why |
|---|---|
| **programmatic-seo** | Scale HTML pages, not IG. |
| **email-sequence** | Different channel. |
| **contagious / made-to-stick / marketing-psychology** | Useful theory; they will push adjective-led hooks. Reels open on figures (`lib/hooks.mjs`). |

## Trigger collisions

These phrases currently match more than one skill. Resolve as follows:

| User says | Winner |
|---|---|
| "make content" / "what should we post" / "batch of videos" | **content-machine** |
| "conteudo instagram" / "trocadilho" / "punchline posts" | **nomnom-news-punchline** (via content-machine if they asked for a mixed batch) |
| "LinkedIn post" / "Twitter thread" from an existing caption | **social-content** |
| "write homepage copy" | **copywriting** |
| "create a video" meaning a **new** composition | **create-video-start** |
| "create a video" meaning render a restaurant | **content-machine** |
| "audit animations" / "review motion" | **audit-animation** |

## Gaps this review does not fill

- No Stories/carousel Remotion composition yet — stills + captions only
- No TikTok-specific caption formatter beyond `.caption.txt`
- `instagram-posts/generate_posts.js` is a sibling of the punchline skill, not a third pipeline — do not fork it
