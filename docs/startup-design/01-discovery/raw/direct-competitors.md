# Direct Competitor Deep-Dives — NomNom

**Research Agent B1** | Date of research: **26 July 2026** | All prices checked 26 July 2026 unless stated otherwise.

**Scope:** fills the gaps left by the 25 July 2026 internal complaint-mining review — namely **pricing, current traction, team size, funding recency, and actual Portugal presence**. Complaints already documented internally are not repeated except where new evidence contradicts or extends them.

**Source tier key:**
- **T1** = company's own pricing page / official filings / app store listing / company site
- **T2** = tech press, Crunchbase / Tracxn / CB Insights, Sensor Tower, Wikipedia (sourced)
- **T3** = blogs, listicles, forums, LinkedIn posts, review comments

---

## HEADLINE FINDING (read this first)

**Beli already ships creator-sold paid restaurant guides.** NomNom's stated differentiator — creators selling lists — is not novel. Beli launched "Paid Guides" with creator-set subscription pricing, Stripe/App Store billing, and a formal subscriber ToS. Real observed price point: **$3.99/month or $29.99/year** for one creator's NYC guide (T3, verified against T1 App Store IAP entries showing Creator Subscription tiers at $5.79/mo and $42.90/yr US, $7.99/mo and $59.90/yr CA). Named creator IAP SKUs visible on the US App Store listing include `sola`, `TheEricHammer`, and `kaitlyneats`.

This changes the competitive question for NomNom from *"can we invent creator-sold lists?"* to *"can we execute creator-sold lists better, in a market Beli does not serve?"* — and the answer to the second half is genuinely favourable, because **Beli has no Portugal presence and only ~10% international users**.

---

## Beli

- **Website:** beliapp.com | **Founded:** 2021 (product work from 2019; App Store launch June 2021) | **HQ:** New York City, USA | **Team size:** 45 (Tracxn, as of 30 Apr 2026 — T2) | **Funding:** ~$12M total claimed by company as of June 2025 (T2, Wikipedia); Tracxn and CB-style trackers record only the **$5.3M Series A, 14 Nov 2023, led by Goodwater Capital** (T2). Other named investors: FirstMark Capital, G9 Ventures (T2/T3). **Stage:** Series A. No Series B announced as of July 2026.
- **DISAGREEMENT NOTED:** Wikipedia/DailyDropout say ~$12M total; Tracxn says $5.3M in a single round. The $12M figure is company-stated and likely includes pre-seed/seed/angel not filed. Treat **$5.3M as the only independently-recorded institutional round**.

### Product
Restaurant tracking + ranking + social discovery. Forced pairwise comparison ranking ("is this better or worse than X?") produces a personal ordered list. Two computed scores per venue: a personal prediction score and a friends' score. Taste Profile, Match Score with friends, tags, notes, favourite dishes, photos, maps, leaderboards, streaks. Explicitly **ad-free by policy** — CEO Judy Thelen: *"We won't do feed-in ads. Trust matters too much"* (T2, The Hoya, Feb 2026). Unusual product philosophy: the company deliberately does **not** optimise for time-in-app.

### Pricing
Checked 26 Jul 2026, US and CA App Store IAP listings (T1) plus creator-observed pricing (T3).

| Item | US price | CA price | Notes |
|---|---|---|---|
| Core app | **Free** | Free | No stated save limit found |
| Beli Supper Club (annual) | **$74.99/yr** | $99.99/yr | Invite-only, **NYC only**; a third-party listicle claims $49.99/yr (T3, likely stale) |
| Creator Subscription (monthly) | **$5.79/mo** | $7.99/mo | Paid Guides — creator sets price |
| Creator Subscription (annual) | **$42.90/yr** | $59.90/yr | |
| Observed real creator guide | **$3.99/mo or $29.99/yr** | — | T3, sosayssauce Substack; a creator with 8,000+ followers, 5,000+ restaurants logged |
| Weekly Streak Restore | $0.99 | $0.99 | Consumable |

**Free-plan limits:** none found on saves/lists. Beli's gate is not on saves — it is on **creator eligibility**: users must refer enough people before they can monetise (T3, first-hand creator account). This is the same referral-wall mechanic already flagged internally, now extended into monetisation.

**Pricing disagreement:** Supper Club at $74.99 (US App Store, T1) vs $49.99 (Insiderbits listicle, T3) vs $99.99 (CA App Store, T1). Use the **T1 App Store figures**; the listicle is unreliable.

### Market Position
- **Actual tagline (T1, beliapp.com):** *"Track and share your favorite restaurants with your friends."* App Store subtitle: *"Beli helps you track, share, and discover the world's best restaurants."*
- **Target:** US urban Gen Z / young millennial diners. ~80% of users under 35 (T2).
- **Claimed differentiator:** honest, non-inflated ratings from a trusted social graph; the ambition is *"the largest repository of preference data in the world"* (Thelen, T2 Expedite).
- **PORTUGAL PRESENCE: effectively none.** No Portugal or Europe expansion found. Only ~10% of users are international (T3, StartupSignals analysis). Coverage claim is "30,000 cities globally" but this is user-generated long-tail coverage from travelling US users, not localisation. **No Portuguese language support found. No Portugal marketing, no local content, no local team.**

### Traction Signals
- **App Store: 4.8★ / 16,000 ratings** (US, T1, checked 26 Jul 2026).
- 75M+ total ratings across 30,000 cities as of Sept 2025 (T2); 80M+ cited internally. Growth trajectory: 2.5M ratings (2022) → 6M (Q2 2023) → 58M (Q2 2025) → 75M+ (Sept 2025) — roughly 180% CAGR in ratings (T3 analysis).
- Named to **Forbes Cloud 100 Rising Stars 2025** (T2).
- 45 employees (T2, Apr 2026) — meaningful hiring since Series A.
- **Caveat on traction quality:** the same T3 analysis argues ratings growth outpaces active-user growth, i.e. a long tail of users with <20 ratings who churn because dining-out frequency is low. Beli refuses to disclose DAU.

### Strengths
- Category-defining brand in the US; "Beli" is becoming a generic verb among US Gen Z.
- Genuine viral loop with near-zero paid marketing.
- Enormous proprietary preference dataset — a real long-term moat.
- Ad-free stance builds trust that ad-funded incumbents cannot match.
- **Has already built and shipped the creator-monetisation rails NomNom plans to build**, including legal ToS, Stripe integration and App Store IAP handling.

### Weaknesses
- **Monetisation is unresolved and visibly clumsy.** Supper Club is NYC-only. Paid Guides gate creators behind a referral count, which excludes exactly the enthusiast creators most likely to sell. Independent commentary: *"most of these Beli creators aren't earning the big bucks"* and the approach *"feels a little clunky, perhaps a little naïve"* (T3).
- Referral-wall mechanics create real user resentment ("MLM vibe" — prior internal research; corroborated here by the creator-eligibility gate).
- Forced pairwise ranking is polarising and produces apples-to-oranges comparisons.
- Database gaps outside core US cities — fatal for a Lisbon user.
- Low usage frequency ceiling (people eat out a few times a month).

### Threat Level to NomNom: **Medium**
Not High, because of geography: Beli has no Portugal footprint, no Portuguese localisation, and thin non-US data — a Lisbon user who downloads Beli today finds a sparse map and no local social graph. NomNom can win Lisbon before Beli notices it exists.
Not Low, because Beli has **already validated and shipped the exact monetisation model NomNom is betting on**, which (a) removes NomNom's novelty claim in any investor conversation, (b) gives Beli a ready-made playbook if it ever expands to Europe, and (c) means NomNom's real defence is local density and Portuguese creator relationships, not product concept. Also note Beli's paid-guide pricing ($3.99/mo, $29.99/yr) is now the de facto **global anchor** for what a consumer will pay for a creator's restaurant list — NomNom cannot price far above it without justification.

---

## Barhio

*Not in the prior competitive set. This is the single closest positional match to NomNom found in this research.*

- **Website:** barhio.com | **Founded:** DATA GAP | **HQ:** Barcelona, Spain (implied) | **Team size:** DATA GAP | **Funding:** DATA GAP — no funding record found in Tracxn/CB Insights | **Stage:** pre-launch / launching (waitlist active as of 26 Jul 2026)

### Product
Friend-graph restaurant saving and rating, Barcelona-first. Feature list from the company site (T1) reads almost line-for-line like NomNom's shipped feature set: **save from Instagram** (share a reel, AI extracts the place in under 5 seconds), **import Google Maps**, **share via WhatsApp** (recipients see a map with **no app install needed** — i.e. auth-free public list pages), themed lists ("Date Night", "Best Brunch"), aggregated friend ratings per place, visited/wishlist states, private notes.

### Pricing
**Free — and explicitly "Free forever" with "Zero ads, ever"** (T1, barhio.com, checked 26 Jul 2026). No premium tier, no creator monetisation, no stated save limit. Also states restaurants *"can never buy ranking, visibility, or a single star. Ever."* — i.e. they have publicly foreclosed the sponsored-placement revenue line NomNom intends to use.

### Market Position
- **Actual tagline (T1):** *"Word of mouth. Only better."* Supporting line: *"Google Maps is for navigation. Barhio is for people who actually care about where they eat."*
- **Target:** urban Spanish diners, Barcelona first, "more cities soon".
- **Claimed differentiator:** ratings only from the three people whose taste you actually trust, not 10,000 strangers; incorruptible rankings.
- **PORTUGAL PRESENCE: none yet — but Barcelona-first with stated city expansion, and Iberia is the natural next hop.** This is the geographic threat vector that matters.

### Traction Signals
Pre-launch waitlist. No app store listing found. No social following data. **DATA GAP** on all quantitative traction.

### Strengths
- Positioning is sharp, well-written and near-identical to NomNom's — including the "no app install needed" shareable map, which NomNom also ships.
- "Free forever, zero ads" is an extremely clean consumer promise that is hard to argue against.
- Barcelona is a comparable market to Lisbon in size, culture and creator density.

### Weaknesses
- **No revenue model at all.** "Free forever, zero ads, restaurants can never pay" leaves only VC subsidy or nothing. This is the failure mode that killed DoorDash's Zesty.
- Pre-launch; no proof of demand.
- Has publicly foreclosed both of NomNom's revenue lines (creator sales are not mentioned; sponsored placement is explicitly banned), so it cannot copy NomNom's model without breaking its own promise.

### Threat Level to NomNom: **Medium**
Medium rather than High only because it is pre-launch, unfunded as far as records show, and in a different country. But it is the **most direct positional collision found anywhere in this research** — same customer, same features, same anti-Google-Maps framing, adjacent geography. If Barhio launches well in Barcelona and raises, Lisbon is an obvious second city and NomNom loses its "nobody is doing this in Iberia" story. Worth monitoring monthly.

---

## Mapstr

- **Website:** mapstr.com | **Founded:** 2014 (Tracxn/CB Insights) or 2015 (company's own French press coverage) | **HQ:** Paris / Noisy-le-Roi, France | **Team size:** 1–10 (Tracxn, T2) | **Funding:** **DISAGREEMENT** — Tracxn records $800K (single Angel round, Aug 2015); CB Insights records **$2.3M total**, latest round "Angel-II"; company states it raised **€1.4M from 2,175 users via Crowd Equity in May 2022** (T1, exceeding target by 281%) and was running a second crowd-equity round at time of writing. Best estimate: **~$2–4M lifetime, majority from retail crowd investors, no institutional VC lead.** **Stage:** seed / crowd-funded, bootstrapped-adjacent.

### Product
Personal map of saved places with custom tags, notes, photos, ratings. Follow other users', friends', media outlets' and chefs' maps and overlay them. Mapstr Plus adds unlimited places, bulk edit, AI "Smart Search" by mood/budget/diet, real-time table-availability filter with two-tap booking, visits journal, proximity alerts, multi-map overlay, AI taste-matching, desktop web, and soft-opening invitations. Strong EU/GDPR posture: **100% EU servers, GDPR-first, never sells user place data** (T1).

### Pricing
Checked 26 Jul 2026 (T1: en.mapstr.com FAQ + US/CA App Store IAP list).

| Tier | Price | Notes |
|---|---|---|
| Free | **€0 / $0** | Hard cap **300 saved places**; all essential features; no ads |
| Mapstr Plus monthly | **$5.99/mo** (US SKU) — also $8.99/mo SKU listed | Multiple regional SKUs; **7-day free trial** advertised on App Store but the FAQ states no free trial is currently offered — internal inconsistency |
| Mapstr Plus yearly | **$59.90/yr** (US) — also $59.99 and a $32.99 "Yearly membership" SKU | ~€55–60/yr; matches the "~$80/yr" figure in prior internal research only loosely — **the observed 2026 figure is closer to $60/yr** |

**Free-plan limit mechanics (T1):** at 300 places, adding new places is blocked. Existing places are never deleted, and if you downgrade from Plus you keep everything already saved but cannot add more. Plus also now bundles a **partner benefits programme** (e.g. €250 HomeExchange credit, 4 free Pony scooter rides/month) — a telling sign they are struggling to justify the price on features alone.

### Market Position
- **Actual tagline (T1):** *"Organise and save your places with Mapstr"*; French press positions it as *"le bouche-à-oreille 2.0"* (word-of-mouth 2.0) and the company's own copy promises to help you *"defeat address amnesia"*. App Store framing: *"pins replace screenshots and scattered notes forever."*
- **Target:** French and European urban explorers and frequent travellers; stated brand-side audience is *"Prescribers, Epicureans, Urban, CSP+, 23–45 years old"* (T1 — note this is essentially NomNom's demographic).
- **Claimed differentiator:** *"Personal compass: maps mirror your unique taste, not algorithmic hype; no anonymous reviews, only voices you choose."*
- **PORTUGAL PRESENCE: partial, passive.** App is used in 90 countries and translated into 11 languages. Lisbon is named as a city being added to Mapstr's curated thematic rooftop map (T2, TourMaG). But its editorial "Top 10" curation is Paris/Lyon/Marseille — **France-centric, no Portuguese localisation or Portugal-specific go-to-market found.**

### Traction Signals
- **4M+ users across 90 countries; 100M+ places saved; 4.2M sessions/month; 1.5M places recommended per month; 700,000 newsletter subscribers in France** (T1, Mapstr brand-partnerships page and homepage counter).
- **+73% user growth since May 2022; 23% annual retention** (T1, investor page — note that 23% retention is candidly low and they published it anyway).
- App Store: **4.7★ / 476 ratings** (Canada, T1); company claims 4.8★ overall.
- Team of 1–10 supporting 4M users — extremely lean.

### Strengths
- By far the largest verified European user base in this set (4M+), and a French/EU brand with GDPR credibility that plays well in Portugal.
- Proven that European consumers **will** pay ~€60/yr for a places app.
- Media/chef map-following feature is a partial creator-distribution mechanic already in market.

### Weaknesses
- **The 300-place paywall is actively toxic to their most engaged users.** App Store reviews (T1) are openly hostile: *"I'd pay a (reasonable) one-time fee, but I'm not interested in a yearly fee"*; *"capping that amount to 300 and ask us $60, it's a funny April's fool"*; *"Bye mapstr ✌️"*. The founder's public reply to one such review was widely read as dismissive. **This is a live, repeated, documented demand for a one-time purchase option — directly validating NomNom's "Snapshot" one-time SKU.**
- 23% annual retention is weak.
- No creator monetisation. Chefs and media can be *followed* but cannot *sell*.
- Tiny team; slow feature velocity.
- Data quality complaints on coordinates/addresses (prior internal research; consistent with a lean team).

### Threat Level to NomNom: **Medium**
It is European, large, and in the same product category, and a Lisbon user could plausibly use it today. But it has no Portuguese localisation, no Portugal go-to-market, no creator economy, and — most importantly — **it is currently generating the exact user anger that NomNom's positioning is designed to convert** (paywalled saves vs NomNom's unlimited free personal saves; annual-subscription resentment vs NomNom's one-time Snapshot). Mapstr is more useful to NomNom as a validated pricing benchmark and a source of defectors than as a threat.

---

## TheFork (Portugal)

- **Website:** thefork.pt / theforkmanager.com/pt | **Founded:** 2007 (as LaFourchette) | **HQ:** Paris, France | **Owner:** Tripadvisor Inc. | **Team size:** enterprise scale — DATA GAP on Portugal headcount | **Funding:** N/A, wholly-owned subsidiary of a NASDAQ-listed parent | **Stage:** mature incumbent

### Product
Consumer side: restaurant search, reviews, table booking, **30%/50% menu discounts**, "Yums" loyalty points, TheFork Pay bill-splitting. Restaurant side: TheFork Manager reservation/table/CRM software in three tiers (Visibility, Performance, Enterprise). Distribution across TheFork, Tripadvisor, Google and the MICHELIN Guide app (2,500 MICHELIN restaurants use TheFork Manager — T1).

### Pricing
Checked 26 Jul 2026.

- **Consumer app: free.** Users are paid *to* use it via discounts and Yums.
- **Restaurant side (T1 pricing page /pt + T2 comparison sites):** monthly subscription (**price not published — "contact for pricing"**) **plus** a per-diner commission of approximately **€2–€4 per seated guest** on bookings originating from TheFork, Tripadvisor and partners. One T2 source narrows this to **~€2.00–€2.60 typical, ~€2.30 average**; Portuguese trade coverage (T3, Leak.pt) states promotional bookings (30%/50% off) can reach **€3–€4 per person**. Bookings from the restaurant's own website, Facebook and Instagram carry **no commission** (T1).
- **DATA GAP:** exact Portugal subscription tier prices are not published anywhere and are negotiated per-restaurant.

### Market Position
- **Actual positioning (T1, PT site):** *"Receba reservas da maior plataforma de restaurantes online na Europa"* — receive bookings from the largest online restaurant platform in Europe.
- **Target:** dual-sided — deal-seeking diners and restaurants with empty covers.
- **Claimed differentiator:** scale of demand + Tripadvisor/MICHELIN distribution.
- **PORTUGAL PRESENCE: full and dominant.** Portugal is one of 11+ core European markets with local sales, local support, Portuguese-language product and deep Lisbon/Porto restaurant penetration. This is the only competitor in this document with a genuine Portuguese commercial operation.

### Traction Signals
"Millions of users" claimed for the European network (T1, not Portugal-specific). 2,500 MICHELIN restaurants on Manager. **DATA GAP:** Portugal-specific MAU, downloads and restaurant counts are not published.

### Strengths
- Owns the **transaction** (the booking), which is the highest-intent moment in the funnel and the hardest thing to disintermediate.
- Real Portuguese-language product, local sales team, and existing restaurant relationships in Lisbon and Porto.
- Tripadvisor parent gives it near-unlimited runway.

### Weaknesses
- **Structurally an advertising/discount marketplace, not a discovery product.** Ranking is influenced by commercial relationships and promotional inventory, so it cannot credibly claim taste-led curation.
- Restaurants actively resent the per-cover commission; Portuguese trade press documents restaurants deliberately taking bookings "por fora" (off-platform) to avoid it, at risk of a ban (T3, Leak.pt). This is a **relationship weakness NomNom can exploit when recruiting restaurants**.
- The 30%/50% discount mechanic attracts price-led rather than taste-led diners — the opposite of NomNom's target.
- No creator layer, no social graph, no saving/list-keeping product worth the name.

### Threat Level to NomNom: **Medium-High** (highest geographic threat in this set)
TheFork will not build a creator-curation product tomorrow — its incentives point at bookings and discounts. But it is the **only competitor with a real Lisbon commercial presence and existing restaurant relationships**, which means (a) it owns the monetisable end of the funnel NomNom will eventually need, (b) it could add a curation/lists layer cheaply as a retention feature, and (c) any NomNom restaurant-side revenue proposition will be benchmarked by restaurateurs against TheFork's €2–4/cover. Note also that **Uber Eats launched chef-and-creator curation in Portugal on 9 July 2026** (see below) — incumbents are visibly moving toward curation as a feature.

---

## Google Maps (Saved Lists)

- **Website:** maps.google.com | **Founded:** 2005 | **HQ:** Mountain View, USA | **Team size:** N/A | **Funding:** N/A (Alphabet) | **Stage:** universal default

### Product
Lists of saved places with three privacy states (Private / Shared-by-link / Public), custom icons, notes, custom ordering, photos. **Collaborative editing** — invite editors by link or email, all contributions visible on everyone's map. Following other people's lists. Offline access. Full export via Google Takeout.

Known friction (T3, GIS StackExchange + how-to coverage): collaborative editing **only works reliably on mobile, not web**; invitees must open the link on a phone and tap "Join"; links shared via some messengers lose the "Join" affordance; you cannot remove a place another user added. Discovery of lists is effectively nil — Google Maps lists are invisible to search.

### Pricing
**Free. Unlimited. No tier, no cap, no ads inside lists.** (T1, Google Maps Help, checked 26 Jul 2026.) This is the single hardest price point in the market to compete with.

### Market Position
- **Target:** everyone.
- **Actual positioning:** not marketed as a product; lists are a feature.
- **PORTUGAL PRESENCE: total.** Full Portuguese localisation, essentially complete Lisbon/Porto POI coverage, and — per prior internal research and corroborated here — it is the **actual default behaviour** NomNom must displace.

### Traction Signals
Universal install base. NomNom already ships **Google Maps list import**, which is a tacit acknowledgement that Google Maps is where the user's data currently lives.

### Strengths
- Free, unlimited, already installed, already populated, best-in-world POI data, offline, exportable.
- Collaboration and public sharing already exist.

### Weaknesses
- Lists are a filing cabinet, not a discovery surface. No feed, no taste graph, no reason to return.
- No creator layer and **no way for a curator to be paid** — a food creator with 50k followers has literally no mechanism to monetise a Google Maps list beyond off-platform sponsorship or affiliate links (T3).
- Ratings are the 10,000-strangers average NomNom and every competitor in this document position against.
- Collaboration UX is genuinely broken on desktop and fiddly on mobile.
- Lists are undiscoverable — you must already have the link.

### Threat Level to NomNom: **High**
Highest threat in the entire set, and it is not close. Not because Google will build a creator marketplace, but because **"good enough and free" is what killed Zesty**. Every NomNom user must actively decide to stop using something they already have, that costs nothing, has better POI data, and now supports collaborative lists. NomNom's counter is the three things Google structurally will not do: a taste-based social feed, creator monetisation, and Portugal-specific curation. Those must be the wedge; parity features (map, saves, lists) will never win the switch on their own.

---

## World of Mouth

- **Website:** worldofmouth.app | **Founded:** 2018 | **HQ:** Helsinki, Finland (World Of Mouth Oy, Pursimiehenkatu 26C, 00150 Helsinki) | **Team size:** **1–10, with a reported 7–8% YoY decline** (T3, LinkedIn company data) | **Funding:** DATA GAP on amount — company refers to *"the support of food-loving investors"* (T1) but no round sizes or investor names are published in Tracxn/CB Insights results | **Stage:** small independent, recently forced into monetisation

### Product
Expert-curated global restaurant guide. **800+ named culinary experts** (chefs, sommeliers, food writers — including Ana Roš, Massimo Bottura, Pia León, Will Guidara, Gaggan Anand) contribute recommendations. 20,000–25,000 expert and member reviews across **3,000–6,000 destinations** (the company's own numbers are inconsistent across surfaces: 3,000 on the current site and iOS listing, 5,000 on Google Play, 6,000 in the 2025 press release). Plus 100+ editorially-curated collections updated weekly, wishlists, shareable collections, check-ins, bookings. **"Basil"**, an AI restaurant recommender trained only on WoM expert data. **WoM Plus** = in-restaurant perks, currently **Helsinki and Copenhagen only**.

### Pricing
Checked 26 Jul 2026 — **note this is the clearest example of price escalation in the set.**

| Source | Monthly | Annual | Date |
|---|---|---|---|
| Launch announcement (T2/T3, Luxurious Magazine) | €9.90 | **€29.90** | 2025 |
| Company website today (T1) | **€9.90** | **€3.90/mo billed annually = €46.80/yr** | 26 Jul 2026 |
| US App Store IAP (T1) | **$11.90** | **$57.00** | 26 Jul 2026 |

**Annual pricing has risen from €29.90 to ~€46.80 in roughly a year — a ~56% increase.** Free tier exists but with **"limited weekly actions"** and restricted access to full expert recommendations; paid unlocks *"unlimited destinations and recommendations"*.

### Market Position
- **Actual tagline (T1):** *"The World's Most Reliable Restaurant Guide."* The membership pitch is explicitly ideological: *"Our mission is to give visibility to the places that deserve to be seen, not the ones that pay for it. No ads. No sponsored lists. Free for every restaurant. The membership fee keeps us independent and costs less than one disappointing meal."*
- **Target:** affluent travelling food enthusiasts and fine-dining-adjacent diners.
- **Claimed differentiator:** named, credentialed experts; positive recommendations only (no ratings, no negative reviews); editorial independence.
- **PORTUGAL PRESENCE: yes, editorially — and this matters.** Verified live Lisbon coverage: a **"The Best Restaurants in Lisbon"** guide of 30 restaurants curated by chefs, food writers and sommeliers, with full individual restaurant pages (e.g. Belcanto, R. Serpa Pinto 10A, with prose written specifically about the Lisbon fine-dining scene). No Portuguese-language localisation found; content is in English. Editorial coverage without a local operation.

### Traction Signals
- **160,000+ users, 750+ experts** as of the 2025 premium launch (T2/T3). Current site claims 800+ experts.
- Team of 1–10 and **shrinking** (T3) — a bad signal for a company that just started charging.
- **DATA GAP:** no app store rating or review count retrieved for either store; no download estimates; no revenue figures.

### Strengths
- Directly relevant, genuinely good Lisbon content produced by credible experts.
- **The single strongest proof in this document that consumers pay real money for curated restaurant recommendations** — €46.80/yr, and they raised the price rather than cutting it.
- The "no ads, no sponsored lists, membership keeps us independent" pitch is a coherent and defensible consumer proposition.

### Weaknesses
- **Its editorial-independence stance directly contradicts NomNom's sponsored-placement plan** — WoM has made "no sponsored lists" the entire justification for its price, which means the market has a vocal advocate for the position that sponsorship is disqualifying. NomNom will need marked-sponsorship transparency to be genuinely convincing.
- Tiny, shrinking team; slow, and vulnerable.
- Elite/fine-dining skew — 30 Lisbon restaurants curated by Michelin-adjacent chefs is not the neighbourhood tasca discovery a 24–34 year-old Lisboeta wants on a Tuesday.
- Experts contribute but do **not** get paid per recommendation — no creator economy, only prestige. Sustainability of contributor supply is unproven.
- Global-breadth-over-local-depth: 3,000+ destinations at 30 restaurants each is a mile wide and an inch deep.

### Threat Level to NomNom: **Low-Medium**
Low on customer overlap — WoM serves affluent travellers and fine-dining seekers, not Lisbon 24–34 year-olds looking for a good dinner near Anjos. Medium only because it has real Lisbon content, an English-language audience that includes Lisbon expats and tourists, and — critically — because it is **the best available price-anchor evidence that this business model works** (€46.80/yr and rising). NomNom should read WoM as validation, not as a rival for the same user.

---

## Truffle (thetruffleapp.com)

- **Website:** thetruffleapp.com | **Founded:** DATA GAP | **HQ:** DATA GAP (US-presenting) | **Team size:** DATA GAP | **Funding:** DATA GAP — no record found | **Stage:** small independent
- **NAME COLLISION WARNING:** there are at least three unrelated "Truffle" companies. (1) **thetruffleapp.com** — the social restaurant tracking app, the one relevant here. (2) **usetruffle.ai** — a Y Combinator S26, NYC, AI restaurant back-of-house OS, $500K raised June 2026 (T2, aVenture) — **not a competitor to NomNom**. (3) **Truffle POS** — restaurant POS software, $39.99–$69.99/mo (T3, pricing last verified 2021 — stale). Any prior research citing "Truffle" funding must be re-checked against this; the $500K/YC figures belong to the wrong company.

### Product
Restaurant tracking with friend visibility. Track visited/to-do restaurants with notes, see friends' tracked restaurants and notes, create shared lists. Distinctive feature: **auto-tracking integrations, with Instagram as the most popular** — if you post a restaurant to your Instagram Story, Truffle automatically tracks it for you. That is a genuinely clever solution to the same "lost saves" problem NomNom targets, approached from the posting side rather than the saving side.

### Pricing
**DATA GAP — no pricing found.** No pricing page on the company site; no App Store IAP listing retrieved. Presents as free with no visible monetisation.

### Market Position
- **Actual tagline (T1):** *"The social restaurant tracking app."* Positioning line: *"There is a tracking app for everything — Strava for running, Letterboxd for movies, GoodReads for books — but there is not a tracking app for restaurants. That is why we built Truffle!"* And: *"One trusted recommendation is worth more than thousands of anonymous reviews."*
- **Target:** self-identified foodies who already track things.
- **PORTUGAL PRESENCE: none found.**

### Traction Signals
**DATA GAP across the board** — no app store rating, no review count, no download estimate, no social following, no job postings found. The website is a single marketing page with no team, blog or press section, which itself suggests very early or dormant.

### Strengths
- The Letterboxd-for-restaurants framing is the sharpest one-line pitch in the category.
- Instagram Story auto-tracking is a genuinely differentiated, low-friction capture mechanic worth studying.

### Weaknesses
- No visible business model, no visible traction, no visible team.
- Severe brand dilution from two better-funded "Truffle" companies in adjacent restaurant tech.
- Capture-from-Instagram-Stories only works for people who *post*, which is a much smaller group than people who *save*.

### Threat Level to NomNom: **Low**
No Portugal presence, no funding, no verifiable traction, no monetisation. Its main value to NomNom is as a **product idea source** (Instagram auto-capture) and as a cautionary example of how easily a good tagline dies without distribution or revenue.

---

## Savor

- **Website:** App Store only (© 2025 Savor App) | **Founded:** ~2025 | **HQ:** DATA GAP | **Team size:** DATA GAP (appears to be solo/indie) | **Funding:** DATA GAP — no record found | **Stage:** indie app
- **NAME COLLISION:** distinct from an unrelated "Savor" flash-discount restaurant marketplace founded 2023 (T2). This profile covers **"Rate & Compare Food — Savor"** on the App Store.

### Product
**Dish-first, not venue-first.** Tracks individual dishes across restaurants with a 10-point precision rating scale. Private by default, share selectively. Custom lists by cuisine or city, location tagging, full-history search. Explicit positioning against venue-level apps: *"Unlike restaurant apps that focus on venues, Savor tracks individual dishes."*

### Pricing
**Savor Pro — $4.99/month** (T1, US App Store IAP, checked 26 Jul 2026). No annual or lifetime SKU listed. Free tier exists; **free-plan limits DATA GAP**.

### Market Position
- **Actual tagline (T1):** *"The dish focused food tracking app for serious foodies who want to remember every memorable meal."*
- **Target:** food critics, travel documenters, "serious foodies" — a self-selected power-user niche.
- **Claimed differentiator:** dish-level granularity and a 10-point scale that can distinguish "a 7.5 pasta from an 8.2".
- **PORTUGAL PRESENCE: none.** English only.

### Traction Signals
**DATA GAP** — no rating or review count retrieved. Version 2.0.15 shipped 6 May, so actively maintained. Testimonials on the listing are attributed only to "Early User" and "Food Blogger", which implies very low user counts.

### Strengths
- Dish-level data is a real gap nobody else fills well, and it is the answer to the question people actually ask at the table.
- Private-by-default appeals to the sizeable group put off by Beli's public leaderboards.

### Weaknesses
- Niche of a niche; dish-level logging is high-effort and will lose most users after a few weeks.
- No social graph worth the name, no creators, no discovery.
- $4.99/mo for a private journal with no network effect is a hard sell.

### Threat Level to NomNom: **Low**
Different product (journaling), different user (obsessive logger), no Portugal, no social layer, no creator economy. Relevant to NomNom mainly as a **$4.99/mo price data point for a single-purpose food app** — i.e. the ceiling for what a solo indie app can charge.

---

## Rex

**Prior internal research recorded: "Rex: $3.96M seed (Accel, Khosla, Future Positive), launched June 2023, no revenue at launch."** That entity could not be re-verified in this round, and the "Rex" name is now heavily contested. This profile documents what actually exists in July 2026.

- **Three distinct "Rex" entities found, none matching the prior description:**
  1. **Rex — Restaurant Discovery** (App Store, developer domain `rex.likelilab.com`) — an indie restaurant saving/journaling app. **This is the only restaurant-relevant Rex.** HQ/team/funding: DATA GAP.
  2. **Rex Entertainment Corp** (Austin, TX, 1–10 employees) — movies and TV discovery, launched on the App Store 26 June 2026 (T3, LinkedIn). Not food.
  3. **rex.inc** — an AI agentic finance-operations platform, **Y Combinator S26**, winner of the Vercel AI Accelerator Demo Day (T1, company blog). Not food.
- **DATA GAP / POSSIBLE PRIOR ERROR:** the original social-recommendations Rex ($3.96M, Accel/Khosla/Future Positive, June 2023) did not surface in any 2026 search. It has either shut down, been renamed, or the prior research conflated entities. **Do not carry the $3.96M figure forward without re-verification.**

### Product (Rex — Restaurant Discovery, the relevant one)
Interactive map of restaurants/cafés/bakeries/breweries/wineries/bars, colour-coded, **powered by Apple Maps** (explicitly for speed and privacy). Saved-places collection, sortable. **"Pick for Me"** random picker from your saved list — functionally identical to NomNom's "Roulette". Detailed visit logging: dishes with individual ratings, dining companions, occasion, atmosphere, noise level, service quality, spend range, worth-it flag, would-return flag. **Offline-first**, local storage with sync.

### Pricing
Checked 26 Jul 2026 (T1, App Store listing) — **the cheapest credible tier structure found in the entire category:**

| Tier | Price |
|---|---|
| Free | ad-supported |
| Rex Pro Monthly | **$1.99/mo** |
| Rex Pro Yearly | **$14.99/yr** (7-day free trial; ~$1.25/mo) |
| Rex Pro Lifetime | **$29.99 one-time** |

Pro's only stated benefit is **removing ads**. Free-plan limits: none stated other than ads.

### Market Position
- **Actual App Store hook (T1):** *"Tired of going to the same restaurants? Can't remember that amazing spot your friend recommended?"*
- **Target:** individual diners who want a private, offline, low-cost journal.
- **PORTUGAL PRESENCE: none found.**

### Traction Signals
**DATA GAP** — no rating, review count or download estimate retrieved. Small App Store ID range and `likelilab.com` developer domain suggest an indie/solo developer with a portfolio of apps.

### Strengths
- **Offers a lifetime one-time purchase at $29.99** — the option Mapstr users are loudly demanding and not getting. Direct read-across for NomNom's "Snapshot" one-time SKU.
- Offline-first is a real advantage over every cloud-dependent competitor.
- Apple Maps backing avoids Google Maps API costs entirely.

### Weaknesses
- Ad-supported free tier contradicts the trust positioning the whole category relies on.
- No social graph, no creators, no network effects — a solo journal.
- $1.99/mo to remove ads is a thin, low-ceiling business.

### Threat Level to NomNom: **Low**
No Portugal, no social layer, no creator economy, indie scale. Its value is as **pricing intelligence**: it establishes the floor of the market at $1.99/mo and, more usefully, proves that a $29.99 lifetime one-time purchase is a viable SKU shape in this category.

---

## Uber Eats "Top Eats" (Portugal)

*Not in the prior competitive set. Launched 9 July 2026 — seventeen days before this research. This is the most consequential new development for NomNom found anywhere in this round.*

- **Website:** ubereats.com/pt | **Launched in Portugal:** 9 July 2026 | **HQ:** San Francisco (Uber Technologies, NYSE: UBER) | **Portugal GM:** Francisco Meneses | **Stage:** mature incumbent launching a new feature

### Product
A curation layer inside the Uber Eats app. A green-and-black **"Top Eats" badge** marks restaurants and dishes recommended by named Portuguese chefs — **José Avillez, Justa Nobre, Kiko Martins, Rui Sequeira, Vítor Sobral, Olivier da Costa** — and by named Portuguese **food content creators**: A Pitada do Pai, Aqui há Garfo, Gastropiço, O Comensal, Pedro o Bom Garfo, Teresa Castro Viana. Users can filter by the badge. Badges are permanent once awarded. Supported by a monthly **Top Eats Podcast** on Spotify/YouTube with Instagram and TikTok teasers. First drop: Justa Nobre badged eight Lisbon restaurants including Papa Açorda, Tasca da Esquina and Café de S. Bento.

### Pricing
**Free to consumers.** Creators and chefs are presumably compensated by Uber (terms not disclosed — DATA GAP). No consumer pays for the curation.

### Market Position
- **Stated intent (T1/T2, quoting Francisco Meneses):** to evolve Uber Eats *"de uma plataforma focada na conveniência para um motor de descoberta gastronómica e cultural"* — from a convenience platform into an engine of gastronomic and cultural discovery. Explicitly framed around the problem that *"o problema dos utilizadores deixou de ser encontrar o que comer, mas sim escolher o melhor"* — the user's problem is no longer finding food but choosing the best.
- **PORTUGAL PRESENCE: this IS the Portugal product.** Portuguese chefs, Portuguese creators, Portuguese-language podcast, Lisbon restaurants.

### Traction Signals
Uber Eats' existing Portuguese install base (not published separately) plus six national-name chefs and six established Portuguese food creators, activated simultaneously across app, podcast, Instagram and TikTok. Covered on the same day by ECO/SAPO, Trendy.pt, Distribuição Hoje and multiple lifestyle outlets (T2).

### Strengths
- **It has signed the exact Portuguese food creators NomNom needs to recruit**, and can pay them from delivery-margin revenue rather than needing consumers to pay.
- Massive existing Portuguese distribution.
- Solves the discovery problem inside the app where the transaction already happens.

### Weaknesses
- Restricted to restaurants that are **on Uber Eats** — excludes most of the sit-down, walk-in, neighbourhood restaurants that define Lisbon dining. A tasca that does not deliver cannot be badged.
- Delivery-first framing: it is about what to *order*, not where to *go*.
- Permanent badges never expire, so the signal degrades over time.
- Curation is commercially entangled with a platform that takes restaurant commission — the credibility problem TheFork already has.

### Threat Level to NomNom: **Medium-High**
This is the fastest-moving threat in the document and the only one operating natively in Portuguese with Portuguese creators. It validates NomNom's core thesis — that Portuguese diners want creator-led curation, and that creators will participate — while simultaneously **competing for the same finite pool of Portuguese food creators** and setting a consumer expectation that curation is free. NomNom's defence: sit-down/walk-in restaurants Uber Eats structurally cannot cover, plus creator monetisation that pays creators more than a badge and a podcast slot.

---

## By Chefs

*Not in the prior competitive set. Launched in Lisbon and Porto in July 2026.*

- **Website:** DATA GAP (platform name "By Chefs") | **Founded:** created in the UAE by **Alexander Sysoev** | **HQ:** United Arab Emirates | **Team size / Funding:** DATA GAP | **Stage:** early, internationalising

### Product
A city-by-city restaurant ranking derived exclusively from chefs' personal recommendations of where *they* eat, outside their own restaurants. Four categories: breakfast, dinner, street food, drinks. Each chef ranks 1st–5th or 1st–10th; positions convert to points (1st = 10 points, 10th = 1) and aggregate into a city ranking. Anti-conflict rule: **a chef may include at most 20% of their own or their group's projects.** Also publishes specific dish recommendations.

### Pricing
**DATA GAP — no pricing found.** Presents as a free guide.

### Market Position
- **Positioning (T2/T3, Portuguese press):** a transparent alternative to traditional guides — no anonymous inspectors, no closed committees, just where chefs actually eat.
- **PORTUGAL PRESENCE: yes, and it is a launch market.** **Porto and Lisbon are the first Portuguese cities**, following Dubai and preceding London. Stated ambition: 50 major cities, with Cape Town, Hong Kong, Singapore, Shanghai and Milan queued.

### Traction Signals
**DATA GAP** — no user numbers, app store presence, or funding found. Coverage so far is Portuguese lifestyle/tourism press (T3), not tech press.

### Strengths
- Clean, defensible curation methodology with an explicit conflict-of-interest rule — more rigorous than anything else in this set.
- Chose Lisbon and Porto as its first European cities, which independently validates Portugal as a viable market for curated restaurant discovery.

### Weaknesses
- Chefs only — no ordinary-people layer, no social graph, no personal saving, no lists.
- Aristocratic curation: interesting to read, but it does not solve "I lost the reel I saved".
- No visible business model.

### Threat Level to NomNom: **Low-Medium**
Different job-to-be-done (an editorial ranking, not a personal saving-and-discovery tool) and no personal-list product. But it occupies Lisbon curation mindshare, competes for chef attention, and is further proof that multiple independent operators concluded in 2026 that **Lisbon is worth entering for curated restaurant discovery**.

---

## Iberian Direct Analogues (Spain) — Escandalo, Button, Vibefy

*None of these were in the prior competitive set. Collectively they are the most important Round 1 finding after Beli's paid guides: **the "trusted-people restaurant discovery" thesis is being executed by at least four independent teams in Spain right now.***

### Escandalo App
- **Website:** escandaloapp.com | **HQ:** Spain | **Team size:** 1–10, +7–8% YoY (T3, LinkedIn) | **Funding:** DATA GAP | **Pricing:** DATA GAP — no pricing found, presents as free
- **Product:** explore/save/recommend/organise restaurants; recommendations only from people you follow; custom tags and lists with notes; "Moments" for sharing dining moments; **event hosting with friend invites and polls to vote on where to go**.
- **Tagline (T1):** *"With Escandalo App explore, save, recommend and organize your favorite restaurants."* Their July 2026 LinkedIn campaign line: *"¿Y si descubrir un restaurante no empezara por una puntuación, sino por alguien en quien confías?"* — what if discovering a restaurant didn't start with a score, but with someone you trust? And: *"La confianza no se puede puntuar"* — trust can't be scored.
- **Notable:** explicitly markets *"save restaurant recommendations from friends and influencers. No more lost screenshots"* — the identical problem statement to NomNom's.
- **Portugal presence:** none found.

### Button (Find The Button SL)
- **HQ:** Spain | **Founded:** 2026 (© 2026 Find The Button SL) | **Funding / team:** DATA GAP | **Pricing:** DATA GAP — no IAP found
- **Product:** curated expert guides **plus** friends' reviews plus interactive map plus an AI recommender. Check-ins, gamified points and levels, friend invitations. **Live in Madrid, Barcelona, Sevilla, Málaga and Marbella.**
- **Positioning (T1):** *"tu memoria gastronómica"* — your gastronomic memory; *"reseñas útiles para el restaurante, más allá de las típicas estrellitas"* — reviews that are actually useful, beyond the usual little stars.
- **Notable:** the **city-by-city launch sequence is exactly NomNom's playbook** (Lisbon → Porto vs Málaga → Madrid → Barcelona), and Button combines expert guides with a friend graph — the closest structural match to NomNom's creator-plus-social model in Iberia.
- **Portugal presence:** none yet; Spain-only, Spanish and English.

### Vibefy (BracketsLab)
- **Website:** vibefy.app | **HQ:** Spain (Spanish/Catalan/English) | **Funding / team:** DATA GAP | **Pricing:** **free** ("Download Vibefy for free", T1); no paid tier found
- **Product:** organised lists of favourite places, **collaborative lists for group planning**, friend ratings, map filtering by friends' saves / rated only / by list, and — distinctively — **side-by-side comparison of Google reviews against your friends' ratings**.
- **Positioning (T1):** *"Top spots recommended by those you trust most 👉🏼 your friends."* Problem statement: *"Forget saving them in notes, screenshots or lost chats… when it's time to go, you can't find them."*
- **Portugal presence:** none found.

### Threat Level of the Spanish cluster to NomNom: **Medium**
Individually all are small, unfunded and Spain-only, so none threatens Lisbon today. Collectively they matter for three reasons. **(1) Thesis validation:** four independent Spanish teams, plus Barhio, plus NomNom, all independently converged on "restaurant discovery through people you trust, not star ratings" — this is a real and recognised problem, not a founder's private hunch. **(2) Thesis commoditisation:** it also means the *concept* is not defensible; execution, local density and monetisation are. **(3) Geographic proximity:** Iberia is one hop. Any of these that raises money will look at Lisbon and Porto, and Button's five-city Spanish rollout shows it already thinks in city-expansion terms. **None of them monetises creators**, which remains NomNom's open lane.

---

## Other 2026 Entrants Worth Logging (pricing anchors only)

Verified from T1 App Store / company listings on 26 July 2026. None has Portugal presence; all are included because their **price points collectively define the consumer willingness-to-pay band** for this category.

| App | What it is | Pricing (T1, 26 Jul 2026) |
|---|---|---|
| **Nibbl** (Julian Yip, indie) | Tinder-style swipe-to-decide, solo or group sessions; free tier has **daily swipe limits** | **$4.99/mo**, $12.99/quarter, **$39.99/yr** |
| **Dinelist** (Dinesurf Inc) | Group consensus + solo lists; 5.0★ from **2 ratings** — i.e. no traction | **$7.99/mo**, **$49.99/yr**, **$89.99 lifetime** |
| **Dinver** (dinver.eu) | **European**; social feed + **receipt-scan verification** of real visits, 360° venue tours, rewards | DATA GAP |
| **MenuScouter** | Dish-level recs from people you follow; *"Restaurant recommendations from people you trust"* | DATA GAP |
| **Memolli** | Private restaurant journal, share selectively | DATA GAP |
| **NomNomad** (Miguel Crespo Santiago) | **Paste a TikTok/Reel/Short link, AI vision identifies the restaurant** from storefront/plating/signage, returns name + address + hours, builds "SpotLists" and itineraries. Live iOS + Android June 2026. **Confusable name with NomNom.** | Free to start; paid tiers DATA GAP |
| **NomlyAI** (BOSVARA) | Dish-level AI craving search across real menus; **9 languages, multi-currency inc. EUR**; social feed | DATA GAP |
| **nom — Your Restaurant List** (Nome Ltd) | Curated list of places to eat/drink, map view, hashtags, notes | Free; 17 country stores |

**Willingness-to-pay band across all verified consumer SKUs: $1.99–$11.90/month; $14.99–$59.90/year; $29.99–$89.99 lifetime.** The dense cluster is **$4.99–$7.99/month** and **$40–$60/year**.

---

## Portugal Incumbents — DIG-IN and Mygon

### DIG-IN (formerly Zomato Portugal)
- **Website:** dig-in.pt | **Legal entities:** DIG-IN, S.A. / ZMTEUROPE, SA, Rua Pedro Nunes, Edifício C, 3030-199 **Coimbra**, Portugal | **Stage:** the surviving rebrand of Zomato's Portuguese operation (Zomato's Portuguese subsidiary was liquidated July 2023 per prior internal research; the consumer product continued as DIG-IN)
- **Product:** restaurant discovery with menus, photos, addresses, reviews; reservations; **in-app payment by meal card, credit card or MB WAY**; delivery and takeaway; points and rewards; **DIG-IN PRO** discount subscription.
- **Pricing:** consumer app free. **DIG-IN PRO** offers discounts at hundreds of restaurants in **Lisboa, Porto and the Algarve**, sold in **1, 3, 6 and 12-month plans**. **DATA GAP: exact PRO prices are not published on the website or app store listing.** What *is* visible is a near-continuous discount cycle — a permanent 50%-off code ("Batata"), a Carnival 50% campaign, and a Black Friday campaign **starting at 80% off** with tiered stock. Chronic deep discounting on a subscription is a strong signal of weak price realisation and poor conversion.
- **Traction (T1/T2):** **100,000+ Android downloads**; claims **2M+ views/month in Portugal** and to be *"a plataforma mais utilizada na descoberta de restaurantes"* in Portugal; **ranked #56 in Portugal Food & Drink Top Free** on Google Play; **no aggregate Play Store rating shown** (T2, AppBrain). **Critically: last app update 27 February 2025 — seventeen months stale as of 26 July 2026.** Documented user complaints include a 1 km search radius cap and an account-merge failure that leaves users with a free account and a separate paid-subscription account.
- **Threat Level to NomNom: Low-Medium.** It is Portuguese, Lisbon/Porto/Algarve-covered, and claims scale — but a seventeen-month-stale build, no visible rating, permanent 80%-off promotions and a discount-coupon value proposition describe a product in maintenance, not competition. **The bigger read is negative-signal: Portugal has already had a well-funded, locally-operated restaurant discovery app (Zomato) fail, and its successor is running on discounts.** That must be reckoned with in NomNom's market-size assumptions.

### Mygon
- **Website:** mygon.com/pt | **Product:** Lisbon-led vouchers, promotions and bookings, spanning restaurants, takeaway/delivery, health & beauty, leisure & sport, accommodation, services and products. Restaurant discovery is one vertical among seven.
- **Pricing:** DATA GAP.
- **Traction:** DATA GAP — no downloads, ratings or user figures found.
- **Threat Level to NomNom: Low.** A discount-voucher marketplace, not a discovery or curation product; not focused on restaurants; targets deal-seekers rather than taste-led diners.

---

## STRUCTURED COMPARISON MATRIX

| Name | Product | Pricing (26 Jul 2026) | Target | Funding | Traction | Key Strength | Key Weakness | In Portugal? |
|---|---|---|---|---|---|---|---|---|
| **Beli** | Social ranking + tracking + **creator paid guides** | Free core; Supper Club $74.99/yr (US, NYC-only); **creator guides $3.99–5.79/mo, $29.99–42.90/yr** | US urban Gen Z, 80% under 35 | $5.3M Series A verified (Nov 2023, Goodwater); ~$12M claimed | 4.8★/16K ratings; 75M+ ratings; 45 staff; Forbes Cloud 100 Rising Star 2025 | Category brand + already ships creator monetisation | Monetisation clumsy; referral wall gates creators; ~10% international | **No** |
| **Barhio** | Friend-graph saves, IG capture, GMaps import, WhatsApp share | **Free forever, zero ads, restaurants can never pay** | Barcelona urban diners | None found | Pre-launch waitlist | Positioning near-identical to NomNom | No revenue model at all | No (Barcelona-first) |
| **Mapstr** | Personal tagged place map + follow others' maps | Free to **300 places**; Plus **$5.99/mo, $59.90/yr** | European urban CSP+ 23–45 | ~$0.8–2.3M + €1.4M crowd equity (2022) | **4M+ users, 90 countries, 4.2M sessions/mo**; 4.7★/476; **23% retention** | Largest verified EU base; proves €60/yr WTP | 300-place paywall causing open user revolt | Partial (used there; no PT localisation) |
| **TheFork** | Booking marketplace + discounts + restaurant SaaS | Consumer **free**; restaurants: undisclosed sub **+ €2–4/diner** | Deal-seeking diners; restaurants | Tripadvisor subsidiary | Largest EU booking platform; 2,500 MICHELIN venues | **Owns the transaction + real PT operation** | Discount-led, commercially compromised curation | **Yes — full** |
| **Google Maps** | Saved + collaborative lists | **Free, unlimited, forever** | Everyone | N/A | Universal | Free, installed, best POI data | Filing cabinet, not discovery; no creator payouts | **Yes — total** |
| **Uber Eats Top Eats** | Chef + creator curation badge inside delivery app | **Free** to consumers | Portuguese Uber Eats users | Uber (NYSE: UBER) | 6 national chefs + 6 PT food creators; launched 9 Jul 2026 | **Signed the PT creators NomNom needs** | Delivery-only restaurants; can't cover walk-in tascas | **Yes — PT-native** |
| **World of Mouth** | Expert-curated global guide + AI "Basil" | Free (limited weekly actions); **€9.90/mo, ~€46.80/yr** (was €29.90/yr in 2025) | Affluent travelling foodies | Undisclosed angel/"food-loving investors" | 160K users, 800 experts, 3–6K cities; **team 1–10 and shrinking** | **Best proof consumers pay for curation — and price rose 56%** | Fine-dining skew; experts unpaid; tiny team | **Yes — editorial** (30-restaurant Lisbon guide, English only) |
| **By Chefs** | Chef-voted city rankings, conflict-capped at 20% | Free (DATA GAP) | Food-curious diners | DATA GAP (UAE, Alexander Sysoev) | Launched Lisbon + Porto 2026, after Dubai | Rigorous, transparent methodology | Chefs only; no personal lists or saves | **Yes — Lisbon + Porto launch market** |
| **Button** | Expert guides + friend reviews + AI + gamified check-ins | DATA GAP | Spanish urban diners | DATA GAP (Find The Button SL) | Live in 5 Spanish cities | City-by-city rollout = NomNom's playbook | Spain-only, unproven | No |
| **Escandalo** | Follow-only recs, lists, moments, events + polls | DATA GAP (free) | Spanish diners | DATA GAP | 1–10 staff, +7–8% YoY | *"Trust can't be scored"* messaging | No monetisation, tiny | No |
| **Vibefy** | Collaborative lists + friend vs Google rating compare | **Free** | Spanish/Catalan diners | DATA GAP (BracketsLab) | DATA GAP | Google-vs-friends rating comparison | Free, no model | No |
| **Truffle** | Restaurant tracking + **Instagram Story auto-capture** | DATA GAP (free) | US self-tracking foodies | None found | None found | *"Letterboxd for restaurants"*; IG auto-capture | No model, no traction, name collision ×3 | No |
| **Savor** | **Dish-level** 10-point tracking, private by default | **$4.99/mo** Pro | "Serious foodies", critics | None found | DATA GAP (testimonials unnamed) | Dish granularity nobody else has | Niche of a niche; high effort | No |
| **Rex (restaurant)** | Apple-Maps map, saves, "Pick for Me", offline journal | **$1.99/mo, $14.99/yr, $29.99 lifetime** | Private journalers | DATA GAP (indie) | DATA GAP | **Proves a $29.99 lifetime SKU works** | Ad-supported free tier; no social layer | No |
| **DIG-IN** (ex-Zomato PT) | PT discovery + reservations + MB WAY pay + delivery + PRO discounts | Free; **PRO 1/3/6/12mo — price DATA GAP**, routinely 50–80% off | Portuguese foodies | ZMTEUROPE SA / DIG-IN SA | 100K+ Android DLs; claims 2M views/mo; **build 17 months stale** | Real PT brand, MB WAY, PT restaurant relationships | Stale product; chronic deep discounting; Zomato PT already failed once | **Yes — Lisboa/Porto/Algarve** |
| **Mygon** | Vouchers and promos across 7 verticals | DATA GAP | PT deal-seekers | DATA GAP | DATA GAP | Lisbon-native | Coupons, not discovery | **Yes — Lisbon** |
| **Nibbl / Dinelist** | Swipe-to-decide, group consensus | Nibbl **$4.99/mo, $39.99/yr**; Dinelist **$7.99/mo, $49.99/yr, $89.99 lifetime** | Groups deciding where to eat | Indie | Dinelist: 5.0★ from 2 ratings | Clear WTP anchors | No traction | No |

---

## Competitive Landscape Summary

### Market concentration
**Barbell-shaped, with nothing in the middle.**

At one end sit three unassailable free defaults with total Portuguese coverage: **Google Maps lists**, **Instagram/TikTok saves**, and **WhatsApp**. At the other end sit two commercially entrenched Portuguese incumbents monetising the transaction rather than the discovery: **TheFork** (€2–4/diner, real local sales force) and now **Uber Eats Top Eats** (launched 9 July 2026, subsidised by delivery margin).

Between them the field is **radically fragmented and radically under-capitalised**. Beli, the global category leader, has $5.3M verified and 45 people. Mapstr supports 4M users on a team of under ten. World of Mouth is shrinking. Every other player found — Barhio, Escandalo, Button, Vibefy, Truffle, Savor, Rex, Nibbl, Dinelist, MenuScouter, Memolli, NomNomad, NomlyAI, Dinver — is a solo founder or a sub-ten team with no institutional funding on record. **There is no funded consolidator in social restaurant discovery.** DoorDash tried the adjacent thing with Zesty and shut it in four months.

**Portugal specifically has no credible native player.** Zomato exited. Its successor DIG-IN has not shipped a build since February 2025 and sells its subscription at 50–80% off. Mygon is a voucher site. The only serious Portuguese operations belong to foreign platforms monetising bookings and delivery.

### Gaps nobody serves well
1. **A one-time purchase.** Mapstr's own App Store reviews are a public, dated, verbatim demand for it — *"I would pay a (reasonable) one-time fee, but I'm not interested in a yearly fee"*. Only Rex ($29.99) and Dinelist ($89.99) offer lifetime SKUs, and both are indie apps with no traction. **NomNom's "Snapshot" one-time SKU is aimed directly at a documented, unmet, repeatedly-voiced demand.** This is the single best-evidenced finding in this research after Beli's paid guides.
2. **Portuguese-language, Portugal-native curation with a personal saving layer.** Uber Eats Top Eats has PT creators but only delivery restaurants. By Chefs has Lisbon but only chefs and no personal lists. World of Mouth has Lisbon but in English and only fine dining. DIG-IN has the language but a dead product. Nobody combines all three.
3. **Creator payouts that are actually attainable.** Beli gates creator eligibility behind referral counts and its own commentators say creators aren't earning. Uber Eats gives creators a badge and a podcast slot, not a revenue share. Mapstr lets media and chefs be followed but not paid. World of Mouth's 800 experts contribute for prestige alone. **No platform in this set pays ordinary local creators well for a curated restaurant list.**
4. **Unlimited free personal saves alongside paid curation.** Mapstr paywalls saves at 300 and is being punished for it. Nibbl limits daily swipes. NomNom's split — free unlimited personal saves, pay only for someone else's curation — is not occupied by anyone.
5. **Mid-market, everyday restaurants.** World of Mouth and By Chefs curate the top 30. TheFork and DIG-IN discount the empty covers. Nobody curates the good Tuesday-night tasca.

### Positioning opportunities for NomNom
- **Lead with the one-time Snapshot, not the subscription.** It is the only price shape with documented unmet demand, it differentiates against Mapstr (whose users are actively defecting over exactly this), and it lowers the trust barrier for buying from an unproven creator.
- **Do not claim creator-sold lists as an invention.** Beli shipped it. Claim *better creator economics and Portuguese-first execution*, and be able to say precisely how NomNom's creator terms beat Beli's referral-gated $3.99/mo and Uber Eats' unpaid badge.
- **Price against the observed band, not aspiration.** The verified consumer cluster is **$4.99–$7.99/mo** and **$40–$60/yr**, with Beli's creator guides specifically at **$3.99/mo / $29.99/yr**. Portugal's lower disposable income relative to the US and Nordics argues for the bottom of that band or below.
- **Recruit Portuguese creators now, before Uber Eats locks them up.** Six of the most prominent are already badged: A Pitada do Pai, Aqui há Garfo, Gastropiço, O Comensal, Pedro o Bom Garfo, Teresa Castro Viana. They are being paid in exposure. NomNom can offer revenue.
- **Exploit restaurant resentment of TheFork's per-cover commission.** Portuguese trade press documents restaurants routing bookings off-platform to dodge €2–4/head. A marked-sponsorship product with no per-cover fee is a genuinely welcome pitch.
- **Own "walk-in Lisbon".** Uber Eats structurally cannot curate a restaurant that does not deliver, and that is most of the interesting ones.
- **Use "unlimited free personal saves" as the acquisition wedge**, explicitly contrasted with Mapstr's 300-place cap.

### Moat assessment
**The product concept has no moat.** Six or more independent teams in Iberia alone have built the same thing. Features — map, saves, lists, collaboration, roulette, Google Maps import, Instagram capture, auth-free share pages — all exist elsewhere, and NomNom ships several of them.

**Three things could become a moat, in descending order of durability:**
1. **Local supply density and exclusivity.** A critical mass of Lisbon creators with paying audiences, ideally with some exclusivity, is expensive to replicate and is the only asset Beli or Barhio could not buy quickly. This is the moat. Everything else is a feature.
2. **Two-sided liquidity in a single city.** Enough Lisbon creators and enough Lisbon buyers that both sides show up for each other. Nobody has achieved this anywhere in this category — not even Beli, whose creators reportedly earn little. If NomNom achieves it in Lisbon, that is the defensible thing.
3. **Portuguese-language data and taste graph.** Real but slow-building, and Google can match POI data trivially.

**Three things are not moats, despite feeling like them:** the feature set, the creator-list *concept* (Beli owns the precedent), and being first in Portugal (By Chefs and Uber Eats arrived in July 2026 while this research was being conducted — the window is closing, not opening).

---

## Precedent for paid curated lists

**Does anyone successfully sell this? Answer: yes, people sell it — but there is no verified evidence anyone earns meaningfully from it, and the one platform-scale attempt looks weak.**

### Evidence FOR — it is being sold, and platforms are building rails for it

| Evidence | Detail | Tier | Date |
|---|---|---|---|
| **Beli Paid Guides** — a full production system | Formal "Paid Guides Terms — Subscriber" ToS; creators set their own price and can change it; billed via App Store IAP **or** Stripe direct; auto-renewing; Beli explicitly disclaims being "the offeror or creator" of the guide | **T1** (beliapp.com) | 26 Jul 2026 |
| Beli creator IAP SKUs live on the App Store | Named creator SKUs (`sola`, `TheEricHammer`, `kaitlyneats`) plus generic Creator Subscription at **$5.79/mo, $42.90/yr** (US) and **$7.99/mo, $59.90/yr** (CA) | **T1** (Apple App Store) | 26 Jul 2026 |
| A real Beli creator's real price | Creator "Sue" — 5,000+ restaurants logged, 8,000+ followers — sells NYC guides (e.g. "fav patio vibes") at **$3.99/month or $29.99/year** | **T3** (sosayssauce.substack.com) | 2026 |
| **World of Mouth** — consumers pay for pure curation | **€9.90/mo or ~€46.80/yr** for expert-curated restaurant recommendations, up from €29.90/yr at 2025 launch. 160,000 users. **They raised the price 56%.** | **T1** + T2/T3 | 26 Jul 2026 |
| **Substack food/travel map paywalls** | Creators routinely paywall curated Google Maps of vetted places (e.g. "300 personally vetted spots across Europe", with paid unlocking all maps plus future additions). Substack norms: **$5–$10/mo or $50–$100/yr**, platform takes 10% plus ~3% Stripe | T3 | 2026 |
| Third-party tooling assumes the model works | Mapotic explicitly sells "turn your foodie map into a revenue stream"; Google-Maps-monetisation guides list "curate lists, monetise via sponsorships or affiliates, or sell them as travel products" — and note this is *"niche, but travel content creators have built real income streams this way"* | T3 | 2026 |

### Evidence AGAINST — nobody has shown it works at scale

| Evidence | Detail | Tier | Date |
|---|---|---|---|
| Beli's own creators reportedly earn little | *"I have a feeling that most of these Beli creators aren't earning the big bucks."* Same writer calls the approach *"a little clunky, perhaps a little naïve."* | T3 | 2026 |
| Beli gates the supply side | Creator eligibility requires a **referral threshold**. A self-described Beli obsessive with an audience was **not eligible**. This throttles exactly the supply the marketplace needs. | T3 (first-hand) | 2026 |
| Beli has not publicised it | No press release, no tech-press coverage, no landing page found — only a legal ToS page and App Store IAP entries. A company that believed this was the answer would market it. | T1 inference | 26 Jul 2026 |
| The free alternative is well-funded and Portuguese | **Uber Eats Top Eats** gives Portuguese consumers chef-and-creator curation **for free**, from named national chefs and six established PT food creators, from 9 July 2026 | T1/T2 | 9 Jul 2026 |
| Everyone else in the category monetises the *user*, not the curator | Mapstr, World of Mouth, Nibbl, Savor, Rex, Dinelist all sell a subscription to the app. **Not one operates a creator-payout marketplace.** Mapstr lets you follow chefs and media but not pay them. WoM's 800 experts work for prestige. | T1 | 26 Jul 2026 |
| No revenue figures exist anywhere | **DATA GAP:** no creator earnings, take rate, conversion rate, subscriber count or GMV published by Beli or anyone else | — | — |

### Assessment
The precedent is **real but unproven**. Beli's Paid Guides de-risks the *legal, payments and App Store compliance* path — NomNom does not need to prove the model is permissible, only that it converts. And World of Mouth's €46.80/yr with a price rise is the strongest single piece of evidence that consumers will pay for curated restaurant recommendations from someone they trust.

But **nobody has published a number showing a creator earning a living from restaurant lists**, and the closest thing to a real market — Beli's — is throttled by its own referral gate and appears to be a low-conviction experiment. The honest read for NomNom's financial model: **the price anchors ($3.99/mo, $29.99/yr, €46.80/yr) are solid and verifiable; the conversion and creator-earnings assumptions have no external benchmark and must be treated as unvalidated.**

---

## Source Quality Assessment

| Claim | Source | Tier | Date |
|---|---|---|---|
| Beli Paid Guides exist; creators set price; Stripe + App Store billing | beliapp.com/paid-guides-terms-subscriber | **T1** | Checked 26 Jul 2026 |
| Beli creator subscriptions $5.79/mo, $42.90/yr (US); $7.99/mo, $59.90/yr (CA) | Apple App Store IAP listings, US + CA | **T1** | Checked 26 Jul 2026 |
| Beli Supper Club $74.99/yr (US) / $99.99/yr (CA) | Apple App Store IAP listings | **T1** | Checked 26 Jul 2026 |
| Beli Supper Club $49.99/yr | insiderbits.com listicle | T3 | Undated — **conflicts with T1, discard** |
| Real Beli creator guide at $3.99/mo, $29.99/yr; referral gate on creator eligibility; creators not earning much | sosayssauce.substack.com | T3 | 2026 |
| Beli 4.8★ / 16K ratings | Apple App Store, US | **T1** | Checked 26 Jul 2026 |
| Beli $5.3M Series A, Nov 2023, Goodwater; 45 employees Apr 2026 | Tracxn | T2 | Apr 2026 |
| Beli ~$12M total, FirstMark + G9; 75M+ ratings, 30K cities; 80% under 35 | Wikipedia (sourced); DailyDropout.fyi | T2 | Sept 2025 / Feb 2026 |
| Beli ratings growth curve (2.5M→6M→58M); only 10% international users | startupsignals.substack.com | T3 | 2025 |
| Beli "won't do feed-in ads"; exploring subscriptions | thehoya.com, Georgetown event coverage | T2 | Feb 2026 |
| Mapstr free tier = 300 places; blocked above, never deleted | en.mapstr.com/faq | **T1** | Checked 26 Jul 2026 |
| Mapstr Plus $5.99/mo, $59.90/yr (multiple regional SKUs) | Apple App Store IAP listing | **T1** | Checked 26 Jul 2026 |
| Mapstr 4M+ users, 90 countries, 4.2M sessions/mo, 700K FR newsletter | en.mapstr.com brand + investor pages | **T1** | 2026 |
| Mapstr €1.4M crowd equity 2022 from 2,175 investors; +73% growth; 23% retention | en.mapstr.com/investir-dans-mapstr | **T1** | 2026 |
| Mapstr funding $2.3M (CB Insights) vs $800K (Tracxn) | CB Insights / Tracxn | T2 | 2026 — **sources disagree** |
| Mapstr user revolt over 300-place paywall and annual pricing | Apple App Store + Google Play review text | **T1** (verbatim user reviews) | 2026 |
| Mapstr 4.7★/476 ratings (CA); 4.8★ claimed on site | Apple App Store CA / en.mapstr.com | **T1** | Checked 26 Jul 2026 |
| TheFork: subscription + €2–4/diner commission; own-channel bookings free | theforkmanager.com/pt pricing page | **T1** | Checked 26 Jul 2026 |
| TheFork ~€2.00–€2.60/diner typical, ~€2.30 avg | carbonaraapp.com comparison | T3 | 2026 — **competitor-authored, treat with caution** |
| TheFork €3–4/person on promo bookings; PT restaurants routing off-platform | leak.pt | T3 | 2026 |
| TheFork operates in Portugal among 11+ EU markets; 2,500 MICHELIN venues | restaurantbookingsystem.com / theforkmanager.com | T2 / **T1** | 2026 |
| Google Maps lists free, unlimited, collaborative; mobile-only join flow | support.google.com/maps + GIS StackExchange | **T1** / T3 | Checked 26 Jul 2026 |
| World of Mouth €9.90/mo, €3.90/mo billed annually (~€46.80/yr) | worldofmouth.app | **T1** | Checked 26 Jul 2026 |
| World of Mouth $11.90/mo, $57.00/yr | Apple App Store IAP | **T1** | Checked 26 Jul 2026 |
| World of Mouth launched at €29.90/yr in 2025 | luxuriousmagazine.com | T3 | 2025 — **price has since risen ~56%** |
| World of Mouth 160K users, 750+ experts, 6,000 cities | luxuriousmagazine.com / LinkedIn | T3 | 2025 |
| World of Mouth Lisbon guide (30 restaurants, Belcanto page live) | worldofmouth.app/restaurants/belcanto | **T1** | Checked 26 Jul 2026 |
| World of Mouth team 1–10, 7–8% YoY decline, Helsinki, founded 2018 | LinkedIn company data | T3 | 2026 |
| Uber Eats Top Eats launch, chefs and creators named, PT | eco.sapo.pt; trendy.pt; distribuicaohoje.com | T2 | 9 Jul 2026 |
| By Chefs launched Lisbon + Porto; UAE origin, Alexander Sysoev; 20% own-venue cap | vousair.pt; limacompimenta.com | T3 | 2026 |
| Barhio: free forever, zero ads, IG capture, GMaps import, WhatsApp share, Barcelona-first | barhio.com | **T1** | Checked 26 Jul 2026 |
| Escandalo: Spain, 1–10 staff, follow-only recs, events, "trust can't be scored" | escandaloapp.com + LinkedIn | **T1** / T3 | 7 Jul 2026 |
| Button: Madrid/Barcelona/Sevilla/Málaga/Marbella; Find The Button SL | Apple App Store ES | **T1** | Checked 26 Jul 2026 |
| Vibefy free; collaborative lists; Google-vs-friends rating compare | vibefy.app | **T1** | Checked 26 Jul 2026 |
| Rex (restaurant) $1.99/mo, $14.99/yr, $29.99 lifetime; Apple Maps; "Pick for Me" | Apple App Store listing | **T1** | Checked 26 Jul 2026 |
| Rex name collisions: rex.inc (YC S26, fintech); Rex Entertainment (Austin, TV/film) | rex.inc/blog; LinkedIn | **T1** / T3 | Jun 2026 |
| Truffle (thetruffleapp.com): social tracking, IG Story auto-tracking, Letterboxd framing | thetruffleapp.com | **T1** | Checked 26 Jul 2026 |
| Truffle name collision: usetruffle.ai, YC S26, $500K Jun 2026 — **different company** | aventure.vc; ycombinator.com | T2 / **T1** | Jun 2026 |
| Savor Pro $4.99/mo; dish-first, 10-point scale | Apple App Store listing | **T1** | Checked 26 Jul 2026 |
| Nibbl $4.99/mo, $12.99/qtr, $39.99/yr; daily swipe limits on free | Apple App Store listing | **T1** | Checked 26 Jul 2026 |
| Dinelist $7.99/mo, $49.99/yr, $89.99 lifetime; 5.0★ from 2 ratings | Apple App Store listing | **T1** | Checked 26 Jul 2026 |
| NomNomad live iOS+Android, AI vision from TikTok/Reels, free to start | nomnomad.ai; LinkedIn | **T1** / T3 | 26 Jun 2026 |
| DIG-IN = rebranded Zomato PT; 100K+ Android DLs; 2M views/mo claim; rank #56 PT F&D | Google Play; App Store; AppBrain | **T1** / T2 | Last app update 27 Feb 2025 |
| DIG-IN PRO plans of 1/3/6/12 months; Lisboa/Porto/Algarve; 50% and 80% off campaigns | dig-in.pt/products + campaign regulations | **T1** | 2026 |
| Substack norms $5–10/mo, $50–100/yr; 10% platform + ~3% Stripe | YouTube monetisation guide | T3 | 2026 — **low confidence, illustrative only** |
| US restaurant/delivery app downloads plateauing; food blog/coupon subgenre +52% YoY | sensortower.com State of Mobile 2026 | T2 | 2026 |

---

## Data Gaps

**Pricing gaps (highest priority — these directly affect the financial model):**
1. **DATA GAP: DIG-IN PRO exact prices.** Plan lengths (1/3/6/12 months) confirmed, prices not published on web or app store. This is the most important missing number in the document — it is the only Portuguese consumer-paid restaurant subscription found, and would be the truest local willingness-to-pay anchor. **Recommended action: install DIG-IN and read the in-app PRO paywall.**
2. **DATA GAP: TheFork Portugal restaurant subscription tier prices.** Never published; negotiated per-restaurant. Only the €2–4/diner commission is externally estimable, and that estimate comes partly from a competitor's marketing page.
3. **DATA GAP: Beli's take rate on creator Paid Guides.** The ToS does not state Beli's cut. Without it, no benchmark exists for NomNom's revenue share.
4. **DATA GAP: Truffle, Escandalo, Button, Vibefy, Barhio, By Chefs, Dinver, MenuScouter, Memolli, NomNomad, NomlyAI pricing.** All present as free or have no published tiers.
5. **DATA GAP: Mygon pricing** and business model detail.
6. **INCONSISTENCY: Mapstr Plus.** App Store advertises a 7-day free trial; the official FAQ states no free trial is offered because AI search costs too much. Multiple regional SKUs ($5.99, $8.99, $32.99, $59.90, $59.99) make the true headline price ambiguous.

**Funding and team gaps:**
7. **DISAGREEMENT: Beli total funding.** $5.3M (Tracxn, only recorded round) vs ~$12M (company-stated, Wikipedia/DailyDropout). Unreconciled.
8. **DISAGREEMENT: Mapstr total funding.** $800K (Tracxn) vs $2.3M (CB Insights) vs €1.4M crowd equity 2022 (company). Unreconciled.
9. **DATA GAP: World of Mouth funding.** Only "the support of food-loving investors". No amounts, no investor names, no round dates.
10. **DATA GAP: Barhio, Escandalo, Button, Vibefy, By Chefs, Truffle, Savor, Rex(restaurant) funding and team size.** No records in any tracker.
11. **DATA GAP: TheFork Portugal headcount** and Portugal-specific P&L.

**Traction gaps:**
12. **DATA GAP: download estimates.** No Sensor Tower / data.ai app-level download figures were retrievable for any competitor. Only DIG-IN's Google Play band (100K+) and Beli/Mapstr App Store rating counts are verified.
13. **DATA GAP: Beli DAU/MAU** — the company explicitly refuses to disclose it. All growth claims rest on cumulative ratings, which the T3 analysis argues overstates active usage.
14. **DATA GAP: app store ratings and review counts** for World of Mouth, Truffle, Savor, Rex, Barhio, Escandalo, Button, Vibefy.
15. **DATA GAP: Portugal-specific user numbers** for TheFork, Google Maps lists, Uber Eats, or any player. Nothing published.
16. **DATA GAP: no job postings** were retrieved for any competitor; hiring-signal analysis was not possible in this round.

**Roster gaps:**
17. **UNVERIFIED: Nomblr.** Three targeted searches failed to surface a company site, App Store listing, funding record or team for "Nomblr". The only exact-name match is an archived 2010–2012 Python GitHub repo. The prior internal research's description ("a shared place to keep restaurant recommendations from people you trust", "trusted crews") could not be confirmed against any primary source. **Recommendation: treat as unverified and possibly a misidentification — do not carry into the competitive set without a direct App Store link.**
18. **PROBABLE PRIOR ERROR: Rex.** The "$3.96M seed, Accel/Khosla/Future Positive, June 2023" entity did not surface. Three unrelated Rex companies now exist, none matching. **Do not carry the $3.96M figure forward.**
19. **PROBABLE PRIOR ERROR: Truffle funding.** Any Truffle funding figure is likely from usetruffle.ai (YC S26, $500K, AI back-of-house), not thetruffleapp.com (the social tracker). Verify before reuse.
20. **NOT INVESTIGATED this round:** Crumble (no evidence found that a restaurant-list app of this name exists — possible confusion with Crumbl, the US cookie chain, which appeared in Sensor Tower QSR data), Feast, Shareables, Someday Map, Drawer, Resy shareable lists, Seek Recs ($4M, per Tracxn's Beli competitor table — confirmed to exist but not profiled), Hooked ($549K, Tracxn), Time Out / NiT / Lifecooler Portuguese guides.
21. **DATA GAP: Dinver** (dinver.eu) — a European social restaurant app with receipt-scan verification. Country of operation, pricing, funding and traction all unknown. Worth a dedicated look given it is EU-based and the receipt-verification mechanic is genuinely novel.
