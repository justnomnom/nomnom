# Distribution Channel Analysis: NomNom, Lisbon, near-zero budget

**Agent:** D1 — Distribution Channel Deep-Dive
**Date:** 26 July 2026

---

## Executive framing (read this before the rankings)

Zesty died with DoorDash's balance sheet behind it. The lesson is not "discovery apps are bad" — it is that **a discovery app cannot buy its way into a habit loop that already lives inside Google Maps, Instagram and TikTok.** The only durable strategy for a solo founder in Lisbon is to *stop trying to replace those surfaces and instead park NomNom content inside them*, then convert the tail of that attention onto auth-free web pages that need no install.

That single strategic pivot changes which channels matter. NomNom's public, auth-free `/lists/:id` and `/u/:handle` pages are not a nice-to-have — **they are the entire distribution thesis.** Beli and Mapstr are app-walled, so they cannot be shared into a WhatsApp group, a Reddit comment, or an Instagram bio and have the recipient actually *see* something. NomNom can. Every channel below is ranked by how well it exploits that asset.

Three hard constraints shape every recommendation:

1. **Near-zero budget.** Anything requiring >€300/month sustained is Tier 3 or "avoid".
2. **One person.** A channel needing >10 hours/week indefinitely is not viable alongside product work.
3. **Portugal is small.** Lisbon metro is ~2.9M people. The 24–34 urban diner segment is perhaps 250k–400k people. This is a market you can saturate with content — but it also means paid channels hit frequency caps fast and the total prize is modest.

---

## Channel Ranking

### Tier 1 — high impact, low cost

---

#### 1.1 Creator-distributed public lists (supply-side seeding)

**Why it works here:** This is the only channel that solves supply and demand in one motion, and it is the only one where NomNom's auth-free pages produce a structural advantage over Beli and Mapstr. A Portuguese food micro-creator with 20k followers has an Instagram bio link and Stories. Today that link goes to a Linktree or nowhere. If it goes to `nomnom.pt/u/theirhandle` — a real, viewable, branded page listing every restaurant they have ever recommended — the creator gets a permanent, indexable home for content that currently evaporates into the feed, and NomNom gets their audience arriving on a page that already has content on it.

The creator does not need to persuade anyone to install anything. That removes the single biggest ask in creator partnerships.

**Estimated reach:** Portugal has ~6.35M Instagram users (Meta ad tools via DataReportal, late 2025) and ~4.11M TikTok users 18+. The Lisbon food micro-creator pool in the 3k–150k band is realistically **150–400 accounts**. Recruiting 30 of them at an average 15k followers with a conservative 2% link-through on a bio/Story mention gives ~9,000 page visits per activation wave.

**Estimated CAC:** €0 cash if you trade value-in-kind (a permanent profile page, a "verified creator" badge, analytics on their list views, cross-promotion). This is the critical structural point: you are not buying a post, you are giving them a free product. **Derived cost: ~€0 cash, ~2 hours of founder time per creator recruited** (research, personalised DM, manual profile pre-build, onboarding call). At 30 creators that is ~60 hours spread over 8 weeks.

For reference on what you are *avoiding* paying: a Portuguese micro-creator (10k–50k) charges **€250–€1,000 per static post and €500–€2,500 per sponsored Reel** (shelf.pt, Tier 3, 2026), with a corroborating Portugal-adjusted estimate of ~€400/post for a 50k account after the 20–30% Southern Europe discount (simula.pt, Tier 3, 2025–26). Paying for 30 posts would cost €7,500–€30,000. You cannot afford this. You must trade product, not cash.

**Time to first result:** 2–3 weeks to first creator live. 6–8 weeks to a visible cohort.

**HOW TO START:**
1. Build a list of 150 Lisbon food creators, 3k–150k followers. Sources: Instagram hashtags `#comerlisboa`, `#restauranteslisboa`, `#lisboafood`, `#tascaslisboa`, `#ondecomerlisboa`; TikTok same terms; the "following" lists of the 5 biggest Portuguese food accounts.
2. **Pre-build their profile before you contact them.** Scrape their last 30 posts for restaurant mentions, hand-build `/u/theirhandle` with 20–30 places already on it. This is the "show, don't tell" pattern that took a restaurant-SaaS founder's conversion from 2% to 18% (dev.to case study, Tier 3, 2026) and the same founder who cold-called 150 restaurants and failed abandoned calling entirely for exactly this move (Medium, Tier 3, April 2026).
3. Send one DM: *"Fiz-te isto. Não tens de fazer nada. Se gostares, é teu — e podes editar."* Link. No pitch, no ask.
4. Track: DM sent → page viewed → claimed → shared. Expect 15–25% claim rate on a pre-built page vs 1–3% on a cold pitch.

**Verdict: START HERE. Highest leverage available. This is the channel that either works or the business does not have a distribution answer.**

---

#### 1.2 Auth-free / shareable public list links (the real viral loop)

**Why it works here:** Portugal is a WhatsApp-first country for group coordination (channel fact — ~90% penetration). The actual moment of restaurant discovery for a 24–34 Lisbon diner is *"onde vamos jantar?"* in a group chat. Today the answer is a Google Maps pin or a screenshotted Instagram post. A NomNom public list link renders a preview, opens instantly with no login, and every person in that group sees it. This is the single highest-intent distribution surface in the market and it costs nothing.

Beli and Mapstr structurally cannot compete here — their links dead-end at an app-store wall.

**Estimated reach:** Uncapped, but entirely dependent on product mechanics, not marketing spend.

**Estimated CAC:** €0 marginal. Cost is engineering time.

**Time to first result:** Immediate once share mechanics are right; compounding over months.

**HOW TO START:**
1. Audit the share flow ruthlessly. Every list must have a one-tap "Partilhar" producing a link-preview-optimised public URL with a rich OG image showing the list name, place count, and 3–4 restaurant photos.
2. Generate the OG preview image **with the Remotion pipeline** — you already have programmatic rendering. A dynamic OG card per list is a near-free win and dramatically lifts click-through on shared links.
3. Add a "decidir em grupo" mechanic: a shared list where group members can vote/veto. This makes the *recipient* need the link, not just the sender. Group-coordination utility is the strongest organic loop available to a local app.
4. Instrument: shares sent, link opens, opens→signups, opens per share. Target >1.5 opens per share.

**Verdict: BUILD THIS BEFORE SPENDING ON ANYTHING. A paid channel feeding a product with no share loop is money set on fire.**

---

#### 1.3 The `/roleta/lisboa` free tool as a link and attention magnet

**Why it works here:** "Onde vamos comer?" indecision is a genuine, high-frequency, emotionally-charged problem with a fun, shareable solution. A roulette picker is: (a) instantly understandable, (b) screenshot- and video-friendly, (c) linkable by journalists and bloggers who will never link to your app, and (d) usable with no account — so the barrier to trying it is zero.

Critically, this is also the **only realistic way to acquire Portuguese backlinks quickly.** No Portuguese outlet will write "a new restaurant app launched." Several will write "há um site que escolhe o restaurante por ti quando ninguém decide." That is a story; the app is not.

**Estimated reach:** Modest but compounding. A single NiT or Time Out Lisboa pickup is realistically 3,000–15,000 sessions over a week, plus a permanent high-authority backlink. DATA GAP: no verified referral-traffic figures for Portuguese lifestyle-media pickups.

**Estimated CAC:** €0 cash. ~15–25 hours to expand the tool and run the pitch cycle.

**Time to first result:** 3–6 weeks (media cycles are slow; expect several ignored pitches).

**HOW TO START:**
1. Expand the roulette with filters that create shareable specificity: bairro, budget, cuisine, "aberto agora", "para 2 / para grupo". Each filter combination is a genuinely distinct user need — which matters for the SEO question below.
2. Add a share-result card (Remotion-rendered) so results circulate as images, not just links.
3. Pitch angle to media: *not* "new app". Pitch **"o site que resolve a discussão de onde jantar em Lisboa"** — a free tool, no signup, made in Portugal. Send to `geral@nit.pt` plus the NiT food/"fora de casa" editors directly (`izapincelli@nit.pt`, `pedrocastro@nit.pt`), Time Out Lisboa's food desk, `leitor@observador.pt`, and `comunidade@shifter.pt` (Shifter is explicitly tech-and-society focused and the most likely to cover a solo Portuguese builder).
4. Include a working link, one screenshot, three sentences, and no PDF attachment.

**Verdict: HIGH PRIORITY. Cheapest credible route to both backlinks and press. The tool is more pitchable than the product.**

---

#### 1.4 Reddit — r/lisboa and r/portugal, played as a resident not a marketer

**Why it works here:** Restaurant recommendation threads are constant in r/lisboa and r/portugal (r/portugal has a `Gastronomia / Food` flair and threads like *"Lisboa: melhor sushi para takeaway para date night em casa?"* are routine). These threads rank on Google for years and are increasingly cited by AI answer engines. A NomNom list link answers the question *better than a comment can* — and works without an install.

But the constraint is severe: **r/lisboa's rules explicitly prohibit self-promotion.** Getting banned removes the channel permanently. This must be played as genuine participation with links as a by-product.

**Estimated reach:** r/portugal ~603k subscribers. A well-received comment in a live recommendation thread realistically gets 200–2,000 link clicks; a top-voted one considerably more. The compounding SEO value of the thread often exceeds the launch-day traffic.

**Estimated CAC:** €0 cash. 3–5 hours/week of genuine participation.

**Time to first result:** 3–4 weeks minimum (account warm-up is non-negotiable).

**HOW TO START:**
1. Weeks 1–3: **no links at all.** Comment genuinely in r/lisboa and r/portugal 3–5 times/day. Answer restaurant questions in plain text with real recommendations. Target 50+ comment karma per sub. Every source consulted converges on 2–3 weeks of warm-up and 30–50 karma as the minimum before any promotion (redship.io, okara.ai, growreddit — all Tier 3, 2026).
2. Weeks 4+: when someone asks "melhores tascas na Graça?", answer properly *in the comment* with 5 named places — then add *"tenho isto tudo numa lista aqui se ajudar"*. The value must survive with the link removed.
3. Never drop a bare link. Never post a launch thread in r/lisboa.
4. For an actual launch post, use r/SideProject or r/InternetIsBeautiful (both explicitly launch-tolerant) — but understand those audiences are global and will not convert into Lisbon diners. Treat them as feedback and backlinks, not acquisition.
5. Message r/lisboa mods first with a two-line "I built a free Lisbon restaurant tool, is this OK to share?" Asking converts more often than people expect and costs nothing.

**Verdict: YES, but slowly and honestly. One ban costs more than the channel yields in a year.**

---

### Tier 2 — medium impact / medium cost

---

#### 2.1 Short-form video at volume via the Remotion pipeline

Detailed treatment in its own section below. Summary: **medium-high potential, high uncertainty, meaningful time cost.** Verdict: run as a disciplined 6-week experiment with a kill criterion, not as an open-ended commitment.

- **Estimated CAC:** €0 cash; 6–10 hours/week. If a 6-week test yields 200 signups for 50 hours, that is effectively **€0 cash / ~15 min founder time per signup** — good if it compounds, poor if it plateaus.
- **Time to first result:** 4–8 weeks. Algorithmic traction on a new account is slow and non-linear.

#### 2.2 Portuguese long-tail SEO (neighbourhood × cuisine × occasion)

Detailed treatment below. Summary: **real opportunity on the long tail, hopeless on the head terms.**

- **Estimated CAC:** €0 cash; 40–80 hours of content work over 6 months.
- **Time to first result:** 4–6 months for first meaningful long-tail rankings. **12–18 months** before it is a primary channel — if ever.
- **Verdict:** Do it as a compounding background investment. Never depend on it for the first year.

#### 2.3 Local media and newsletters

- **Why it works:** NiT reports ~6.2M monthly visits and Time Out Lisboa ~697k monthly visits with 72% of traffic from search (Tier 3 traffic estimators — treat as directional). Both cover Lisbon food obsessively and both cover novelty. Portuguese lifestyle media do cover small local products, but they cover *things readers can use*, not funding-free startups.
- **Estimated reach:** One NiT pickup ≈ 3k–15k sessions (estimated, DATA GAP).
- **Estimated CAC:** €0 cash; ~10 hours per pitch cycle.
- **Time to first result:** 3–8 weeks, low hit rate.
- **HOW TO START:** Pitch the roulette tool (1.3), not the app. Pitch a *data story* second: you will have aggregate data on what Lisbon actually saves and shares — "os bairros onde os lisboetas mais guardam restaurantes" is a story NiT will run and you are the only source for it.
- **Verdict:** Worth 10 hours/quarter. Not a channel you can schedule or rely on.

#### 2.4 Google Maps list importer as a switching wedge

- **Why it works:** Your target user *already has* 50–200 saved places rotting in Google Maps. The importer converts a cold signup into a populated, immediately-valuable account in one step, which is the single biggest determinant of activation for a list product. This is not an acquisition channel by itself — it is the **conversion multiplier that makes every other channel work.** Marketed correctly ("traz os teus guardados do Google Maps"), it is also a sharp, differentiated ad hook and Reddit-comment hook.
- **Estimated CAC:** N/A — improves the CAC of every other channel.
- **Verdict:** Feature the importer prominently in all messaging. Under-marketing this asset would be a mistake.

#### 2.5 Meta paid ads — small, tightly-geofenced retargeting only

- **Why it works:** Portugal is genuinely cheap by EU standards (figures in the benchmark table below). But cold paid acquisition into a free consumer app with no revenue is how you burn a budget you do not have.
- **Recommended use:** €5–10/day retargeting people who visited a list page or the roulette but did not sign up. Warm audiences, low CPM, no learning-phase problem at small scale.
- **Estimated CAC:** Derived below — **€3–€8 per web signup** on warm traffic, higher for app installs.
- **Verdict:** Only after the share loop and creator channel are working. Paid amplifies a working loop; it does not create one.

---

### Tier 3 — long-term bets

#### 3.1 University and Erasmus channels
ULisboa alone has 51,590 students and ~11,700 international students; Lisbon welcomes ~15,000 international students a year (Lisbon City Council). Beli's NYU-freshman-orientation adoption is the exact precedent. But: Erasmus students churn out in 6 months, skew low-spend, and the academic calendar means you get two entry points a year (September, February). **Verdict: high effort, seasonal, poor retention profile. Revisit at month 6, aim at September intake, partner with ESN Lisboa and Erasmus Life Lisboa rather than the universities.**

#### 3.2 Restaurant-side partnerships
Restaurants want foot traffic and will give you nothing until you have users. The cold-start is real. **Verdict: do not sell to restaurants in year one.** The one exception: let them *claim* a free profile page, which costs you nothing and quietly builds supply. See the partnership section.

#### 3.3 Porto expansion
Do not touch it until Lisbon shows a working loop. Splitting a solo founder's density-building across two cities is the classic way to have insufficient density in both.

#### 3.4 App Store Optimisation
Cheap and permanent, but Portuguese app-store search volume for restaurant discovery is small and Google Maps owns the category. **Verdict: spend 4 hours getting Portuguese keywords and screenshots right, then ignore it.**

---

### Channels to avoid, and why

| Channel | Why not |
|---|---|
| **Head-term Portuguese SEO** ("melhores restaurantes Lisboa", "onde comer em Lisboa") | Owned by Time Out Lisboa, TheFork (1,081 Lisbon restaurants listed), Michelin Guide, Tripadvisor, Lifecooler and a wall of established blogs. Time Out's Lisbon food pages rank on brand authority plus decades of links. Realistically **18–24 months and a content team** to compete. You have neither. |
| **Cold paid app-install campaigns** | You have no revenue and no proven retention. Even at Portugal's favourable Apple Search Ads median CPI of $1.01, an install is not an activated user. Spending here before the loop works is exactly the Zesty failure mode at small scale. |
| **TikTok Ads** | Platform minimums are $50/day at campaign level and $20/day at ad-group level, with credible sources converging that a *meaningful* test needs $300–500 over two weeks. That is your entire quarterly budget for one inconclusive test. **Organic TikTok yes; paid TikTok no.** |
| **Facebook group spam** | Lisbon food/expat Facebook groups are heavily moderated and saturated with promotion. Yield per post is low, ban risk is high, and the audience skews expat/tourist rather than your Portuguese 24–34 core. |
| **Product Hunt / global startup channels** | Wrong geography entirely. Produces vanity signups from people who will never eat in Alfama. Some backlink value; near-zero user value. |
| **Paying micro-creators cash for posts** | €250–€2,500 per post in Portugal. At near-zero budget this is arithmetic you cannot make work. Trade product access instead. |
| **Building for tourists** | Tourists have no retention, no repeat visits, and no network effect in your city. Tempting because Lisbon volume is high; strategically fatal. |

---

## Portuguese SEO opportunity

### Who owns the head terms, and how strong

| Domain | Position | Strength | Notes |
|---|---|---|---|
| **timeout.pt** | Dominant editorial | DA ~49 (Tier 3 estimator); ~697k monthly visits; **72% from search** | The "100 melhores restaurantes" list is an annual institution. Global brand authority. Unbeatable on head terms. |
| **nit.pt** | Highest volume | ~6.2M monthly visits (Tier 3 estimator) | Publishes restaurant content daily. Enormous freshness advantage. |
| **thefork.pt** | Transactional | Owned by TripAdvisor; 1,081 Lisbon restaurants | Owns booking intent and has structured-data depth you cannot match. |
| **guide.michelin.com** | Authority | Global | Owns "estrela Michelin" and fine-dining queries entirely. |
| **lifecooler.com** | Legacy directory | Ageing | **Visibly stale** — its homepage still surfaces "Os 20 restaurantes mais pesquisados em 2021". This is the one incumbent with an exploitable weakness. |
| **Tripadvisor** | Aggregator | Global | Owns tourist-intent long tail. |
| **ricavida.pt** and similar affiliate blogs | Content-farm tier | Weak | Already ranking for "onde comer em Lisboa" with generic content. **This is your actual competitive set on the long tail** — and they are beatable. |

**Blunt conclusion:** The head terms are gone. Do not model any traffic from them. The gap is that everything ranking is *editorial and static* — a list someone wrote once. Nobody owns **live, structured, user-generated neighbourhood data**, and Lifecooler shows what happens when a directory stops updating.

### 10 realistic long-tail keyword opportunities

**Volume estimation method (shown explicitly, because these are estimates not measurements):** SEOptimer (Tier 3) reports "restaurantes" at 823,000/mo nationally in Portugal. Head geo-modified terms typically fall 1–1.5 orders of magnitude below the bare category term; neighbourhood- and occasion-modified terms fall a further 1–2 orders. Lisbon metro is ~2.9M of Portugal's ~10.4M people, so Lisbon-specific terms carry roughly 25–35% of national intent for city-agnostic queries. Bands below are derived from that chain and are **estimates, not tool-verified figures. DATA GAP: no Ahrefs/Semrush access; all volumes require validation in Google Keyword Planner with a live €1/day campaign, which unlocks exact figures rather than ranges.**

| # | Keyword | Est. monthly volume (PT) | Est. difficulty | Why NomNom can win |
|---|---|---|---|---|
| 1 | `tascas em Lisboa` / `melhores tascas Lisboa` | 800–2,500 | Medium-high | Time Out and Lifecooler both rank but with stale lists. Live data + creator picks beats a 2021 article. |
| 2 | `brunch Lisboa` + bairro variants (`brunch Príncipe Real`, `brunch Alfama`) | 200–900 head, 30–150 per bairro | Low-medium | Google Trends shows brunch interest in Portugal rising from a near-zero base into 2026 (Tier 3). Emerging term, weak incumbents. |
| 3 | `jantar romântico Lisboa` | 300–1,200 | Medium | Occasion intent, strong commercial value, dominated by generic listicles. |
| 4 | `restaurantes Príncipe Real` | 200–700 | Low-medium | Neighbourhood pages are genuinely underserved in PT. |
| 5 | `onde comer no Cais do Sodré` | 100–400 | Low | Conversational phrasing that editorial sites under-target. |
| 6 | `restaurantes baratos Lisboa` / `comer barato em Lisboa` | 400–1,500 | Medium | High intent for the 24–34 segment specifically. |
| 7 | `restaurantes para grupos Lisboa` | 100–400 | Low | Group-occasion intent maps exactly to your sharing loop. |
| 8 | `restaurantes com esplanada Lisboa` | 300–1,200 (seasonal) | Medium | Strong Apr–Sep seasonality; Lifecooler ranks with an old page. |
| 9 | `melhores hambúrgueres Lisboa` / `melhor pizza Lisboa` (cuisine × city) | 200–800 each | Medium | Repeatable across ~15 cuisines — a legitimate content cluster. |
| 10 | `onde jantar hoje Lisboa` / `não sei onde comer Lisboa` | 50–300 | Very low | Almost nobody targets indecision phrasing. **This is the roulette tool's natural query and your single best keyword-to-product fit.** |

### Content-gap analysis

Four gaps, in order of exploitability:

1. **Freshness.** Every incumbent publishes an annual list. Nobody publishes "abriu esta semana em Arroios" continuously. A weekly-updated openings page is genuinely useful and structurally hard for annual-listicle publishers to match.
2. **Neighbourhood granularity.** Editorial covers Lisbon, Chiado, Bairro Alto, Alfama, Belém. Nobody properly covers Arroios, Graça, Anjos, Penha de França, Marvila, Beato, Campo de Ourique, Alvalade — which is exactly where the 24–34 cohort actually eats.
3. **Occasion intent.** "Jantar de aniversário para 8 pessoas em Lisboa", "primeiro encontro", "almoço de trabalho perto do Saldanha". High intent, near-zero coverage.
4. **Person-attributed recommendations.** Every incumbent recommendation is anonymous or institutional. Yours are attributed to a named creator with a face. That is a differentiated content type, not just a differentiated product.

### AI Overviews impact — and an important source conflict

**The sources disagree sharply and you should not plan as though this is settled.**

- cloro.dev (Tier 3, 2026) tested 200 dining-intent prompts and found AI Overviews triggered on **~3%** (0% in an earlier run), arguing Google deliberately defers to the local pack for dining.
- quickfeedback.ai (Tier 3, 2026) reports **7.9% of local searches** trigger an AIO — the lowest of any category.
- openlens.com, citing **BrightEdge** (Tier 2 source cited by a Tier 3 blog, February 2026), reports restaurants going from a **10% AIO trigger rate in early 2025 to 78% by February 2026** — the fastest-growing vertical they track.

These cannot all be true simultaneously. The most plausible reconciliation: **navigational and "restaurant near me" queries still resolve to the local pack (low AIO), while informational/comparison queries — "melhores X em Y", "onde comer em Z" — are rapidly becoming AIO-saturated.** openlens explicitly notes this split, and BrightEdge's methodology likely weights discovery-style prompts. Whitespark's Q2 2025 data cited in the same piece supports it: AIOs on 15% of pure "service+location" queries but **92% of informational** and **97% of hybrid local** prompts.

Where the sources *do* agree, and where it hurts: when an AIO appears, CTR collapses. Seer Interactive measured organic CTR falling **61%** (1.76% → 0.61%) on AIO queries (late 2025); Ahrefs measured **58%** for the top organic result (through December 2025); zero-click rate on local queries is reported at **69–72%**.

**What this means for NomNom, stated plainly:** the exact keywords you would target — "melhores tascas Lisboa", "onde comer em Alfama" — are *precisely* the informational/comparison pattern most exposed to AI Overview cannibalisation. **An SEO-led strategy is being structurally devalued in real time.** Plan for SEO to deliver perhaps half the clicks an equivalent ranking would have delivered in 2023.

The defensive move: Google confirmed on 15 May 2026 that spam policies now apply to AI Overviews and AI Mode (Search Engine Land, Tier 2). Citation in AI answers now depends on the same signals as ranking — original data, entity authority, real local expertise. **NomNom's structural advantage is that it will hold genuinely original data (real user saves, real creator attributions) that no LLM can synthesise from existing text.** That is the only durable SEO asset here.

### Honest timeline to traction

- **Months 1–3:** Effectively zero. New domain, no authority.
- **Months 4–6:** First long-tail rankings on the weakest terms (#5, #7, #10 above). Perhaps 200–800 organic sessions/month.
- **Months 7–12:** Neighbourhood cluster maturing if you have published consistently. 1,500–5,000 sessions/month is a realistic good outcome.
- **Months 12–18:** Competitive on mid-tail neighbourhood and occasion terms. Still not competitive with Time Out on head terms.
- **Head terms:** **18–24 months minimum, and probably never.** Say this out loud in planning.

**Verdict: SEO is a compounding background asset, not a launch channel. Budget 4–6 hours/week, expect nothing for 4 months, and never let it displace the creator channel.**

---

## Programmatic / free-tool angle

### The `/roleta/lisboa` free-tool play — assessment: **strong, and underrated**

This is a genuinely good asset and probably under-exploited. Reasoning:

1. **It is the only thing you have that a journalist will write about.** "New restaurant app" is not a story in Portugal in 2026. "Free site that decides where you eat" is.
2. **It matches an untargeted keyword cluster** (`não sei onde comer Lisboa`, `onde jantar hoje`) with near-zero competition.
3. **It requires no account**, so it converts cold traffic into a product experience rather than a signup wall.
4. **It is intrinsically shareable** — the output is a screenshot-able result, which is how things actually spread in WhatsApp.
5. **It generates the backlinks that everything else in SEO depends on.** Free tools are the most reliable link-acquisition mechanism available to a site with no domain authority, and this one is locally relevant enough for Portuguese sites to link naturally.

**Expansion recommendations, in priority order:**
- `/roleta/lisboa/[bairro]` for 12–15 real Lisbon neighbourhoods — each with genuinely different restaurant sets (this is legitimate differentiation, see below).
- Filters: budget, cuisine, open-now, group size.
- Remotion-rendered share cards for results.
- A `/roleta/porto` when Porto is real — not before.

### Programmatic location pages in a post-spam-update Google

**This is where you can destroy the project, so be precise.**

Google's scaled-content-abuse policy targets "many pages generated for the primary purpose of manipulating search rankings and not helping users" — explicitly regardless of whether they are AI-generated or human-written (Google Search Central, Tier 1). The March 2026 core update reportedly drove **50–90% traffic drops within two weeks** for sites publishing template-driven pages without editorial value, and location landing pages generated from a single template are named as one of the worst-performing patterns (seoalgorithmrecovery.com, Tier 3, 2026). Google's 15 May 2026 update extends the same policies to AI Overviews and AI Mode (Tier 1/Tier 2).

**But the same sources are consistent that programmatic SEO is not itself the target.** Directories with verified listings, comparison tools with live data, and travel platforms with real inventory "continued to rank normally through the update". The stated test is: *does this page answer a distinct user query that no other page on my site already answers, and does it contain information a user cannot find on another page in the cluster?*

**Applied to NomNom:**

| Page pattern | Safe? | Why |
|---|---|---|
| `/lisboa/[bairro]` with real restaurants, real user saves, real creator attributions | ✅ **Safe** | Genuinely distinct data per page. This is the "verified local data" case Google tolerates. |
| `/roleta/lisboa/[bairro]` with different underlying restaurant sets | ✅ **Safe** | It is a tool with distinct inputs and outputs, not a content page. |
| `/lisboa/[bairro]/[cuisine]` — ~15 bairros × 20 cuisines = 300 pages | ⚠️ **Conditional** | Safe **only** where you actually have ≥5 real restaurants with real data. Generate nothing for empty combinations. |
| `/lisboa/[bairro]/[cuisine]/[occasion]` — thousands of permutations | ❌ **Dangerous** | Textbook keyword-permutation abuse. Do not build this. |
| AI-written descriptive intros templated across pages | ❌ **Dangerous** | Exactly the named failure pattern. |

**Hard rules for NomNom:**
1. **No page ships without ≥5 real restaurants with real data.** Enforce this as a build-time check, not a guideline.
2. Every page must contain something no other page contains: the actual restaurant list, actual save counts, actual creator attributions.
3. `noindex` thin pages automatically until they cross the data threshold. This is the single most important safeguard.
4. Cap the initial build at **~50–80 pages**, not thousands. Grow the page count with the data, never ahead of it.
5. Build internal hub pages so the cluster is discoverable and does not look orphaned.

**Verdict: programmatic location pages are viable here specifically because you will have real proprietary data. The moment you generate pages faster than you acquire data, you have crossed into the penalised pattern.**

---

## Short-form video at volume

### The realistic play

The Remotion pipeline means marginal cost per video approaches zero once templates exist. That is a genuine, unusual advantage — but it changes the *cost* of video, not the *quality bar*, and platforms rank on watch-time, not volume. **Programmatic video that looks programmatic will underperform, at any volume.**

The formats that plausibly work:

1. **"Top 5 tascas em [bairro]"** — programmatically generated from real list data, one per neighbourhood. ~15 videos from one template. Restaurant photos, name cards, motion, trending Portuguese audio. Genuinely useful; genuinely automatable.
2. **Creator list trailers** — a 15-second animated version of each creator's NomNom list, delivered to *them* to post. This is the highest-leverage use of the pipeline by a wide margin: it makes the creator recruitment pitch tangible ("here's a video of your list, it's yours") and turns their audience into your distribution. **Do this one first.**
3. **"Roleta escolheu…"** — screen-capture-style videos of the roulette landing on a restaurant. Cheap, on-brand, and drives the tool.
4. **Weekly openings** — "abriu esta semana em Lisboa". Genuinely fresh, repeatable, and the one format where consistency compounds.

### What it costs in time

| Activity | One-off | Recurring |
|---|---|---|
| Build 3–4 Remotion templates | 12–20 hours | — |
| Source photography/rights per video | — | 10–20 min |
| Caption, hashtags, audio selection, upload (PT + EN) | — | 15–25 min |
| Comment engagement (mandatory for reach) | — | 3–5 hours/week |
| **Realistic sustained load** | ~20 hours setup | **6–10 hours/week for 5–8 videos/week** |

**Honest assessment:** the pipeline removes the rendering cost but not the *creative* cost. Audio selection, hook writing, and comment engagement remain manual and are the actual determinants of reach. Anyone claiming a Remotion pipeline makes short-form video free is wrong.

**Saturation:** Lisbon food content on Instagram and TikTok is **highly saturated** with established creators who have years of audience compounding. A new brand account starting from zero is at a severe disadvantage. **This is precisely why format #2 — putting videos into existing creators' hands — dominates the other three.** Distribute through accounts that already have the audience rather than building one from scratch.

**Time to first result:** 4–8 weeks, highly variable.

**Kill criterion — set it now:** if after 6 weeks and ~40 videos on your own accounts you have under 5,000 cumulative views and under 50 signups attributed, stop posting to your own accounts and redirect 100% of the pipeline to creator-delivered assets.

**Verdict: use the pipeline primarily as a creator-recruitment and creator-enablement weapon, secondarily as an owned-channel play. The owned-channel play is a real but unreliable bet against a saturated field.**

---

## Community channels

| Community | Name | Size | Self-promo rules | Realistic yield | Risk of ban |
|---|---|---|---|---|---|
| Reddit | r/portugal | ~603k subscribers | No blanket ban documented; has a `Gastronomia / Food` flair; sitewide spam rules apply; mods enforce participation ratios | **Medium-high** — 200–2,000 clicks per well-received comment in a live thread; compounds via Google | **Medium** — manageable with 3-week warm-up and value-first comments |
| Reddit | r/lisboa | DATA GAP: subscriber count not verified; substantially smaller than r/portugal | **Self-promotion explicitly prohibited** | **High per-post relevance, low volume** — the most on-target audience anywhere | **HIGH** — the explicit rule makes this the easiest channel to lose. Modmail first. |
| Reddit | r/PORTUGALCARALHO | DATA GAP: not verified | Humour-focused; has had closures and moderation instability | **Low** — wrong register for a product | **High** — humour subs punish earnestness brutally |
| Reddit | r/SideProject, r/InternetIsBeautiful | Global, large | Launch-friendly with substance requirements | **Low for users, medium for backlinks** — wrong geography | **Low** |
| Meetup | Lisbon Supper Club | 3,867 members | Organiser-run; partnership possible | **Medium** — small but perfectly targeted; partner rather than post | **Low** |
| Meetup | Lisbon Foodie Club | 847 members | Organiser-run | **Low-medium** | **Low** |
| Meetup | Foodie With Me LX / Lisbon Culinary Circle | 263 / 205 members | Organiser-run | **Low** — too small to move numbers | **Low** |
| Facebook | Lisbon expat and foodie groups (multiple; "Expats in Lisbon", "Expat Community Portugal", etc.) | DATA GAP: sizes not verified | Heavily moderated, most ban promotion | **Low** — saturated, and expat-skewed away from your core segment | **High** |
| Discord | Portuguese food-specific servers | DATA GAP: none of significant size identified | — | **Unknown, likely low** | — |
| WhatsApp | Neighbourhood and friend groups | Uncapped | N/A — this is peer sharing, not posting | **HIGHEST** — see channel 1.2 | **None** |

**Two conclusions from this table.** First, the formal communities are all *small* — the largest genuinely on-target community found is under 4,000 members. Nobody is going to be acquired at scale here. Second, **the real community channel in Portugal is the private WhatsApp group, which you cannot post into — you can only build a product worth forwarding.** That reinforces channel 1.2 as the priority.

---

## Paid acquisition benchmarks (Portugal)

| Platform | CPM | CPC | CPI | Source | Tier | Date |
|---|---|---|---|---|---|---|
| Meta (PT) | €3–€8 | €0.15–€0.80 | — | agenciazum.com | 3 | 2025 |
| Meta (PT) | €3–€15 (awareness €3–6; traffic €5–10; conversion €8–15; remarketing €4–8) | €0.10–€2.00 (FB €0.15–0.50; IG €0.20–0.60 typical) | — | portugalseo.pt | 3 | 2026 |
| Meta (PT) | $6.10 (range $5.00–$7.50) | $0.90 | — | adamigo.ai | 3 | 2026 |
| Meta (PT) | €3–€7 awareness; €8–€20 conversion | €0.10–€0.60 well-segmented | — | payoffmarketing.pt / fa-marketing.com | 3 | 2025–26 |
| Meta (PT, restauração/eventos vertical) | — | — | CPL €4–€14 | payoffmarketing.pt | 3 | 2025–26 |
| **Meta (PT) — OUTLIER** | **€8–€15** | — | — | kairosshop.pt | 3 | 2026 |
| TikTok (PT) | €2–€5 | — | — | kairosshop.pt | 3 | 2026 |
| TikTok (global) | $4–$13 (median ~$8.50) | $0.30–$1.50 | — | admanage.ai (aggregating WordStream, Lebesgue, WebFX, Triple Whale) | 3 (aggregating Tier 2) | 2026 |
| TikTok (Western Europe) | ~$8–$12 | ~€1.00 | — | businessadsguide.com / trackbee.io | 3 | 2026 |
| TikTok minimums | — | — | — | **$50/day campaign, $20/day ad group** | **1 (TikTok official docs, via admanage.ai)** | 2026 |
| **Apple Search Ads (Portugal)** | — | — | **$1.01 median CPI** | **Apptweak** | **2** | 2026 |
| Apple Search Ads (Spain, comparison) | — | — | $1.43 | Apptweak | 2 | 2026 |
| Apple Search Ads (global median) | — | — | $1.80 | Apptweak | 2 | 2026 |
| Google App Campaigns (global avg) | — | — | $1.29 | launchshots.app | 3 | 2026 |
| Google App Campaigns vs Meta | — | — | 15–30% cheaper than Meta | admiral.media | 3 | 2026 |
| Tier-2 Europe multiplier vs Tier-1 English | — | — | 0.4×–0.6× | ad-stack.ai | 3 | 2026 |

### Cross-referencing and disagreements

**Meta CPM in Portugal — four of five sources agree, one is an outlier.** agenciazum (€3–8), portugalseo (€3–15 by objective), payoffmarketing (€3–7 awareness), and adamigo ($6.10 ≈ €5.6) all cluster around **€5–8 for awareness/traffic objectives.** kairosshop.pt claims €8–15 — but it is a dropshipping agency selling TikTok ad accounts and has a direct commercial incentive to make Meta look expensive. **Discount the outlier. Plan on €5–8 CPM, €0.25–0.50 CPC.**

**TikTok CPM in Portugal is the weakest figure in this table.** The only Portugal-specific number (€2–5) comes from that same conflicted source. Western Europe aggregate benchmarks suggest $8–12. **DATA GAP: no reliable Portugal-specific TikTok CPM. Do not plan against €2–5.**

**Apple Search Ads Portugal CPI of $1.01 is the single most trustworthy number here** — Apptweak is an ASO analytics platform reporting from its own aggregated campaign data, making it Tier 2, and it is internally consistent (Portugal below Spain at $1.43, both far below the US at $4.06, matching the Tier-2-Europe multiplier logic from an independent source).

### Derived CAC — reasoning chain shown

**Scenario A — Meta traffic → web signup (no install required):**
- CPC €0.35 (midpoint of well-segmented PT range, cross-verified across three sources)
- Landing→signup conversion for a free consumer product with an auth-free preview: **assume 8–12%.** *This is an assumption, not a measurement — it is the weakest link in the chain and must be replaced with your own data as soon as you have any.*
- €0.35 ÷ 0.10 = **€3.50 per web signup**
- Range across the CPC band and conversion band: **€1.50–€7.50**

**Scenario B — Meta → app install:**
- Same €0.35 CPC, install conversion realistically 4–6%
- €0.35 ÷ 0.05 = **€7.00 per install**
- Sense-check: this sits above Apple Search Ads' Portugal CPI of $1.01 (~€0.93), which is expected — ASA captures existing search intent while Meta creates it.

**Scenario C — Apple Search Ads:**
- **~€0.95 per install** (Apptweak median, Tier 2)
- But: install ≠ activated user. At a generous 40% activation, effective **CAC ≈ €2.40 per activated user.** ASA is only viable if there is meaningful App Store search volume for restaurant terms in Portuguese — **DATA GAP: unverified, and probably small.**

**Scenario D — creator channel (recommended):**
- €0 cash, ~2 hours founder time per creator
- If one creator with 15k followers delivers 150 signups, that is **~48 seconds of founder time per signup at zero cash cost.** No paid channel comes close.

### Minimum viable budget

| Budget | What it buys | Recommendation |
|---|---|---|
| **€0/month** | Creator outreach, Reddit, share loop, SEO, organic video | **This is the correct budget for months 1–3.** Everything Tier 1 is free. |
| €100–150/month | €3–5/day Meta retargeting on warm audiences only | Only after the share loop is instrumented and working |
| €250–400/month | Meta's own floor for a functional local campaign; Portuguese agency consensus is €200–400/month minimum for local businesses, €5/day absolute floor for the algorithm to learn | The realistic entry point for *any* meaningful paid test |
| €500+/month | The floor for a credible TikTok test ($300–500 over two weeks) | **Not justifiable at this stage** |

**Verdict: spend €0 on paid acquisition for the first 90 days.** Nothing in the benchmark data suggests paid changes the outcome for a product whose organic loop is unproven — and the Zesty precedent is that paid spend does not fix a distribution problem.

---

## Partnership opportunities

| Partner type | What they get | What we get | How to approach | Priority |
|---|---|---|---|---|
| **Food micro-creators (3k–150k)** | A permanent, public, SEO-indexed home for recommendations that currently vanish; a bio link better than Linktree; view analytics; a Remotion-rendered list trailer; early "founding creator" status | Content, credibility, and their audience — the entire supply side | Pre-build their profile, DM the finished thing, ask for nothing | **1 — critical** |
| **Restaurants (claim-only)** | A free, live public page; visibility to a young local audience; zero effort required | Supply-side legitimacy, restaurant-side sharing, occasional owner-driven traffic | Send them their existing page ("já está feita, é tua se quiseres") via **WhatsApp, not email** — this is the documented pattern that beats cold calling for local businesses | **2 — but claim-only, no selling** |
| **Supper clubs / food Meetups** (Lisbon Supper Club, 3,867 members; Lisbon Foodie Club, 847) | A free tool for members; a co-branded list of the group's visited restaurants | Small but perfectly-targeted users; real-world word of mouth | Contact the organiser directly, offer to build the group's list for free | **3** |
| **Local media (NiT, Time Out, Observador, Shifter)** | A genuinely novel free tool; later, exclusive aggregate data on Lisbon dining behaviour | Backlinks, credibility, traffic spikes | Pitch the roulette, not the app. Named editors, three sentences, working link | **3** |
| **Coworking spaces** | A curated "onde almoçar perto daqui" list for members, branded to the space | Dense, repeat-visit lunch users in a tight geography | Offer a free neighbourhood lunch list per location; they will share it in their member Slack | **4 — cheap, low ceiling** |
| **Universities / ESN Lisboa / Erasmus Life Lisboa** | A genuine integration aid for ~15,000 international students a year | Volume, but with severe churn and low spend | Via ESN Lisboa and ELL, not university administration. September intake only | **5 — seasonal, revisit month 6** |
| **Tourism boards / hotel concierges** | Local-authenticity content | Tourists — no retention, no network effect | — | **AVOID in year one** |
| **Food markets (Time Out Market, Mercado de Campo de Ourique)** | — | High footfall but wrong context; people there have already decided where to eat | — | **AVOID — poor intent match** |

**The cold-start warning, stated plainly:** this is a multi-sided marketplace and the standard failure is trying to sell all sides at once. The documented pattern for platforms like this is to seed a curated creator cohort *first*, let restaurants follow the creators, and let users follow the content. **Sequence: creators → content → users → restaurants.** Do not invert it. Restaurant partnerships in month 1 are wasted effort.

---

## Virality & referral mechanics

### What actually works in 2026

**Beli is the directly relevant precedent, and its numbers are remarkable: ~80% of users joined via referral** (confirmed by co-founder Judith Thelen in press interviews, Tier 2). It reached 58–75M ratings — surpassing Yelp over a comparable period — with a **team of five**. That is the existence proof that a restaurant-discovery app can grow essentially without paid acquisition.

What Beli actually did, in order of importance:

1. **Referrals unlocked real utility, not points.** Inviting a friend unlocked *actual features* — dish search, average restaurant scores, stealth mode — one feature per successful invite. This is categorically stronger than a discount, because the reward is inseparable from the product's core value.
2. **Invite-only with a waitlist thousands deep**, creating scarcity, quality control, and built-in PR simultaneously.
3. **Geographic clustering** — city by city (Boston, NYC, Nantucket, LA), building density before breadth. This is exactly the Lisbon-then-Porto discipline.
4. **Gamification tied to identity** — streaks, leaderboards, profile stats. Users displayed Beli stats on dating profiles. The app became a signal about *who you are*, not just a utility.
5. **Onboarding curated by dining activity and geography**, ensuring new users already cared about food culture.

The broader 2026 evidence is consistent: for **free consumer apps**, access- and feature-based rewards outperform monetary ones; referral prompts should fire *after* a value moment (first list created, first successful share), never at signup; and products using referral mechanics grow waitlists 3–5× faster than organic-only.

### Is invite-only scarcity still viable in 2026?

**Qualified yes — but the conditions are much narrower than in 2021, and NomNom mostly fails them.**

Scarcity works when the product is *visibly* better with more of your friends on it and when there is existing social proof creating FOMO. Beli had NYC food-media density and a Harvard Business School network. Clubhouse had a pandemic and celebrities. **A pre-launch Lisbon app has neither.** Gating access when nobody is asking for access produces an empty room, not exclusivity.

There is also a direct conflict with your core asset: **invite-only contradicts auth-free public pages.** Your entire structural advantage over Beli and Mapstr is that anyone can view a list without an account. Gating that would discard the one thing you have that they do not.

**Recommendation — a hybrid that keeps both:**

- **Viewing is always public and always free.** Never gate `/lists/:id`, `/u/:handle`, or `/roleta/lisboa`. This is non-negotiable.
- **Creator accounts are invite-only and explicitly scarce.** "Estamos a aceitar 50 criadores fundadores em Lisboa." Scarcity applied to the *supply* side, where it is credible, aspirational, and quality-controlling — and where Beli's logic genuinely transfers.
- **Consumer accounts are open**, but referrals unlock real features, Beli-style. Candidates: seeing which friends saved a place, private/stealth lists, advanced filters, exporting a list. **Never** gate core saving or viewing.
- **Fire the referral prompt after the value moment** — right after a user's first list is created or first share is opened, never during onboarding.
- **Use a waitlist only for a specific scarce thing** (founding-creator slots, a supper-club event), never for general access.

**Verdict: steal Beli's referral-unlocks-utility mechanic wholesale. Reject Beli's invite-only-access mechanic — it would destroy your only structural advantage.**

---

## Channel Opportunity Map

| Channel | Saturation | Opportunity | Est. CAC | Solo-founder effort | Verdict |
|---|---|---|---|---|---|
| Creator list seeding | Low (nobody is doing this in PT) | **Very high** | €0 cash / ~2h per creator | High upfront, tapers | ✅ **DO FIRST** |
| Public list share loop | N/A (product mechanic) | **Very high** | €0 marginal | Engineering, one-off | ✅ **BUILD FIRST** |
| `/roleta` free tool + press | Low | High | €0 cash / ~20h | Medium, one-off | ✅ **DO** |
| Reddit (r/lisboa, r/portugal) | Medium | Medium-high | €0 / 3–5h per week | Sustained, low intensity | ✅ **DO, carefully** |
| Google Maps importer as hook | Low | High (conversion multiplier) | N/A | Already built — market it | ✅ **AMPLIFY** |
| Short-form video (creator-delivered) | Medium | High | €0 / 6–10h per week | Sustained, high | ✅ **DO — creator-first** |
| Short-form video (own accounts) | **High** | Medium | €0 / 6–10h per week | Sustained, high | ⚠️ **TEST with kill criterion** |
| Long-tail Portuguese SEO | Medium | Medium (AIO-eroded) | €0 / 4–6h per week | Sustained, 12–18mo payback | ⚠️ **BACKGROUND ONLY** |
| Programmatic bairro pages | Low | Medium | €0 / ~20h | One-off + data discipline | ⚠️ **DO, capped at ~50–80 pages** |
| Local media pitching | Medium | Medium | €0 / ~10h per quarter | Bursty | ⚠️ **OPPORTUNISTIC** |
| Supper clubs / Meetups | Low | Low-medium (small pools) | €0 / ~5h | Low | ⚠️ **CHEAP, LOW CEILING** |
| Meta retargeting (warm) | Medium | Medium | €3.50 est. per signup | Low | ⚠️ **AFTER loop works** |
| Coworking partnerships | Low | Low-medium | €0 / ~5h | Low | ⚠️ **OPPORTUNISTIC** |
| Apple Search Ads | Low | Low (thin PT volume) | ~€0.95 CPI / ~€2.40 activated | Low | ❌ **NOT YET** |
| University / Erasmus | Low | Medium but churny | €0 / high effort | High, seasonal | ❌ **MONTH 6+** |
| Meta cold acquisition | High | Low | €7+ per install | Low | ❌ **AVOID** |
| TikTok Ads | Medium | Low at this budget | Untestable under €500 | Low | ❌ **AVOID** |
| Facebook groups | **Very high** | Low | €0 but high ban risk | Medium | ❌ **AVOID** |
| Head-term SEO | **Very high** | Very low | €0 but 18–24mo | Very high | ❌ **AVOID** |
| Restaurant B2B sales | Low | Low pre-traction | High time cost | Very high | ❌ **AVOID year one** |
| Tourism / hotels / markets | Medium | Low (wrong users) | — | Medium | ❌ **AVOID** |

---

## First 90 Days Channel Plan

### Weeks 1–4 — Instrument the loop, build the creator list

**Product (non-negotiable, blocks everything else):**
- Ship Remotion-generated OG preview cards for every `/lists/:id` and `/u/:handle` page. Verify the link preview renders correctly on iOS and Android.
- Ship a one-tap public list share on every list.
- Instrument analytics end to end: share sent → link opened → page viewed → signup. **You cannot manage any channel without this.**
- Make the Google Maps importer the first thing a new user sees.

**Creators:**
- Build the 150-account Lisbon food creator spreadsheet (handle, followers, engagement, cuisine focus, neighbourhood).
- Hand-build 20 creator profiles from their public posts.
- Send 20 personalised "I made you this" DMs. Target: 4–6 claims.

**Reddit:**
- Create/warm the account. Comment 3–5×/day in r/lisboa and r/portugal. **Zero links.** Target 50+ karma per sub.
- Send modmail to r/lisboa asking permission to share a free tool.

**Roulette:**
- Add bairro filter and 12–15 `/roleta/lisboa/[bairro]` variants with genuinely distinct restaurant sets.

**Success criteria:** share loop instrumented; 5 creators live; 50 Reddit karma; roulette expanded.

---

### Weeks 5–8 — Activate creators, first press, first video

**Creators:**
- Scale to 60 pre-built profiles, 60 DMs sent. Target: 15–20 claimed.
- Build the Remotion "list trailer" template. Send every claimed creator a 15-second video of their own list. This is the highest-leverage single asset in the plan.
- Run a "50 Criadores Fundadores de Lisboa" scarcity campaign for supply.

**Press:**
- Pitch the roulette to NiT (`geral@nit.pt` + `izapincelli@nit.pt`, `pedrocastro@nit.pt`), Time Out Lisboa food desk, `leitor@observador.pt`, `comunidade@shifter.pt`. Three sentences, working link, one screenshot, no attachment.
- Expect 1 response from 5 pitches. Follow up once after 7 days, then stop.

**Reddit:**
- Begin answering restaurant questions with genuine value + optional link. Maximum 2 links per week across both subs.

**Video:**
- Launch owned IG/TikTok accounts. 5 videos/week. Formats: "Top 5 tascas em [bairro]", "Roleta escolheu…", weekly openings.

**SEO:**
- Publish the first 15–20 `/lisboa/[bairro]` pages — **only** where you have ≥5 real restaurants with real data. `noindex` everything below threshold.

**Success criteria:** 20 creators live; 1 press pickup or 5 pitches sent; 25 videos published; 20 bairro pages indexed.

---

### Weeks 9–12 — Measure, cut, double down

**Measure ruthlessly.** By week 12 you need per-channel numbers: signups, activation rate, and 7-day/30-day retention. Retention is what tells you whether the loop exists at all.

**Decision gates:**
- **Creator channel:** if 20 creators produced <300 signups, the *pitch* or the *product* is wrong — diagnose which before scaling to 100 creators.
- **Owned video:** if <5,000 cumulative views and <50 signups after ~40 videos, **stop posting to owned accounts** and redirect the entire pipeline to creator-delivered assets.
- **Reddit:** if it converts, deepen it. If banned, note it and move on permanently.
- **Share loop:** if opens-per-share is below 1.0, **stop all acquisition work and fix the product.** Every channel above depends on this number.

**Then:**
- Scale whichever Tier 1 channel produced the best retention (not the most signups — retention).
- Ship the referral-unlocks-features mechanic (Beli model), firing after the first successful share.
- Only if the loop is proven: start €5/day Meta retargeting on list-page visitors.
- Pitch the aggregate-data story to NiT ("os bairros de Lisboa onde mais se guardam restaurantes") — by now you have proprietary data nobody else has.

**Success criteria at day 90:** opens-per-share >1.0; one channel with identified positive retention; 40+ creators live; €0 spent on paid acquisition.

---

## Source Quality Assessment

| Claim | Source | Tier | Date |
|---|---|---|---|
| Google scaled-content-abuse policy definition; method irrelevant to determination | developers.google.com Search Central | **1** | Current (retrieved Jul 2026) |
| Spam policies extended to AI Overviews and AI Mode | Google, via Search Engine Land | **1 / 2** | 15 May 2026 |
| TikTok minimums: $50/day campaign, $20/day ad group | TikTok official docs, via admanage.ai | **1** (official, secondhand) | 2026 |
| Portugal: 7.59M social media identities (72.9%); Instagram 6.35M; TikTok 4.11M (18+); TikTok +15.0% YoY | DataReportal / Kepios (Meta & TikTok ad tools) | **1 / 2** | Oct–Dec 2025, pub. 2026 |
| Apple Search Ads median CPI Portugal $1.01; Spain $1.43; US $4.06; global $1.80 | Apptweak | **2** | 2026 |
| Restaurant AIO trigger rate 10% → 78% (Feb 2026) | BrightEdge, via openlens.com | **2** (via 3) | Feb 2026 |
| Organic CTR −61% on AIO queries (1.76% → 0.61%) | Seer Interactive, via quickfeedback.ai | **2** (via 3) | Late 2025 |
| Top-result CTR −58% with AIO present | Ahrefs, via quickfeedback.ai | **2** (via 3) | Through Dec 2025 |
| AIO triggers on only ~3% of 200 dining-intent prompts | cloro.dev | **3** | 2026 |
| Only 7.9% of local searches trigger an AIO | quickfeedback.ai | **3** | 2026 |
| Zero-click rate 69%; local queries 72% | SparkToro/Datos, BrightLocal via omnibound.ai | **2 / 3** | 2024–2026 |
| Beli: ~80% of users from referrals; 75M+ ratings; team of five | Ivey Business Review; WSJ via tovima.com; TASTE | **2** | 2025–2026 |
| Beli: invite-only waitlist, city-by-city clustering, feature-unlock referrals | 8x.social; LinkedIn (GameRefinery) | **3** | 2025–2026 |
| Time Out Lisboa: DA ~49, ~697k monthly visits, 72% search traffic | usitestat / LinkedIn company data | **3** | 2026 |
| NiT: ~6.2M monthly visits | Third-party estimator | **3** | 2026 |
| Meta PT: CPM €3–8, CPC €0.15–0.80 | agenciazum.com | **3** | 2025 |
| Meta PT: CPM €3–15 by objective, CPC €0.10–2.00 | portugalseo.pt | **3** | 2026 |
| Meta PT: CPM $6.10, CPC $0.90 | adamigo.ai | **3** | 2026 |
| Meta PT: restauração CPL €4–14; min budget €200–400/mo | payoffmarketing.pt | **3** | 2025–26 |
| Meta PT CPM €8–15; TikTok PT CPM €2–5 | kairosshop.pt | **3 — CONFLICTED** (agency selling TikTok ad accounts) | 2026 |
| TikTok CPM $4–13, CPC $0.30–1.50; test budget $300–500 | admanage.ai, businessadsguide.com, trackbee.io | **3** (aggregating Tier 2) | 2026 |
| Google App Campaigns avg CPI $1.29; 15–30% below Meta | launchshots.app; admiral.media | **3** | 2026 |
| Tier-2 Europe CPI multiplier 0.4–0.6× | ad-stack.ai | **3** | 2026 |
| PT influencer rates: nano €50–250/post, micro €250–1,000/post, Reels €500–2,500 | shelf.pt | **3** | 2026 |
| Southern Europe rates 20–30% below US; Reels 1.5–3× feed | simula.pt | **3** | 2025–26 |
| March 2026 core update: 50–90% traffic drops for template-driven pages | seoalgorithmrecovery.com | **3** | 2026 |
| Reddit warm-up: 2–3 weeks, 30–50 karma before promotion | redship.io; okara.ai; growreddit.com; redditgrow.ai | **3** (4 sources agree) | 2026 |
| r/portugal ~603k subscribers | enmlounge.com | **3** | 2026 |
| r/lisboa prohibits self-promotion | Search synthesis of subreddit rules | **3 — VERIFY DIRECTLY** | 2026 |
| ULisboa 51,590 students, 11,702 international; Lisbon ~15,000 intl students/yr | ULisboa; Lisbon City Council | **1 / 2** | 2026 |
| PT international students: 57,581 degree + 14,968 credit mobility | DGEEC (RAIDES), via tesify.pt | **1** (via 3) | 31 Dec 2025 |
| Lisbon Supper Club 3,867 members; Lisbon Foodie Club 847 | Meetup.com | **1** (platform data) | 2026 |
| NiT, Observador, Shifter editorial contacts | Official contact pages | **1** | 2026 |
| Show-don't-tell outreach: 2% → 18% conversion; WhatsApp beats cold calling | dev.to; Medium (John Castle) | **3** (anecdotal, n=1 each) | 2026 |
| Michelin 2026: 19 starred restaurants in Lisbon region | Time Out Lisboa; Michelin Guide | **1 / 2** | 2026 |
| "restaurantes" 823,000 monthly searches PT | SEOptimer | **3** | 2026 |

---

## Data Gaps

1. **DATA GAP — All long-tail keyword volumes are derived estimates, not measurements.** No Ahrefs/Semrush/Keyword Planner access. The ten keywords above are reasoned from a documented chain (national category volume → geo-modification → occasion-modification), not measured. **Resolve for ~€30: run a €1/day Google Ads campaign to unlock exact Keyword Planner volumes rather than ranges. This is the cheapest high-value gap to close and should be done in week 1.**

2. **DATA GAP — Portugal-specific TikTok CPM is unreliable.** The only PT-specific figure (€2–5) comes from a source with a direct commercial interest in that number. Western Europe aggregates suggest $8–12. Do not plan against the low figure.

3. **DATA GAP — AI Overview trigger rate on restaurant queries is genuinely contested** (3% vs 7.9% vs 78%), and **no source measured Portuguese-language queries at all.** All AIO data is US/English. Portuguese AIO rollout may lag materially. This is a significant unknown for any SEO investment.

4. **DATA GAP — No verified referral-traffic figures for Portuguese lifestyle-media pickups.** The "3k–15k sessions from a NiT feature" estimate is unsupported. Instrument a UTM on the first pickup and you will have real data.

5. **DATA GAP — r/lisboa subscriber count and current rules unverified.** Search synthesis reports a self-promotion prohibition but the exact rule text was not retrieved. **Read the sidebar directly before posting anything.** Same for r/PORTUGALCARALHO.

6. **DATA GAP — No landing-page conversion benchmark for Portuguese consumer apps.** The 8–12% assumption underpinning the derived €3.50 CAC is the weakest link in that chain. Replace it with your own data within 30 days.

7. **DATA GAP — Portuguese-language App Store search volume for restaurant-discovery terms is unknown.** This determines whether Apple Search Ads is viable at all despite its attractive $1.01 CPI. Check with Apptweak's free tier or Apple's own Search Ads keyword tool.

8. **DATA GAP — No size data for Portuguese food Discord servers or Facebook group memberships.** Both were assessed as low-priority on qualitative grounds; if either turns out to be large, the community table would need revisiting.

9. **DATA GAP — Zesty's actual acquisition numbers were never published.** The strategic conclusion drawn from its shutdown (distribution, not product quality, was the binding constraint) is inference from public reporting, not from disclosed metrics.

10. **DATA GAP — No Portuguese-market precedent for a successful creator-seeded local consumer app.** The creator channel is ranked #1 on structural logic (auth-free pages remove the install barrier; the pre-built-profile pattern has documented conversion lift in adjacent contexts) rather than on a direct Portuguese comparable. **This is the plan's single biggest untested assumption and weeks 1–8 exist primarily to test it.**
