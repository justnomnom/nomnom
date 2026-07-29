# NomNom — Export HTML: pages & functionality spec

Static HTML/Tailwind prototypes in this folder (`*.html`). Use this document to align **frontend routes** and **backend/API** work. Prototype links use hash placeholders (design tool exports), not production URLs.

**Shared stack (all pages):** Tailwind v4 browser build, Iconify, fonts (Plus Jakarta Sans, Playfair Display, JetBrains Mono). Primary brand colour: `#ff6b35` (orange/coral).

---

## 1. Marketing & public web

### `landing-page.html` — Product landing

- **Nav:** Logo, Features, Creators anchors, **Open web app** CTA, mobile menu.
- **Hero:** Headline (“Stop searching, start Nom Nomming”), value prop, **Get started**, **App Store** (Apple icon), social proof avatars (verify count before shipping).
- **Features** (`#features`): three pillars — **Pick a vibe**, **NomNom Roulette**, **Creator first** (copy explains each).
- **Section:** “Built for the next generation of locals” with checklist (verified creator recs, interactive maps).
- **Creators** area (`#creators`): creator-focused teaser (pattern continues in file).
- **Backend:** Mostly static CMS/marketing; track CTA clicks if needed.

### `creator-portal.html` — Creator program landing

- **Nav:** Benefits, NomNom Pro, **Apply to join**.
- **Hero:** “Turn your taste into impact”, **Start Nom Nomming**, joined-by avatars.
- **Benefits** (`#benefits`): Analytics (saves, open-in-maps), **Exclusive perks** (events, tastings), **Verified status**.
- **CTA strip:** “Ready to Nom Nom with us?” — **Apply for access** (copy mentions LA, NY, Tokyo).
- **Footer:** Guidelines, Terms, Support.
- **Backend:** Application/lead capture, creator tier (`NomNom Pro`), email notifications.

### `city-landing.html` — City hub (example: Los Angeles)

- **Nav:** City tie-in, **Get app**.
- **Hero:** City name, tagline (creator-verified eats).
- **LA trending now:** grid of spot cards → detail; third tile “More spots” app CTA.
- **Why Nom Nom in LA:** feature blocks.
- **Backend:** City entity, geo-scoped trending, SEO pages per city.

### `support-center.html` — Help center

- **Nav:** Help centre, Creator portal, Log in.
- **Hero search:** “Search for answers…” (FAQ index).
- **Category cards:** My account, Creators, Technical, Safety.
- **Top questions:** expandable rows (verification, “Nom Nomming”, guest use, badges).
- **Still stuck:** **Live chat now**, **Email support**.
- **Backend:** FAQ content API or CMS, ticketing/chat integration.

---

## 2. Authentication

### `auth.html` — Sign-in / sign-up

- Branding, tagline.
- **Start Nom Nomming with Google** (OAuth).
- **Join the NomNom Circle** (Instagram-styled button — treat as OAuth or deep link per product decision).
- **Terms** and **Privacy** links.
- **Backend:** Google (and optional Instagram) OAuth; session/JWT; legal doc URLs.

---

## 3. Onboarding (post-auth)

| File | Purpose | UI / actions |
|------|---------|----------------|
| `onboarding-welcome.html` | First screen | Progress (4 bars), hero art, **Enable** location teaser, **Let's Nom Nom!** |
| `onboarding-cuisines.html` | Preferences | Multi-select cuisine/vibe tiles (pizza, sushi, tacos, burgers, etc.), **Keep Nom Nomming!**, Skip |
| `onboarding-location.html` | Location | **Use my location**, city grid: New York, LA, Tokyo, Paris, **Almost there!**, Skip |
| `onboarding-creators.html` | Social graph | Suggested creators with **Follow** / **Following**, Skip, continue |

**Backend:** Store `user_preferences` (cuisines/vibes), `home_city` or coordinates, `following` relationships; optional geolocation permission state.

> Style note: avoid dev jargon (`user_preferences`, `home_city`) in any user-facing copy — these field names stay in implementation docs only.

---

## 4. Core discovery (signed-in app)

### `home.html` — Main feed (mobile)

- **Header:** Logo, **notifications**, search (“What are you feeling?”), **filter/tune** button.
- **FAB:** **Nom Nom?** (roulette shortcut).
- **Vibe chips:** Date Night, Friends, Cheap Eats, Corporate → search results.
- **NomNom Roulette** promo block.
- **Trending creators** horizontal list, **View all**.
- **Feed category chips:** Daily Nom Noms, Coffee & Brunch, Hidden Gems, Date Night.
- **Feed cards:** hero image, rating, Reel badge, bookmark, creator attribution, quote, spot name, NomNom Meter, **Open in Maps**, **Share**.
- **Bottom nav:** Discover (active), Map, Saved, Profile.
- **Backend:** Personalised feed API, vibes/tags, creator leaderboard, save/bookmark, share links, metrics (NomNom Meter).

### `search-explore.html` — Search hub

- Large search input (feelings / natural language).
- **Pick a vibe** grid (same vibes → results).
- **Popular cities** (LA, NY, …), See all.
- Same **bottom nav** as home.

### `search-result.html` — Search results

- Back, editable query, **filter/tune**.
- Result count + **Trending** badge.
- **Cards:** image, bookmark, vibe tag, spot meta, rating, NomNom Circle social proof → tap opens **restaurant detail**.
- **Backend:** Search index (spots, vibes, geo, text), filters, pagination, sort.

### `web-discovery.html` — Desktop discovery

- **Sidebar:** Discover, Map view, Saved, Profile (nav).
- **Top bar:** Search (“creators, vibes, hidden gems”), **notifications** (dot), **Go Pro**.
- **Discovery feed:** City context (LA), **Daily feed** / **Near me** toggles.
- **Large cards:** image overlays (rating, trending), bookmark, creator quote, spot name/area/price, **Open in Maps**, **Share**.
- **Backend:** Same as feed; layout differs; optional NomNom Pro subscription flag.

### `map-view.html` — Map

- Full-bleed map image (placeholder for real map SDK).
- **Pins** by category; user location pulse.
- Top: search (“areas, cuisines”), filter.
- Horizontal chips: **Hot Nom Noms**, High Rated, Following.
- **Bottom sheet:** selected spot preview, NomNom Meter, avatars, **Open in Maps**, bookmark.
- FAB: roulette.
- **Bottom nav:** Map active.
- **Backend:** Geo queries, marker clustering, spot details by id, deep links to detail.

### `restaurant-detail.html` — Venue detail

- Back, **Share**, **Save** (filled bookmark).
- **Image carousel** with dots.
- Name, rating, category, neighbourhood, price tier.
- **Live NomNom Meter:** weekly nom count, progress, percentile, circle avatars, **Nom Nom It!** (engagement).
- **Open in Maps**, **Save to list**.
- **Community consensus:** aggregated mention themes with counts.
- **Address.**
- **Mentioned by:** creator cards with source type (e.g. Featured Reel), quotes.
- **Backend:** Spot CRUD + aggregates, mentions, meters (heat), NomNom Circle graph, maps URL, save-to-list modal data.

### `nom-roulette.html` — Roulette intro

- Close/back, animated dice, **Spin the Noms!**, copy: “From your NomNom Circle”.
- **Backend:** Random/weighted pick from pool (saved, following, city, global — product rules).

### `roulette-result.html` — Roulette outcome

- Winning spot name, hero image, NomNom Meter bar, **Your NomNom Circle** avatars + copy.
- **View Nom Nom details**, **Open Maps**, **Spin again**.
- **Backend:** Same as spot detail + roulette session logging.

---

## 5. Saves, lists, guides

### `saved-content.html` — My Nom Noms

- Header **My Nom Noms**; FAB roulette.
- Tabs: **Restaurants (n)**, **My lists (n)**.
- Saved spot cards: image, bookmark, heat badge, NomNom Meter, **Open in Maps**.
- **Bottom nav:** Saved active.
- **Backend:** Saved spots, list counts, meters.

### `save-to-list.html` — Modal / sheet

- **Save to…** Favourites (default), **My NomNom Lists** (each with thumb, count, public/private), **New NomNom List**.
- **Personal note** textarea, **Confirm selection**.
- **Backend:** Favourites + user lists; list membership; notes per save.

### `create-guide.html` — New NomNom List

- Close, **Save** (header), fields: **List name**, **Description**; **Add spot**; per-spot image, name, location, **Why is this a must-nom?**, remove; dashed **add more**; **Cover image** (change); **Publish NomNom List**.
- **Backend:** List metadata, cover asset, ordered list items with per-item blurbs, publish visibility.

### `guide-detail.html` — Public / shared list

- Back, title, **Share**; hero cover; author line.
- **Sorted by:** Proximity (toggle) + **Filter**.
- For each spot: image, badges (Must go, distance), heart/save, name, category, rating, **directions**; **Emma's recommendation** block; **Must-try dishes** chips.
- **Backend:** List read API, sort by user location, dish tags optional.

---

## 6. Social & profile

### `creator-profile.html` — User / creator profile

- Back, **Share**, overflow menu.
- Avatar (verified badge optional in UI), name, @handle, bio, **Instagram / TikTok / YouTube** links.
- Stats: Followers, Following, **NomNom Lists** count.
- **Follow** CTA.
- **My NomNom Lists** carousel + **New NomNom List**; heat strip on cards.
- Tabs: **Recent activity**, **Map view**, **Hidden Gems**.
- **Feed** of posts (e.g. Featured Reel cards).
- **Backend:** Profile, follow graph, list summaries, activity feed, verification flag.

### `edit-profile.html` — Edit profile

- Cancel / **Done**; **Change profile photo**; **Name**, **Username** (@), **Bio**; **Social links** (Instagram, TikTok, YouTube, Website); **Manage my mentions** shortcut; **Log out**.
- **Backend:** User profile update, avatar upload, unique username, social URL fields.

---

## 7. Creator content management

### `manage-content.html` — Content hub

- Tabs: **Mentions (n)**, **My lists (n)**.
- CTA card: **New NomNom List**.
- **Recent mentions** list: thumb, spot, source icon + type + recency, category tag, **views**; filter; star highlight on item.
- **FAB / bottom:** **Import from Instagram**.
- **Backend:** Mentions list API, view counts, Instagram import job (OAuth + media parsing).

### `edit-mention.html` — Single mention editor

- **Display media** + change photo; **Restaurant name** (link to place picker); **Source label** (Featured Reel, Story, Feed, TikTok, YouTube Short); **Category**; **Source link (URL)**; **Personal note**; **Publicly visible** toggle; **Delete this mention**; **Save**.
- **Backend:** Mention CRUD, media storage, moderation, visibility.

---

## 8. Settings & account

### `settings.html`

- **Account:** Personal information, Notifications, Privacy & security.
- **Content:** Manage mentions, Import history.
- **Support:** Help centre, About.
- **Log out** (destructive).
- **Backend:** Sub-screens or deep links; session revoke; notification prefs; privacy GDPR-style toggles as needed.

---

## 9. Cross-cutting product concepts (for API design)

| Concept | Where it appears | Implementation notes |
|--------|------------------|----------------------|
| **Spot / restaurant** | Feed, search, map, detail, lists | Stable ID, geo, price tier, categories, photos |
| **NomNom Meter / heat** | Cards, detail, roulette, saved | Score + percentile; aggregate from saves, views, circle activity |
| **Mention** | Feed, detail, manage, edit | Ties creator + spot + media + source type + note |
| **Vibe / occasion** | Home, search | Tags or enum; filter/search dimension |
| **NomNom List** | Profile, create, list detail, save modal | Public/private, ordered spots, cover |
| **Favourites** | Save modal | Default list or flag |
| **NomNom Circle / following** | Roulette, detail, map | Graph for “recommended by people you follow” |
| **NomNom Pro / Creator tier** | Web discovery, creator portal | Subscription or application workflow |

---

## 10. File index

| File | Suggested app route (example) |
|------|-------------------------------|
| `landing-page.html` | `/` |
| `creator-portal.html` | `/creators` |
| `city-landing.html` | `/c/[slug]` |
| `support-center.html` | `/help` |
| `auth.html` | `/login` |
| `onboarding-*.html` | `/onboarding/...` |
| `home.html` | `/app` or `/discover` |
| `search-explore.html` | `/search` |
| `search-result.html` | `/search?q=` |
| `web-discovery.html` | `/app` (desktop layout) |
| `map-view.html` | `/map` |
| `restaurant-detail.html` | `/places/[id]` |
| `nom-roulette.html` | `/roulette` |
| `roulette-result.html` | `/roulette/result` |
| `saved-content.html` | `/saved` |
| `save-to-list.html` | modal |
| `create-guide.html` | `/lists/new` |
| `guide-detail.html` | `/lists/[id]` |
| `creator-profile.html` | `/u/[username]` |
| `edit-profile.html` | `/dashboard/settings/profile/edit` |
| `manage-content.html` | `/creator/content` |
| `edit-mention.html` | `/creator/mentions/[id]` |
| `settings.html` | `/settings` |

---

## 11. Assets

- `export-html/icons/` — SVG icons (many mirrored by Iconify in HTML).
- Remote images reference Supabase storage URLs in prototypes; replace with your CDN/bucket in production.

---

*Generated from static HTML exports for implementation planning. Update this doc when prototypes change. Copy must match [BRAND.md](../BRAND.md) — brand name `NomNom` (one word), branded features `NomNom Roulette / Circle / Meter / List`, verb form `Nom Nom`, British English, sentence case headings.*
