# Indirect Competitors, Substitutes & Platform Risk

**Agent:** B2
**Date:** 26 July 2026

---

## Headline

NomNom's competitor is not an app. It is a **free, pre-installed, zero-friction habit** that is genuinely good at the moment of saving and genuinely bad at the moment of retrieval — and those two moments are separated by weeks, which is precisely why nobody bothers to fix it.

Two findings should reframe the strategy:

1. **TheFork already shipped NomNom's social layer in Portugal.** TheFork Feed launched 15 July 2025 across all 11 TheFork countries including Portugal: follow friends, chefs and influencers; creator-curated Lists; book directly from a List. Creator public profiles are on the roadmap. This is not a future risk. It is a live product in NomNom's launch market, attached to a booking funnel NomNom does not have.
2. **The "save from Reels" wedge is already commoditised and mostly free.** Prior research named four importer apps. I found roughly twenty, several of which are free, cross-platform, and already Lisbon-aware (Hold My Pin has a Lisbon city page; Navia markets "Lisbon with Maria" collections). One is literally called **NomNomad**.

The genuine gap is narrower and better than the one in the brief: **nobody in this landscape pays creators.** Every product found is a personal filing cabinet or a booking funnel. That is NomNom's defensible position — but it is a marketplace supply problem, not a software problem.

---

## Status Quo Solutions

### 1. Instagram / TikTok saves (the primary status quo)

**What it is.** In-app bookmarking. Instagram has Saved + Collections; TikTok has Favourites/bookmarks.

**How common.** Effectively universal among the 24–34 urban target. This is the default and requires no decision.

**Why people stick with it.** It is one tap, in the app where discovery already happened, at zero cost, with zero context-switch. Critically, the save happens *during* scrolling — any solution requiring an app switch competes with the dopamine loop and loses.

**Where it breaks down — NomNom's opening.**
- **The save preserves the post, not the information.** No restaurant name, no address, no cuisine, no dish. Retrieval requires re-watching the video (Tier 3, multiple vendor/UX sources, converging).
- **Reverse-chronological, unsearchable, unfilterable by location.** You cannot ask "what did I save in Príncipe Real?"
- **Navigation friction.** In a small qualitative study (n=8), 88% of interviewees could not reliably remember how to navigate to Saved and 100% had made navigation errors; 75% did not understand Collections (Tier 3, Medium UX case study, undated).
- **No resurfacing mechanism.** The platform never brings the save back to you. There is no trigger between "that looks amazing" and being physically near the restaurant.

⚠️ **Honesty flag on a widely circulated statistic.** The figure "62% of saved posts are never revisited within 30 days" appears in the search corpus but its source is **Dataford, a data-science interview-practice site**, where it is presented as part of a *hypothetical scenario* with invented figures (18M daily saves, 11M unique savers/day, 41% 7-day retention). **These are almost certainly synthetic numbers for a practice exercise, not Meta data. Do not use this figure in a pitch deck.** `DATA GAP:` no credible first-party or independent measurement of Instagram/TikTok save revisit rates was found.

The qualitative claim — saves are high-intent and rarely acted on — is well-supported by converging independent UX research and by the existence of a ~20-product industry built solely to fix it. The *quantification* is not available.

---

### 2. Google Maps saved lists (the "serious" status quo)

**What it is.** Starred Places, Favourites, Want to Go, plus unlimited custom lists. Shareable, collaboratively editable, syncs across devices, works offline, integrated with navigation.

**How common.** The default for anyone who has graduated past screenshots. This is the strongest incumbent — free, pre-installed, and the only tool where the saved place sits inside the app you already use to navigate to it.

**Why people stick with it.** It is the only status-quo option where the save is already a *place* (pin, hours, directions) rather than a *post*. That is a large functional advantage and NomNom must not underestimate it.

**Where it breaks down — NomNom's opening.**

| Documented failure | Status July 2026 | Confidence |
|---|---|---|
| No "want to go" vs "been" state | **Still unfixed.** Users hand-maintain paired lists ("Lisbon want to go" / "Lisbon been") | High — 2 independent sources |
| **Notes destroyed** when a place moves between lists | **Still unfixed.** Users copy-paste notes manually before moving | High — 2 independent sources |
| Per-list entry cap with silent data loss | Real, but **the number in prior research is wrong** — see below | Medium |
| Saved places absent from route planning | Unfixed — you cannot pull from your lists when building directions | Medium — 1 source |
| Manual entry required | Unfixed — no extraction from a Reel; you must retype the name | High |
| Saved places don't surface in normal search | Consistent with sources; not independently re-verified | Low-Medium |

**⚠️ Correction to prior internal research — the 300-item cap.** The brief states a *300-item cap with random eviction*. I could not verify either the number or the eviction behaviour. What sources actually say:

- **500 entries per custom list**, introduced quietly in June 2023 without announcement, documented only in a support page (Tier 3, techissuestoday).
- **"Want to go" capped around 200**; Starred Places 500 (Tier 3, low-quality Q&A site — weak).
- **Desktop UI renders only the first 200 Starred places**, while mobile shows all — a *display* bug, not data loss (Tier 3, vendor blog with commercial interest in the problem).
- User reports of losing 1,000+ saved locations after passing ~3,000 total (Tier 3, anecdotal).

**Verdict:** the *symptom* (silent loss, disappearing pins, unreliable lists at scale) is real and repeatedly reported. The *specific mechanism* — "300 items, random eviction" — is **unverified and should be removed from investor-facing material** until sourced. `DATA GAP:` no Tier 1 Google documentation of current list limits was located. This matters: a founder quoting a wrong, checkable number to a technical investor loses more credibility than the point gains.

**Also note the sourcing hazard on this whole section.** Nearly every source documenting Google Maps' list failures is a **competitor selling the fix** (Wandrly, ExportMyMap, Stasht, Plotline). Their descriptions of the pain are directionally consistent and match the Reddit-tier complaints in prior research, but they are not disinterested.

---

### 3. Screenshots / camera roll

**What it is.** Pause the Reel on the name card, screenshot, move on.

**How common.** Very. It is the fastest possible capture and requires no app at all.

**Why people stick with it.** Zero friction, zero cost, works when the creator never tags the location.

**Where it breaks down.** Screenshots are unsearchable by content, buried among thousands of photos, carry no address, no hours and no reservation link, and lack any location context. This is the single worst status-quo option on retrieval and the easiest to beat — which is why multiple importer apps (Tote, Stasht) specifically accept screenshots as input.

---

### 4. WhatsApp (send-to-self, group chats, pinned messages)

**What it is.** Forwarding a Reel to a friend, to a group, or to your own "Message yourself" thread.

**How common.** Dominant in Portugal for coordination. Independent UX studies converge on the same pattern: **discovery happens on maps/social apps, but the decision happens in WhatsApp**, with no structure connecting them.

**Why people stick with it.** It is where the group already is, and sharing is social — the send *is* the point, not the storage.

**Where it breaks down.** Links get buried within hours. No comparison view. No way to see what everyone saved. Preferences surface late, causing decisions to reset. Research across three independent UX studies found groups spend **15–40 minutes** deciding where to eat, with roughly **60% of one 32-person sample spending over 15 minutes** (Tier 3, student/portfolio UX research, small samples, non-Portuguese markets — Singapore and India). The academic literature corroborates the structural problem: a 2025 *Information Technology & Tourism* paper (Tier 1, Springer) builds a system specifically for the "one organiser decides for the group" restaurant scenario, noting it is overlooked by existing group recommender systems.

`DATA GAP:` no Portugal-specific data on group dining decision time or WhatsApp coordination behaviour. The 15–40 minute figure comes from small non-European samples and should be treated as indicative, not as a market statistic.

---

### 5. Notes apps, Notion, spreadsheets

**What it is.** A manual list, sometimes elaborate.

**How common.** `DATA GAP:` **no usage data found.** What can be evidenced is *supply*, which implies demand: Notion's marketplace carries **110+ restaurant-category templates**, Notion ships an official AI use case titled "Track your favorite restaurants," and there is a commercial market for paid restaurant-tracker templates (Tier 1, Notion's own marketplace). Template names are revealing — "Where do we eat?", "Couples who always say 'I don't know, what do you want?'"

**Why people stick with it.** Total control, arbitrary fields (vibe, price, who recommended it, dish to order), and it doubles as a "been there" log — the exact thing Google Maps refuses to provide.

**Where it breaks down.** Pure manual entry, no map, no proximity trigger, no live hours, no booking. It is a high-effort tool used only by the most motivated segment. **This is a small but strategically important cohort: they are demonstrating willingness to do 10 minutes of manual work to solve this. They are NomNom's likeliest early adopters and its likeliest first creators.**

---

## Adjacent Products

### A. The social-save importer category — far larger than assumed

Prior research named four. The landscape is at least ~20 products and is the most crowded, fastest-moving space adjacent to NomNom:

| Product | Platforms | Extraction | Price | Notes |
|---|---|---|---|---|
| **Stasht** | iOS, Android, web, extensions | Caption + on-screen text + speech | **Free** | Bulk-imports existing IG/TikTok/Reddit/YouTube/Pinterest saves; map + calendar + reminders; proximity resurfacing |
| **Someday Map** | Web + Chrome extension | Caption, audio transcription, image scan | Free (25 places/mo) → **$5.99/mo Pro** (200/mo) | Only tool claiming *bulk* import of existing saved collections; PDF/screenshot upload |
| **Plotline** | Mobile | Video, images, captions, article text | Freemium | Claims **15,000+ users, 500,000+ places mapped** (self-reported) |
| **Hold My Pin** | Instagram DM bot + iOS | Gemini-based; infers location even when untagged | Free tier | **Has a dedicated Lisbon city page** |
| **Navia** | Web app | IG/TikTok links | Free tier → tiered paid | **Lisbon-facing marketing**; example collection "Lisbon with Maria"; testimonial from a Lisbon PM |
| **NomNomad** | iOS + Android | Vision model reads signage/plating/interiors | **Free** | ⚠️ **Direct name collision with NomNom** |
| Drawer | iOS | Link extraction incl. dishes | Free | Extraction-focused, longest-running |
| Mapstr | iOS, Android | Mostly manual | Free → **~$80/yr** unlimited | Social maps; best-in-class manual curation |
| Others | — | — | — | Rtriv, Triply, Gobbler, Tote, Rezz, GoPlaces, Rodeo, Albo, PinPoint AI, Wandrly, Hili, TokSpot |

**How they partially solve it.** Extremely well, actually. Share sheet → AI reads caption, on-screen text and audio → geocoded pin with address, hours, source link and recommended dish → personal map → proximity resurfacing. A five-restaurant Reel becomes five pins. Several import your entire back-catalogue of saves in one click.

**What they're missing.**
- **No creator economy.** Every one is a *personal organiser*. There is no supply side, no creator monetisation, no reason for a creator to care.
- **No local editorial depth.** They are geography-agnostic wrappers over Google Places. They know a Lisbon restaurant exists; they do not know it is the good one.
- **No social/group layer.** Mostly single-player. Collaborative maps exist but are thin.
- **Weak trust signal.** They inherit whatever the creator said, with no verification and no accountability.

**Could they add NomNom's wedge?** Adding paid creator lists is a *marketplace* build — creator recruitment, payments, tax, moderation, disputes — not a feature. These are mostly tiny teams competing on extraction accuracy. **Likelihood any adds creator monetisation within 18 months: Low–Medium.** But the reverse is the real threat: **they commoditise NomNom's capture feature to zero, for free, right now.** NomNom should not build "save from Reels" as a differentiator. It is table stakes and already free.

---

### B. TheFork — the most serious adjacent product, and it is already in Portugal

**What it does.** Europe's dominant reservation platform (55,000+ partner restaurants across 11 countries). On **15 July 2025** it launched **TheFork Feed** (Tier 1, TheFork engineering blog + TheFork Manager blog; corroborated Tier 2 by Il Sole 24 Ore, Grande Consumo, and Portuguese outlet echoboomer.pt).

Feed lets users:
- Follow **friends, chefs, influencers and creators**
- Create and publish **Lists** of favourite restaurants
- **Book directly from a List**
- See contacts' reviews surfaced on restaurant pages
- Get recommendations derived from social graph activity

Plus a **conversational AI search assistant** (beta) taking natural-language queries — the Portuguese press example is literally *"um jantar romântico para dois no Porto."*

**How it partially solves NomNom's problem.** It is creator-curated restaurant lists, from trusted people, with one-tap booking, inside an app Portuguese diners already have. TheFork positions it as "the first social network in the restaurant sector."

**What it's missing — and this is where NomNom lives.**
1. **Reviews gated to reservation-holders.** Authentic, but it structurally excludes the entire universe of walk-in, tasca, pastelaria and non-bookable dining — a large share of how Lisbon actually eats.
2. **No creator monetisation.** Creator Lists are free promotional inventory for TheFork. Creators get exposure, not income.
3. **Supply limited to TheFork partners.** A restaurant not on TheFork cannot be in a List. NomNom can cover the whole city.
4. **No Reels/TikTok capture.** No bridge from where discovery actually happens.
5. **Booking-funnel bias.** Everything optimises toward a reservation, not toward genuine curation.

**Could it add NomNom's wedge?** Creator public profiles are **explicitly on TheFork's roadmap** and were being piloted with named Italian creators. Paid creator lists would be a coherent next step for a company owned by Tripadvisor. **This is the highest-likelihood platform risk in the entire analysis.**

---

### C. Resy, OpenTable, Yelp

- **Resy** shipped **Shareable Lists** — user-created named lists ("Date Night," "Brunch Favourites") shared by link, plus a curated directory of chef and industry-insider lists (Tier 1, Resy newsroom; `DATA GAP:` publication date not captured). Resy cites its own survey that 8 in 10 adults are likely to tell friends about a restaurant they discovered. **Resy has essentially no Portugal presence** — this is a US/UK signal that the format works, not a local threat.
- **OpenTable** has *not* moved into social. It remains discovery + booking with verified reviews and AI-assisted filters. 65,000+ restaurants globally. Low Portugal relevance.
- **Yelp collections** — `DATA GAP:` not researched in depth. Yelp's Portugal presence is negligible; deprioritised.

**Read-through:** the reservation industry has converged on "shareable lists + chef/creator curation" as the discovery answer. NomNom is not inventing a format. It is entering one that TheFork, Resy and Google are all building — and competing on *who pays the creators* and *how local the supply is.*

---

### D. Apple Maps Guides & Google curated lists — mature in name, immature in practice

**Apple Maps Guides.** Two mechanisms: publisher-curated Guides from partner brands ("Guides We Love"), and user-created custom Guides that can be shared. Apple's marketing claims 1,000+ curated Guides worldwide — **but that figure is tied to iOS 15-era marketing copy and is likely stale**. Limitations: no real-time co-editing (share/save-a-copy only), no export, fewer organisational options than Google. Publisher Guides are editorial partnerships with brands, **not a creator economy** — no individual creator onboarding, no monetisation, no discovery of small local voices.

**Google Maps lists.** Genuinely better on mechanics — collaborative editing, shareable, deep integration. Google runs celebrity/influencer themed collections as marketing partnerships. Again: **partnerships, not a platform.** No self-serve creator onboarding, no payments.

**Assessment: both are mature as *features* and essentially nonexistent as *creator marketplaces*.** Neither has shown any intent to pay curators. Apple in particular has left Guides broadly static for years.

`DATA GAP:` a reference to Apple "Local Lists" (algorithmic trending places, US) surfaced in search synthesis but I could not confirm it against a primary Apple source. Treat as unverified.

---

## Platform Risk Assessment

| Platform | Threat to NomNom | Likelihood | Timeline | Mitigation |
|---|---|---|---|---|
| **TheFork** | Adds paid/prominent creator profiles + lists; owns Portuguese restaurant supply + booking | **High** | **Already partially shipped (Jul 2025); creator profiles 6–18 months** | Cover non-bookable venues (tascas, pastelarias, walk-ins) TheFork structurally can't. Pay creators before TheFork does — lock exclusivity early. Be the capture layer from Reels, which TheFork lacks |
| **Importer startups** (Stasht, Someday, Navia, Hold My Pin, NomNomad…) | Commoditise "save from Reels" to free; several already Lisbon-aware | **High** | **Now** | Do not position on capture. Position on *curation + creators*. Consider interop over competition — let users import from them |
| **Google Maps (Gemini / Ask Maps)** | Conversational discovery + personalised recs absorb the "where should I eat" query | **Medium-High** | **12–24 months for Portugal** (US + India only as of Mar 2026) | Own the "whose taste do I trust" layer, which Google's aggregate-review model cannot express. Depth over coverage |
| **Google Maps (list UX fixes)** | Ships "been/want to go" state, note persistence, Reels extraction — erases the organiser wedge | **Medium** | 12–36 months | Never make list hygiene the core value prop. It is a feature Google can ship in a sprint |
| **AI answer engines** (ChatGPT, Gemini, Perplexity) | Answer "where to eat in Lisbon" directly, removing the discovery app | **Medium** | Ongoing | Be a *source* AI cites, not a competitor to it. Publish creator lists as structured, crawlable data |
| **Instagram / Meta** | Fixes saves at source: map view of your saved places, location filter on Collections | **Medium** | 12–24 months | Meta's incentive is retention, not export — an in-app map keeps users in-app. If it ships, the importer category dies and NomNom's creator layer is the only survivor |
| **TikTok** | Local Feed expands to EU; local creator discovery natively | **Low-Medium** (Portugal) | 18–36 months | Local Feed is currently a US-only initiative under the US joint-venture entity; EU rollout faces separate regulatory path |
| **Apple Maps** | Opens Guides to individual creators with monetisation | **Low** | 24+ months | Apple has shown no creator-economy intent in Maps for years |
| **Umami** (Konnecturs LDA, Lisbon) | Local dish-level discovery + social dining platform, "launching soon in Lisbon" | **Medium** (local, not platform) | **Imminent** | Direct local competitor for attention and creator supply. Monitor closely; different axis (dish-level vs creator-level) |

### The three that actually matter

**1. TheFork is the real competitor, and the brief underweights it.**

The strategic framing — "our competitor is a free habit, not another app" — is only two-thirds right. There *is* another app, it is the dominant restaurant platform in Portugal, and it shipped creator-curated lists twelve months ago with booking attached and creator public profiles explicitly on the roadmap. TheFork's own research claims 80%+ of consumers in France and Italy rely on word-of-mouth to choose a restaurant, so they understand the thesis perfectly.

NomNom's advantages over TheFork are real but narrower than they look: capture from Reels (which importer apps already do for free), non-bookable venue coverage (genuinely defensible — TheFork's review model structurally cannot cover a tasca), and **paying creators** (genuinely defensible until TheFork decides otherwise). The advantage NomNom does *not* have is distribution or restaurant supply.

The uncomfortable implication: NomNom's window is roughly **the time it takes TheFork to decide creator monetisation is worth building** — plausibly 6–18 months. The correct response is to sign Lisbon's meaningful food creators to something they will not want to leave, and to do it before the incumbent makes the same offer with a booking funnel attached.

**2. Google is closing the discovery gap, but slowly, and not yet in Portugal.**

"Ask Maps" launched ~12 March 2026 (Tier 1, blog.google; Tier 2 corroboration from MacRumors, PCMag, The Verge) — Gemini-powered conversational search over 300M+ places and reviews from 500M+ contributors, personalised on your searched and saved places, with one-tap booking, save-to-list and directions. It answers exactly the queries NomNom wants to own.

The mitigating facts: it launched **US and India only**, mobile first, with no stated European timeline. Google has *not* fixed the boring list problems (no "been" state, notes still destroyed on move, still no extraction from a Reel). Google is investing in *answering questions*, not in *personal curation hygiene* or *creator supply*.

**Estimate: Ask Maps reaches Portugal in 12–24 months.** When it does, NomNom's "help me find somewhere" positioning weakens substantially. Its "whose taste do I trust, and here is a person who eats like me" positioning does not — because Google's model is definitionally an aggregate, and aggregates cannot have taste.

**3. Meta fixing saves is the quiet tail risk.**

Instagram Map (US, 6 Aug 2025) is about friend locations and tagged content, not saved-place organisation — and it launched to privacy backlash. But Meta is one product decision away from adding a map view and location filter to Saved Collections. That single feature would delete the entire ~20-product importer category overnight.

**Likelihood: Medium; timeline 12–24 months.** NomNom's protection is that this scenario *only* kills the capture layer. If NomNom's value is creator curation and creator income, Meta shipping better saves is survivable — even helpful, since it validates that saved places should live on a map. **This is the strongest argument for not making capture the core product.**

---

## The AI answer-engine question

**Does Gemini/ChatGPT answering "where should I eat in Lisbon" remove the need for a discovery app?**

### Evidence that it does

- Ask Maps is live and books tables in one tap, over 300M places and 500M contributors (Tier 1, Google).
- TheFork is shipping its own conversational assistant handling "um jantar romântico para dois no Porto" (Tier 2).
- AI-assisted discovery is growing fastest among under-35s — precisely NomNom's 24–34 target (Tier 3, vendor commentary; directional only).
- The interaction is strictly better than the status quo for *low-stakes, generic* intent: no filters, no scrolling, natural language, instant.

### Evidence that it does not

This is the strongest finding in the round, and it cuts NomNom's way.

- **Local Falcon studied 10,000 US restaurants: 74.9% never surfaced in Google's AI recommendations for a single nearby search.** The **top 10% of restaurants capture 74.5% of all AI visibility, versus 54% on Google Maps.** AI recommendation is *more* concentrated than the map it draws from (Tier 2, TechNewsWorld reporting a Tier 3 vendor study — Local Falcon sells AI-visibility tooling, so bias toward "you have a visibility problem" should be assumed; the direction is nonetheless consistent with how LLM recommendation works).
- **Restaurants with 1,000+ Google reviews were omitted 70.9% of the time**, and **5.4% of AI-recommended restaurants were rated below 3.5 stars despite the prompt explicitly requesting highly-rated places.** AI recommendation quality is not tracking actual quality — it is tracking structured-data completeness and review velocity.
- An industry analyst quoted in the same reporting puts it precisely: *"AI recommendations feel authoritative… In reality, they are the three options that happened to have the right technical infrastructure. The best restaurant in the area may not be showing up at all."*
- **The inputs are polluted.** Prior research established ~10.7% of Google reviews are estimated fake, Google removed 292M policy-violating reviews in 2025, and AI-generated Tripadvisor reviews rose 137% (2019→2024). AI answer engines are a confident synthesis layer sitting on a corrupted substrate.
- **AI cannot solve the retention problem at all.** Asking Gemini where to eat does nothing for the 40 Reels you saved last month. Answer engines address *discovery*; they do not address *memory*, which is the pain NomNom's target actually feels.

### Verdict

**AI answer engines will eat the generic, low-intent discovery query — "somewhere for dinner near Cais do Sodré" — and NomNom should not compete for it. They will not eat the category, for three structural reasons.**

First, **answer engines are homogenisation machines.** The Local Falcon data shows AI recommendation is measurably *more concentrated* than map search. They surface the same small set of well-instrumented, high-review-volume venues — which for Lisbon means the tourist-legible ones. A 24–34 Lisboeta asking for somewhere new gets the places they already rejected. That is not a discovery product; it is a consensus product.

Second, **an aggregate cannot have taste.** "Where should I eat" and "where would *this specific person whose palate I trust* eat" are different questions. LLMs answer the first well and cannot answer the second at all, because the input — a specific human's judgment — does not exist in their training data unless someone builds the place where creators publish it.

Third, **answer engines are stateless about your intent.** They do not know you saved that place in March.

**Strategic implication:** treat AI as a *distribution channel, not a competitor*. NomNom's creator lists should be published as structured, crawlable, well-marked-up data so ChatGPT and Gemini cite them when asked about Lisbon. Being the source AI quotes is a defensible position. Competing with AI on "give me three restaurants" is not.

**The real risk is more mundane than disintermediation: it is a generation forming the habit of asking a chatbot first,** so NomNom never gets opened. That is an attention problem, not a capability problem — and it is fought with creators bringing their own audiences, not with better search.

---

## Free & low-cost alternatives

| Alternative | Cost | What it does well | Fatal weakness |
|---|---|---|---|
| Instagram / TikTok saves | Free | Frictionless capture at the moment of discovery | Saves a post, not a place; no retrieval path |
| Google Maps lists | Free | Save *is* a place; navigation-integrated; collaborative; offline | Manual entry; no been/want-to-go; notes destroyed on move; silent loss at scale |
| Screenshots | Free | Fastest possible capture; works on untagged posts | Unsearchable, contextless, buried |
| WhatsApp | Free | Where the group already is; sharing is inherently social | Links buried in hours; no structure; no comparison |
| Apple Maps Guides | Free | Clean, offline, syncs across Apple devices | No co-editing, no export, publisher-only curation |
| Notes / Notion / Sheets | Free–€ | Total control; arbitrary fields; doubles as a "been" log | Fully manual; no map; no proximity trigger |
| **Stasht** | **Free** | AI extraction + bulk import + map + proximity resurfacing, cross-platform | No creators, no local depth |
| **NomNomad** | **Free** | Vision-model extraction even for unnamed venues | Name collision; no creator layer |
| Hold My Pin / Navia | Free tier | AI extraction; **already Lisbon-targeted** | Thin; no creator economy |
| Someday Map | Free (25/mo) → $5.99/mo | Only tool bulk-importing existing saved *collections* | Web-first; quota-limited |
| Mapstr | Free → ~$80/yr | Best-in-class manual curation; social maps | No extraction; manual entry |
| TheFork | Free | Creator lists **+ booking**, live in Portugal, huge local base | Bookable venues only; creators unpaid |
| Gemini / ChatGPT | Free | Instant conversational answers | Homogenised output; 74.9% of restaurants invisible; no memory of your saves |

**The blunt read: the substitute set is almost entirely free, and the best-funded substitute (TheFork) is free *and* Portuguese *and* already has the social feature.** NomNom is not entering a market with a pricing umbrella. Any consumer-side paid tier will face brutal comparison. This strongly supports monetising through **creators and sponsored placement** rather than a consumer subscription — which matches the stated intent, and the research supports that instinct.

---

## Switching Cost Analysis

### What keeps people on the status quo

**1. It is free, pre-installed, and requires no decision.** Instagram and Google Maps are already on the phone, already logged in, already habitual. NomNom must win an install, an account, and a habit against tools with zero acquisition friction.

**2. The pain is temporally displaced from the action.** The cost of a bad save is paid weeks later, by a different mental state, in a different context. At save time the status quo feels *fine* — one tap, done. Nobody switches tools to solve a problem they will not feel until March. **This is the single hardest thing about this business** and it is why a ~20-product category exists without a runaway winner.

**3. The capture moment is defended by the scroll.** Any solution requiring an app switch mid-scroll competes with the feed's dopamine loop. Share-sheet integration is the minimum viable answer, and it is already free everywhere.

**4. Sunk investment in existing lists.** A user with 400 places in Google Maps has real switching cost. Notably, the importer competitors have already solved this (bulk import, Takeout parsing, Chrome extensions) — so NomNom needs import parity just to be considered.

**5. Good enough for the majority.** For someone who eats out twice a month and returns to known places, the status quo genuinely works. NomNom's market is not "everyone who eats" — it is the subset with high discovery volume and high loss anxiety. That is a smaller, sharper segment.

### What would actually make them switch

Ranked by observed evidence rather than by what sounds compelling:

1. **A person, not a feature.** A creator they already follow saying "my lists live here." This is the only switching trigger in the analysis that does not require the user to first acknowledge they have a problem. It bypasses the temporal-displacement trap entirely — you are not switching tools, you are following someone. **This should be the entire go-to-market.**
2. **Resurfacing at the right moment.** A notification when you are 200m from somewhere you saved four months ago. It converts an abstract benefit into a felt one. Note: Stasht already does this, free.
3. **Group decision resolution.** The 15–40 minute WhatsApp argument is a pain felt *acutely and in the present*, unlike lost saves. A shared list that resolves "where do we eat" is a much easier sell than a better filing cabinet — and no incumbent does it well.
4. **The "been there" state.** Small, unglamorous, still unfixed by Google after years, and the reason people build Notion databases. Cheap to build, real emotional payoff (a personal food diary), and it creates data no competitor has.
5. **Trust in an era of fake reviews.** A named local person with a reputation to lose beats an aggregate of possibly-synthetic reviews. This is a positioning asset that strengthens as AI slop increases.

### Migration effort into NomNom

| Path | Effort | Verdict |
|---|---|---|
| Follow a creator, get a curated list | **Near zero** | ✅ The only genuinely low-friction on-ramp. Build for this. |
| Share sheet from Reels going forward | Low | ⚠️ Necessary, but commoditised and free elsewhere |
| Bulk import existing IG/TikTok saves | Medium (technical) | ⚠️ Table stakes — competitors already do it |
| Import Google Maps lists (Takeout) | Medium for user | ⚠️ Needed to neutralise sunk cost, but nobody will do it on day one |
| Manual rebuild | High | ❌ Will not happen |

**The honest conclusion:** NomNom cannot win by asking people to migrate. Migration is a losing frame — it requires the user to admit a problem they have successfully ignored for years. **NomNom wins by arriving as a creator's list that someone opens because they follow that creator, and only later becomes their save destination.** Distribution through creator audiences is not a marketing channel here; it is the product's only viable entry vector.

---

## Source Quality Assessment

| Claim | Source | Tier | Date |
|---|---|---|---|
| TheFork Feed launched; follow friends/chefs/influencers; creator Lists; book from Lists | TheFork Manager blog (official) | 1 | Undated (post-Jul 2025) |
| TheFork Feed launched **15 July 2025** | TheFork Engineering Blog, Medium (official) | 1 | Post-Jul 2025 |
| Feed live in 11 countries incl. Portugal; AI conversational search in beta; >80% word-of-mouth reliance (FR/IT) | Grande Consumo | 2 | 2025–2026 |
| Creator public profiles planned; piloted with named Italian creators; 55,000+ partner restaurants | Il Sole 24 Ore | 2 | 2025–2026 |
| Feed available to Portuguese users (PT-language confirmation) | echoboomer.pt | 2 | 2025–2026 |
| Ask Maps (Gemini) launched; US + India only; 300M places, 500M contributors; personalises on saved places | blog.google (official) | 1 | ~12 Mar 2026 |
| Ask Maps rollout details, Immersive Navigation US-only | MacRumors / PCMag / The Verge | 2 | 12 Mar 2026 |
| Instagram Map launched (US), opt-in, privacy backlash | USA Today / CNET | 2 | 6–7 Aug 2025 |
| Instagram searchable map with restaurant/café filters | TechCrunch | 2 | 19 Jul 2022 |
| TikTok Local Feed: new home tab, US, precise GPS opt-in, off by default | TikTok Newsroom (official) | 1 | Undated (post-US JV) |
| Resy Shareable Lists + chef list directory; 8-in-10 likely to recommend | Resy Newsroom (official) | 1 | Undated |
| OpenTable: 65,000+ restaurants, no social feed | OpenTable (official) | 1 | © 2026 |
| Apple Maps: publisher-curated Guides, "1000+", custom user Guides | Apple.com / Apple Support | 1 | iOS 15-era copy (**likely stale**) |
| Apple Guides: no real-time co-editing, no KML export; Google lists support co-editing | simology.io | 3 | Undated |
| **74.9% of 10,000 US restaurants invisible in AI recs; top 10% take 74.5% of AI visibility; 1,000+ review venues omitted 70.9%; 5.4% of recs below 3.5 stars** | TechNewsWorld reporting Local Falcon study | 2 (reporting) / 3 (vendor study) | 2026 |
| 80% of brands cited once, ~15% get primary recommendation | Birdeye "State of AI Search 2026" (vendor) | 3 | 2026 |
| Gemini shows tightest alignment with Google Maps results (182 restaurants, 5 US cities) | myplace.app research (vendor) | 3 | 2026 |
| Google Maps: no "visited" state; notes deleted when moving between lists | Wandrly (competitor blog) | 3 | Undated |
| Same two claims, independently | theunconventionalroute.com | 3 | Undated |
| 500-entry per-list limit introduced June 2023, unannounced | techissuestoday | 3 | Undated |
| "Want to go" ~200 cap; Starred 500 | phongnhaexplorer Q&A (**low quality**) | 3 | ~4 months prior |
| Desktop Maps renders only first 200 Starred (display bug, not data loss) | exportmymap (vendor) | 3 | Undated |
| Groups spend 15–40 min deciding; discovery/decision split across apps (n=32 + 6 interviews) | NextLeap UX submission, India | 3 | Undated |
| ~60% spend >15 min deciding (n=32, Singapore) | Janine Dela Cruz portfolio | 3 | Undated |
| Group organiser decision scenario overlooked by existing GRSs; MyFoodGRS prototype | *Information Technology & Tourism*, Springer | **1** | 2025 |
| "62% of saved posts never revisited in 30 days" | Dataford interview-practice site | **3 — likely synthetic, do not cite** | Undated |
| 88% can't navigate to Saved; 75% unaware of Collections (n=8) | Medium UX case study | 3 | Undated |
| Instagram saves = "digital graveyard"; survey n=75 | Medium / Design Bootcamp | 3 | Undated |
| Saved-content retrieval friction on Instagram (academic) | Open MIND / ResearchGate, 0 citations | 3 (weak) | 1 Jan 2026 |
| Stasht free across iOS/Android/desktop; bulk import; proximity resurfacing | stasht.app (vendor) | 3 | 2026 |
| Someday Map: free 25/mo, Pro $5.99/mo for 200/mo | somedaymap.com (vendor) | 3 | 2026 |
| Plotline: 15,000+ users, 500,000+ places; Mapstr ~$80/yr | getplotline.app (vendor, self-reported) | 3 | Undated |
| Hold My Pin Lisbon page; Gemini-based extraction; free tier | holdmypin.com (vendor) | 3 | Undated |
| Navia: Lisbon-facing marketing, tiered pricing | navia.place (vendor) | 3 | 2025–2026 |
| NomNomad: free iOS/Android, vision-model extraction | nomnomad.ai (vendor) | 3 | 2026 |
| Umami (Konnecturs LDA), dish-level discovery, "launching soon in Lisbon" | findumami.com (official) | 1 (for own claims) | 2026 |
| Notion: 110+ restaurant templates; official AI "track restaurants" use case | notion.com (official) | 1 | 2026 |

**Overall source quality: mixed, and weaker than it looks.** The platform-risk section rests on solid Tier 1 primary announcements (TheFork, Google, TikTok, Apple, Resy). The status-quo pain section rests almost entirely on **Tier 3 sources with a commercial interest in the pain existing** — competitor blogs and vendor marketing. Their claims converge, which is meaningful, but convergence among parties with the same incentive is weak evidence. The quantitative claims about save behaviour and group decision time are the weakest links in the entire document.

---

## Data Gaps

**Critical — affects the core thesis:**

1. `DATA GAP:` **No credible measurement of Instagram/TikTok saved-content revisit rates.** The widely-repeated "62% never revisited" figure traces to an interview-practice site using invented numbers. The qualitative claim is well-supported; the quantification is not. **Remove this number from all investor material.**
2. `DATA GAP:` **The "300-item cap with random eviction" in prior research is unverified and probably wrong.** Sources point to 500 per custom list (June 2023) and ~200 for "Want to go," with no documented random-eviction mechanism. No Tier 1 Google documentation located. **Correct before external use.**
3. `DATA GAP:` **Zero Portugal-specific behavioural data.** Every statistic here comes from the US, India, Singapore or Italy. There is no data on how Lisbon 24–34s save restaurants, no Portuguese group-decision timing, no Portuguese Instagram-save behaviour. **This is the largest gap in the analysis and the clearest case for primary research** — 15–20 interviews in Lisbon would produce better evidence than everything cited above.
4. `DATA GAP:` **TheFork Feed adoption in Portugal unknown.** No MAU, no engagement data, no list counts, no evidence of whether Portuguese creators are actually using it. Whether this is a live threat or shipped-and-ignored is the single most decision-relevant unknown. **Recommend manual inspection of TheFork's Portuguese app.**

**Important:**

5. `DATA GAP:` No Google Maps saved-lists usage scale figures — no data on what share of users create lists or how many places they hold.
6. `DATA GAP:` No traction data for any importer app beyond self-reported vendor claims (Plotline's "15,000+ users" is unaudited). Download estimates, revenue and retention are all unknown. Whether this category is real demand or twenty founders building for themselves is unresolved.
7. `DATA GAP:` No timeline for Ask Maps' European/Portuguese availability. The 12–24 month estimate is inference from Google's typical rollout cadence, not a sourced fact.
8. `DATA GAP:` Resy Shareable Lists launch date not captured.
9. `DATA GAP:` TikTok Local Feed launch date not captured; EU availability unknown.
10. `DATA GAP:` Prevalence of Notes/Notion/spreadsheet restaurant tracking is entirely unmeasured — inferred from template supply.

**Lower priority:**

11. `DATA GAP:` Yelp collections not researched (negligible Portugal presence).
12. `DATA GAP:` Apple "Local Lists" (algorithmic trending) referenced in search synthesis but unconfirmed against a primary source.
13. `DATA GAP:` Apple's "1,000+ curated Guides" is iOS 15-era marketing copy; current figure unknown.
14. `DATA GAP:` Umami (Lisbon) — no launch date, funding, team size or feature detail beyond its own landing page.
15. `DATA GAP:` No data on whether food creators want a paid-list product, what they would charge, or what they earn today from brand deals. **This is the supply-side equivalent of gap #3 and equally load-bearing** — NomNom's entire differentiation rests on an unvalidated assumption about creator willingness.
