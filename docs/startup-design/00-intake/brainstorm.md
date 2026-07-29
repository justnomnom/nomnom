# Brainstorm — Strategic Variations

**Phase:** 2 — Brainstorm *(adapted: variations of an existing product, not blue-sky alternatives)*
**Project:** nomnom
**Date:** 26 July 2026
**Confidence:** Medium — the variations are grounded in the repository and in pre-flight evidence, but none is validated with customers. Every recommendation here is `[Opinion]` until Phase 3 research and interviews test it.

---

## Why this phase exists even though the product is built

NomNom at v5.7.0 contains **at least six different products**: a discovery feed, a map, a list manager, a collaboration tool, a decision-maker (Roulette), and a creator marketplace. That is not a criticism of the engineering — it is a description of the strategic problem. All six are shipped, none is the declared spearhead, and the pre-flight evidence says the thing that kills products in this category is **distribution**, not feature coverage.

So the useful question is not "what else could NomNom be?" It is: **which of the products already in the box should carry the distribution burden, and which should retreat to being supporting features?**

The organising constraint, from `00-intake/preflight.md`:

> DoorDash killed Zesty in four months because discovery habits are entrenched and top-of-funnel discovery cannot monetise when the transaction happens elsewhere.

Each variation below is judged primarily on **does it have a distribution mechanism that does not require convincing someone to install and adopt a new app?**

---

## The variations

### V1 — The Saved-Folder Rescue *(import-first)*

**The bet:** The headline is not "discover restaurants." It is *"You've saved 200 places on Instagram. You've been to six."*

The lead product becomes ingest: share-sheet capture of a Reel or TikTok, venue parsed and matched to a restaurant, dropped into a list — **carrying visited state**, not dumping everything into one undifferentiated want-to-go pile. Discovery becomes the byproduct of a cleaned-up personal archive.

**Exciting:** The pain is felt, articulated, and already being paid for. An entire cottage industry — Someday Map, Drawer, Rtriv, Stasht — exists purely to bulk-import social saves, which is proven demand, and none of them does Portugal well **[Data, `docs/competitor-review-mining.md` idea #3]**. It is a *migration* pitch rather than an *adoption* pitch: you already have the data, we make it usable. The Google Maps importer already exists in the repo. And it answers the single most actionable line in the competitor research — users explicitly ask to import Google Maps lists *and reviews as "been"* **[Data, idea #15]**.

**Risky:** Platform dependency is severe. Instagram share-sheet parsing is fragile, undocumented, and can be broken or prohibited without notice — this is the same platform risk that shapes every company built on someone else's graph. Import is also a **one-time** value event; it does not by itself create a habit. And it makes NomNom a utility, which is harder to monetise than a community.

**Changes the competitive landscape:** Moves the fight away from Beli (a logging and ranking app) and toward the importer tools, which are small, unfunded, and geographically generic.

---

### V2 — The Group Decision Engine *(the shareable-list / group-decide wedge)*

**The bet:** Narrow hard onto Tiago, the secondary persona — *"Preciso de três sítios credíveis até quarta, com política de grupos."* The product is a shortlist you send into a group chat, where people vote or spin, and it works **without anyone installing anything**.

**Exciting:** This is the only variation whose **distribution mechanism is the product itself**. The artefact travels as a public list link into the group chat where the decision already happens, and every recipient is an impression. Nobody in the competitive set does group decision-making — every list app stops at the list **[Data, `docs/competitor-review-mining.md` idea #11 and cross-cutting theme 5]**. Roulette is already half-built, `/lists/[id]` is already public and auth-free, and WhatsApp is already named as the primary coordination channel for both P0 and P1 personas (status quo — not NomNom’s product identity). The decision moment is also high-intent, which is where monetisation can eventually attach.

**Risky:** Group decisions are episodic — maybe two to four times a month — so engagement is inherently low-frequency. The link-first design deliberately avoids requiring accounts, which caps the data you collect. And "sharing a shortlist" is easy to copy: TheFork or Google could ship it, though neither has bothered in a decade.

**Changes the competitive landscape:** Sidesteps the entire social-list category. The real competitor becomes a WhatsApp message with three names in it.

---

### V3 — Locals Eat Here *(the Portugal-native defensibility play)*

**The bet:** Lead with a **locals-versus-visitors signal** — derived from who saves and returns to a spot, not from review volume — surfaced as a visible badge and filter. Tripadvisor's rankings route visitors to exactly the places locals call traps; this is the deliberate inverse.

**Exciting:** The most structurally defensible idea in the repository **[Data, `docs/competitor-review-mining.md` idea #20]**. TheFork and Tripadvisor cannot bolt this on, because their data is booking volume and tourist reviews — the very signals that produce the wrong answer. The heuristics locals actually use (Portuguese-only menu, off the tourist grid, full of locals at lunch, handwritten daily menu) are encodable. It also lands at a moment when roughly one in ten Google reviews is estimated fake, so "trust" is a live, felt problem rather than a marketing abstraction.

**Risky:** Textbook chicken-and-egg. The signal requires a dense base of *resident* users before it means anything, and until then it is a claim rather than a computation — which would violate `BRAND.md`'s own rule against superlatives without proof, and its rule that "verified" needs a clear in-product criterion. There is also a monetisation inversion: tourists have the higher willingness to pay for this, and tourists are transient, one-trip users with terrible retention.

**Changes the competitive landscape:** Creates a category of one, but only after critical mass. It is a moat, not a wedge — the right positioning to *earn*, the wrong thing to launch on.

---

### V4 — Creator Marketplace, sharpened *(the current declared plan)*

**The bet:** Supply side first. Recruit 20–30 Lisbon micro-creators, give each a link-in-bio destination that maps clip → door with real attribution, then monetise through Snapshot (one-time list purchase) and Subscription (monthly access), with marked sponsored placements.

**Exciting:** This is the direct answer to the Zesty problem — **creators bring their own distribution**, so NomNom does not have to buy attention. It addresses a real creator pain: repeated "onde é?" DMs and vague visit attribution **[Data, `docs/marketing-brief-portugal-ugc.md` ICP 3]**. Both purchase types are already specified in `BRAND.md`, the Stripe path is scaffolded, and creator-paid content is a proven model in general.

**Risky, and this is the arithmetic that needs facing:** at Portuguese micro-creator scale the money is very small. A creator with 20,000 local followers converting 1% at €5 a Snapshot earns €1,000 gross once — and 1% is an optimistic assumption for a paid digital product with no track record. Subscriptions at €3–5/month against a few hundred subscribers is pocket change, and creators will not sustain effort for pocket change. Consumer willingness to pay for a *restaurant list* is entirely unproven, and it competes with free: the same creator's Instagram grid. Meanwhile the payment path is switched off in code today (`/api/webhooks` → 410), and Portuguese ad-disclosure law makes the platform co-liable for undisclosed sponsorship up to €45,000.

**Changes the competitive landscape:** Moves NomNom from "discovery app" to "creator monetisation tool", where the competitors become Patreon, Substack, Beacons, and the creator's own Linktree.

---

### V5 — Be a link, not an app *(the anti-install variation)*

**The bet:** Take literally the lesson that people do not want another app. Lead with surfaces that need **no installation**: public list pages, creator link-in-bio pages, SEO-targeted city and neighbourhood tools in the style of the existing `/roleta/lisboa`, and lists that read well as a shared public link. The app becomes the power-user upgrade, not the entry point.

**Exciting:** Directly attacks the documented cause of death in this category. The repo is unusually well positioned for it — `/lists/[id]`, `/u/[username]`, and `/roleta/lisboa` are already public and auth-free, which is a genuine advantage over Beli and Mapstr, both of which are app-walled **[Data, `docs/competitor-review-mining.md` §5]**. It opens an SEO surface that no competitor in the set is contesting in Portuguese, and it turns every shared list into an acquisition asset instead of a dead end.

**Risky:** Web-first retention is structurally weaker — no home-screen icon, no push notification (though Web Push exists in the repo), no App Store surface. It also partially strands the Capacitor investment already made in `ios/` and `android/`. And SEO in Portuguese for restaurant queries means competing with Time Out, NiT, and Lifecooler, who have years of domain authority.

**Changes the competitive landscape:** Reframes NomNom against local media and guides rather than against apps.

---

### V6 — One occasion only *(the narrowing variation)*

**The bet:** Pick a single occasion and own it completely — brunch, or date night, or "somewhere new tonight" — instead of all restaurants for all purposes.

**Exciting:** Collapses the cold-start problem, because you need dozens of good spots rather than thousands. Makes the value proposition explainable in one line. And it fixes a real complaint about Beli: forced pairwise ranking of a Korean BBQ against a brunch spot produces unstable, meaningless scores, whereas ranking *within* an occasion is coherent **[Data, `docs/competitor-review-mining.md` idea #8]**. `BRAND.md` already treats occasions as first-class with named chips like `Date Night` and `Hidden Gems`.

**Risky:** Occasion-specific apps have a low ceiling and a natural expansion problem — succeeding at brunch does not obviously earn the right to dinner. It also throws away most of the shipped surface area. Feels like a marketing narrowing rather than a genuine product strategy.

**Changes the competitive landscape:** Little. Same competitors, smaller battlefield.

---

### V7 — The 10x version: a WhatsApp concierge

**The bet:** No app at all. A WhatsApp number you message — *"onde jantar hoje em Alfama, 2 pessoas, até €25"* — that answers from your circle's saves and the creator graph.

**Exciting:** Meets users in the exact channel where the decision is already being argued about, with zero install and zero learning curve. Conversational search was the one part of Zesty that DoorDash judged worth keeping. Portugal is a WhatsApp-first market. If it worked, it would be a genuinely new interaction model for the category rather than a better list app.

**Risky:** Substantial new build against a codebase with no AI surface at all — `docs/PRD.md` states plainly that there are no LLM or agent loops in `src/`. Per-message inference cost against a free consumer product is a poor unit-economics story. WhatsApp Business API pricing and policy add platform risk on top. And the answer quality depends on exactly the dense local data NomNom does not yet have.

**Changes the competitive landscape:** Competes with ChatGPT and Google's AI answers, which is a fight to avoid picking in 2026.

---

### V8 — The simplest possible version: one public page

**The bet:** A single public page — *the spots Lisbon creators actually save this month* — updated weekly, with email capture and nothing else. Buildable in days from data already in Supabase.

**Exciting:** It is the cheapest possible demand test, and it can run **this week** rather than after another feature cycle. Real traffic, real email signups, and real search-intent data replace speculation. It also feeds V5's SEO thesis and doubles as creator outreach material ("you're on this page — want to claim your profile?").

**Risky:** Proves interest in content, not in a product, and certainly not in paying. Easy to mistake a traffic spike for product-market fit — the vanity-metrics trap. Not a business by itself.

**Changes the competitive landscape:** Nothing. It is an instrument, not a strategy — but it is the instrument this project most conspicuously lacks.

---

## Comparison

| # | Variation | Distribution mechanism | Monetisation path | Cold-start difficulty | Reuses what's built |
|---|---|---|---|---|---|
| V1 | Saved-Folder Rescue | Migration pitch + word of mouth; **platform-dependent** | Weak — utility | Low (user brings own data) | High — importer exists |
| V2 | Group Decision Engine | **The artefact is the distribution** (public list link) | Medium — high-intent moment | Low (needs 3 spots, not 300) | High — Roulette + public lists |
| V3 | Locals Eat Here | None inherent | Medium — tourists pay, don't retain | **High** — needs resident density | Medium — needs new signal |
| V4 | Creator Marketplace | **Creators bring audiences** | Specified, but arithmetic is thin | Medium — needs 20–30 creators | High — Stripe scaffolded, webhooks off |
| V5 | Be a link, not an app | SEO + shared pages, no install | Deferred | Low | **Highest** — public routes exist |
| V6 | One occasion only | None inherent | Same as parent | Low | Low — discards surface |
| V7 | WhatsApp concierge | Channel-native, no install | Poor — inference cost | High | **Lowest** — no AI in codebase |
| V8 | One public page | SEO + creator outreach | None | None | High — data in Supabase |

---

## Convergence

**[Opinion]** The variations are not mutually exclusive, and treating them as a menu is the mistake to avoid. Read as a stack, they resolve into a coherent sequence — and the sequencing is the actual strategic decision:

**Distribution layer — V2 + V5.** These are the only two variations with a distribution mechanism that does not require convincing a stranger to install an app, which is precisely what killed the closest comparable. They also happen to be the cheapest, because the public auth-free routes and Roulette already exist. **This is where the bet should go.**

**Acquisition wedge — V1.** The strongest reason for a *new* person to arrive, with demonstrated demand and a migration rather than adoption pitch. Sequence it second, and accept the platform fragility with eyes open.

**Defensible positioning to earn — V3.** The right long-run moat and the wrong launch story, because the signal is meaningless until resident density exists. Build toward it; do not lead with it.

**Monetisation — V4, held to a later phase and stress-tested.** Not abandoned, but the arithmetic in Phase 7 needs to survive contact with real Portuguese creator audience sizes before more engineering goes into the payment path. If Snapshot at plausible volumes yields a creator €40 a month, creators will not show up, and no amount of product polish fixes that.

**Instrument to run immediately — V8.** Not a strategy. But it is the one thing on this list that produces real evidence within a week, and this project's binding deficiency is evidence, not features.

**Explicitly deprioritised:** V6 narrows without solving distribution. V7 is a large new build against the wrong 2026 competitor.

**The refined idea, in one sentence:** *NomNom is the fastest way for a group of friends in Lisbon to decide where to eat tonight — from spots real people and creators actually saved — and it works from a public list link before it ever asks you to install anything.*

That is a narrower claim than "discover restaurants through creators and real people", and it keeps creators as the **supply** and trust story rather than the launch mechanism.

**This convergence has not been tested with a single customer.** It is reasoning from competitor complaints and one recent failure, which is better than nothing and worse than five interviews. Phase 3.7 exists precisely to fix that, and Phase 3 research will test whether the V2/V5 distribution thesis holds up against evidence.

---

## Flags

**Red Flags:**
- Every variation here is `[Opinion]` derived from secondary research. Choosing between them on this basis alone would repeat the mistake that produced six half-spearheaded products.
- V4, the currently declared business model, has the weakest arithmetic of any variation once Portuguese micro-creator audience sizes are taken seriously. Phase 7 must stress-test it explicitly rather than assume it.

**Yellow Flags:**
- V1's dependence on Instagram and TikTok share-sheet parsing is an uncontrollable platform risk; it should never become the only acquisition channel.
- V3 risks a `BRAND.md` violation — a "locals eat here" badge is a claim requiring proof, and the guide forbids superlatives without evidence and undefined "verified" labels.
- V5 partially strands the Capacitor iOS and Android investment already made. That sunk cost should not drive the decision, but the founder should make the trade knowingly.
- Choosing a narrower spearhead means visibly deprioritising shipped features. That is emotionally harder than building new ones, and it is the actual work of this phase.

## Sources

- `docs/competitor-review-mining.md`, 25 July 2026 — complaint themes and the 20 ranked ideas that seeded V1, V2, V3, and V6 — Tier 2, internal
- `docs/marketing-brief-portugal-ugc.md` — personas and ICPs behind V2 and V4 — Tier 1, first-party
- `docs/PRD.md` — shipped surface, payment non-goals, absence of any AI layer — Tier 1, first-party
- `BRAND.md` — Snapshot and Subscription definitions, occasion chips, evidence and "verified" rules — Tier 1, first-party
- `docs/startup-design/00-intake/preflight.md` — the Zesty failure analysis that frames the distribution test — Tier 2
