---
name: nomnom-news-punchline
description: >
  Searches for viral and trending news (Portugal first, global only if unavoidable), crafts
  food-themed trocadilhos/punchlines tied to NomNom, and GENERATES actual Instagram post
  images (1080x1080 PNG). Template matches the app: parchment paper, terracotta accent
  bar, Libre Baskerville headline, Albert Sans chrome, NomNom wordmark. No emojis. Brand
  woven in subtly. Use this skill whenever the user asks to: "find news and make a punchline",
  "trocadilho com noticias", "conteudo instagram", "cria posts para o NomNom", "gerar
  trocadilhos", "fazer posts com as noticias", or any variant of "find news and make it funny
  for NomNom instagram". Proactively suggest when the user wants Instagram content or
  wants to react to current events with food humor.
---

## What this skill does

You are NomNom's content writer and designer. For each post you produce:
1. **CONTENT** — trocadilho/punchline + Instagram caption
2. **IMAGE** — a 1080x1080 PNG with the NomNom branded template

Template style (same tokens as `DESIGN.md` / `remotion/src/theme.js`):
- Parchment canvas (`#faf9f5`) — terracotta is ~10% (10px top bar + wordmark)
- Libre Baskerville 700 headline, sentence case, ink `#15130f`
- Albert Sans subtitle and chrome; overline-style source label
- Central food photo, 32px card radius, warm `grey[900]` shadow
- Bottom: **NomNom** wordmark (Albert Sans 800, terra) + tagline left;
  news source + date right
- Never: full-bleed `#FF6B35`, Arial, `font-weight: 900`, cool slate
  (`#0F172A` / `#64748B`), pure `#000` / `#fff`, emojis on the image

The HTML lives in `assets/template.html`. Do not invent a second look.

---

## Step 1: Find genuinely viral news

Do NOT just search "noticias Portugal hoje" and pick any story. You must verify virality.
Run these searches in order and cross-reference what appears in multiple places:

### Portugal trending — check these specific sources:

1. **Google Trends Portugal** — search for:
   `site:trends.google.com trending searches portugal` OR
   `google trends portugal hoje [today's date]`
   Look for stories appearing in the trending searches list.

2. **Reddit r/portugal** — search:
   `site:reddit.com/r/portugal top posts today`
   Posts with 100+ upvotes = genuinely viral in Portugal.

3. **Twitter/X Portugal trending** — search:
   `twitter trending portugal hoje` OR `X trending portugal [date]`
   Look for what Portuguese people are actually sharing.

4. **"Mais lidas" (most read)** — search:
   `observador.pt "mais lidas"` OR `publico.pt "mais lidas"`
   These are algorithmically verified as most-clicked stories.

5. **Notícias ao Minuto / CM** — search:
   `noticiasaominuto.com viral` OR `cmjornal.pt mais lidas`

### Global viral — only include if:
- It appears in Twitter/X worldwide trending
- It's so big that Portuguese outlets are also covering it
- Examples that qualify: Eurovision week, major Trump action, celebrity death,
  massive sports result, genuinely weird food story spreading globally
- Examples that do NOT qualify: US political news, minor international stories

### Virality bar:
A story is viral if it appears in **at least 2 of the 5 sources above**.
If you can't verify a story is actually trending, skip it.
Better to have 2 genuinely viral stories than 5 mediocre ones.

After gathering candidates, pick the **3 most viral** with the best punchline potential:
irony, reversals, words echoing food, restaurant metaphors in disguise.

---

## Step 2: Write content for each post

Fields per post:

- `news_source`: outlet (e.g. "Observador", "Público")
- `news_date`: short Portuguese date (e.g. "14 maio")
- `title`: sentence-case punchline, max 10 words. References the news, twisted
  food/restaurant angle. Works standalone. Not ALL CAPS (overline is for the source).
- `subtitle`: sentence-case setup, max 60 chars. News reference or punchline setup.
- `image_query`: 2-4 English keywords for Unsplash food photo search
  (e.g. "bifana portuguese sandwich", "restaurant candle table", "caldo verde soup portugal",
  "grilled fish lisbon", "pastel de nata coffee")
- `image_url`: leave as "" — the script fetches via image_query
- `caption`: full Instagram description (1-3 sentences). "— NomNom" sign-off optional.
- `filename`: e.g. `post-1-restauracao.png`

Tone: dry, warm, no emojis. Spots not establishments. Joke lands first; brand is subtle.

---

## Step 3: Generate the images

Save all posts as `posts.json` in your working directory, then run:

```bash
node "<skill-dir>/scripts/generate_posts.js" posts.json ./instagram-posts/
```

Where `<skill-dir>` is the directory containing this SKILL.md file
(`.claude/skills/nomnom-news-punchline` in this project).

The script:
1. Downloads each food image from Unsplash as a base64 data URI (bypasses CORS)
2. Renders the HTML template with your content
3. Screenshots as 1080x1080 PNG via Playwright (already installed in this project)

**If Playwright errors**, fall back to generating HTML files and report their paths.

---

## Step 4: Output

```
POST 1 — [one-line news summary]
Imagem: ./instagram-posts/post-1-xxx.png
Legenda: [caption text]
```

One sentence at end on which is strongest and why.

---

## Template visual layout

```
┌──────────────────────────────────────────┐  ← 10px terracotta bar
│  Parchment #faf9f5                       │
│  Headline in Baskerville (sentence case) │  ← ink #15130f
│  Subtitle in Albert Sans                 │  ← ink2 #6e6657
│                                          │
│         [ food photo, radius 32px ]      │
│                                          │
│  NomNom            OBSERVADOR            │  ← terra wordmark · overline source
│  Restaurant picks… 14 maio               │
└──────────────────────────────────────────┘
```
