# Pre-Flight Check

**Phase:** 0.5 — Pre-Flight Check
**Project:** nomnom
**Date:** 26 July 2026
**Confidence:** Medium — three targeted searches, five minutes. This is a heads-up, not an analysis.

---

## 1. Dominant solution check

**Verdict: no incumbent occupies NomNom's exact shape, but two entrenched defaults own the behaviour.**

| Player | Position | Evidence |
|---|---|---|
| **Beli** | Category leader for "social restaurant list-keeping" | $12M raised total (Goodwater Capital, FirstMark Capital, G9 Ventures); Series A $5.3M Nov 2023; 75–80M+ ratings logged; ~80% of users under 35 **[Data, Wikipedia / Tracxn / Apple App Store editorial, 2026 — Tier 1–2]** |
| **Rex** | Same concept, place recommendations from friends | $3.96M seed (Accel, Khosla, Biz Stone's Future Positive), launched June 2023, **no revenue at launch** **[Data, TechCrunch 2023 — Tier 2]** |
| **Seek Recs** | Curated expert food recommendations | $4M raised **[Data, Tracxn — Tier 2]** |
| **Google Maps saved lists + Instagram/TikTok saves** | **The actual incumbent** | Named as the current stack in NomNom's own persona work: "Guardados + Google Maps + screenshots + WhatsApp" **[Data, `docs/marketing-brief-portugal-ugc.md`]** |

Beli is US-centric — NYC-founded, US-city coverage in all available reporting, and its own review complaints concern US and China database gaps **[Data, `docs/competitor-review-mining.md`, 25 July 2026]**. A five-minute check surfaced **no Portugal-focused player in NomNom's exact shape** (creators + real people → concrete, saveable venue, with paid creator lists).

> **CORRECTION — superseded by Phase 3 Wave 2 research, 26 July 2026.** The claim immediately above is **wrong**, and the five-minute pre-flight budget is why it was missed. **TheFork launched "TheFork Feed" on 15 July 2025 across all 11 of its markets, Portugal included**: follow friends, chefs, and influencers; creator-curated Lists; one-tap booking directly from a List; and AI conversational search in beta. Creator public profiles are on its stated roadmap and were piloted with named Italian creators **[Data, Agent B2, `01-discovery/raw/indirect-competitors.md`]**. TheFork is the Portuguese incumbent, was acquired by American Express for roughly $700M, and **already owns the transaction** that Zesty's post-mortem identified as the decisive advantage. The authoritative competitive assessment lives in `01-discovery/competitor-landscape.md`; treat this section as the historical pre-flight record, not as current fact.

**[Opinion]** The competitive reality is not "an incumbent will crush you." It is that the incumbent is a *habit* — the Saved folder — and habits do not respond to feature superiority.

## 2. Precedent failure check

**Verdict: one very close, very recent failure that this process must take seriously.**

**DoorDash shut down Zesty in April 2026, roughly four months after its December 2025 launch** in New York and the San Francisco Bay Area **[Data, RestaurantTechnologyNews / Eatzy, April 2026 — Tier 2]**.

Zesty's design was a close match to NomNom's:

- Answered "where should I go" rather than "what should I order"
- Aggregated data from Google Maps, social media, and first-party sources
- Included a social feed for photos and dining experiences

The stated failure reasons matter more than the shutdown itself:

1. **Discovery habits are already entrenched** across Google Maps, Yelp, Instagram, and TikTok. Convincing users to adopt another dedicated app was the binding constraint, not recommendation quality.
2. **Discovery sits at the top of the funnel while the transaction happens elsewhere**, so a standalone discovery product struggles to monetise.
3. DoorDash's response was to fold the features into the app that already owned the transaction.

Corroborating cases:

- **Rex** (2023, well-funded, near-identical concept) was not generating revenue via ads, subscriptions, or IAP at launch **[Data, TechCrunch — Tier 2]**.
- **StrollUp** shut down after two bootstrapped years, citing low incremental value over incumbents plus a chicken-and-egg supply problem **[Data, Inc42 founder post-mortem — Tier 3, but first-party]**.
- **Zomato exited Portugal** and liquidated its Portuguese subsidiary in July 2023 with no active operations **[Data, `docs/competitor-review-mining.md` — Tier 2]**.

**[Red Flag — carried into Phase 3]** NomNom currently has the precise structure that killed Zesty: a top-of-funnel discovery product where the payment path is **not live** — `POST /api/webhooks` returns 410 and creator purchase flows are listed as non-goals **[Data, `docs/PRD.md`]**. Zesty had a parent company with a transaction to fall back on. NomNom does not.

This is not disqualifying. DoorDash had no incentive to fight for a standalone app, and NomNom's creator-monetisation model is a materially different business from Zesty's. But the burden of proof sits here.

## 3. Regulatory / legal instant-kill check

**Verdict: no instant kill. Three real obligations, all survivable, none free.**

**a. Portuguese advertising law — `Código da Publicidade`, art. 8 (identifiability)**
Commercial content must be identified clearly and unambiguously **at the start** of a publication. Fines reach **€45,000**, and liability extends beyond the creator to the *anunciante*, the *agência*, and the *titular do suporte publicitário* — the platform hosting the ad **[Data, Direção-Geral do Consumidor "Guia Informativo — Marketing de Influência" 2025; Abreu Advogados — Tier 1–2]**.

Directly load-bearing: `docs/marketing-brief-portugal-ugc.md` already commits to sponsored spots existing and being marked, and `docs/competitor-review-mining.md` idea #7 proposes a mandatory disclosure badge. That badge is not a nice-to-have differentiator — it is closer to a legal requirement once money changes hands.

**b. EU Digital Services Act (Regulation 2022/2065)**
As a hosting service for user-generated content, NomNom owes — **at any size** — a notice-and-action mechanism under Article 16, expeditious action on flagged illegal content, reasons given to users whose content is removed, and an interface free of dark patterns **[Data, Regulation 2022/2065; European Commission DSA guidance — Tier 1]**.

The heavier "online platform" duties — internal complaint handling (art. 20), out-of-court dispute settlement (art. 21), trusted flaggers (art. 22), and trader traceability / KYBC (art. 30) — **exempt micro and small enterprises** under 50 staff and €10M turnover (art. 19). NomNom is comfortably exempt today, and for 12 months after outgrowing that status.

**c. Paying creators**
Snapshot and Subscription payouts make NomNom a payer to EU individuals. Portuguese creators must register as self-employed, invoice, and declare the income including payments in kind **[Data, Portuguese tax guidance — Tier 3]**. Whether platform-level reporting obligations (DAC7-style) attach to sales of digital content is **[Unverified — needs a lawyer's hour]**, not something to guess at.

**No obvious regulatory blocker identified for Portugal or the EU.**

---

## Summary as presented to the founder

```
## Pre-Flight Check

⚠️  No incumbent in this exact shape — but Beli owns the category in the US ($12M,
    ~80M ratings) and Google Maps + Instagram saves own the actual behaviour.
    No Portugal-focused equivalent found.
🔴 DoorDash killed Zesty in April 2026, ~4 months after launch — near-identical
    product. Reason: entrenched habits, and top-of-funnel discovery can't monetise
    when the transaction happens elsewhere. NomNom has the same structure today,
    with payment webhooks disabled.
✅  No regulatory instant-kill. Three real duties: PT ad-disclosure law (platform
    co-liable, €45k), DSA notice-and-action (required at any size), creator payout
    tax hygiene.

→ Ready to proceed to intake. The above is context, not a verdict.
```

---

## Flags

**Red Flags:**
- Zesty's April 2026 shutdown is the closest available natural experiment for this product category, and it failed on distribution and monetisation — the two things NomNom has least evidence for. Carried into Phase 3 Wave 2 and the Phase 3.5 research gate.

**Yellow Flags:**
- The category crowded sharply in 2025–26: Nomblr, Feast, Shareables, Savor, Crumble, Truffle, Mapstr, Resy shareable lists **[Data, `docs/competitor-review-mining.md`]**. Differentiation on features alone is unlikely to hold.
- **Nomblr** positions as "a shared place to keep restaurant recommendations from people you trust" — near-identical positioning *and* a confusable name. Trademark and SEO check needed before the next brand push.
- Portuguese ad-disclosure liability reaches the platform, not just the creator. Product-level enforcement of the disclosure badge is required before any sponsored placement ships.

## Sources

- [Beli (app) — Wikipedia](https://en.wikipedia.org/wiki/Beli_(app)) — Tier 2
- [Beli — Tracxn company profile 2026](https://tracxn.com/d/companies/beli/__dGog-htkIGO9dxx0slXqdOmKWXD_C9Gm8V6ij9YUamA) — Tier 2
- [Beli — CB Insights](https://www.cbinsights.com/company/beli) — Tier 2
- [Rex launch — TechCrunch, June 2023](https://techcrunch.com/2023/06/12/rexs-new-app-makes-it-easy-to-discover-and-share-recommended-places-with-friends/) — Tier 2
- [DoorDash shuts down Zesty — RestaurantTechnologyNews, April 2026](https://restauranttechnologynews.com/2026/04/doordash-shuts-down-zesty-and-brings-restaurant-ai-discovery-into-core-app/) — Tier 2
- [DoorDash winds down Zesty — Eatzy, 8 April 2026](https://eatzy.net/2026/04/08/doordash-winds-down-restaurant-discovery-app-zesty/) — Tier 2
- [Why we shut down StrollUp — Inc42](https://inc42.com/startups/4-reasons-shutdown-strollup/) — Tier 3, first-party post-mortem
- [DGC — Guia Informativo: Marketing de Influência, 2025](https://www.terraruiva.pt/wp-content/uploads/2025/11/DGC_Guia-Informativo_Marketing-de-Influencia-1.pdf) — Tier 1
- [Publicidade online: as regras para influenciadores — Abreu Advogados](https://abreuadvogados.com/conhecimento/publicacoes/artigos/publicidade-online-as-regras-para-influenciadores-e-anunciantes/) — Tier 2
- [Regulation (EU) 2022/2065 — Digital Services Act, EUR-Lex](https://eur-lex.europa.eu/legal-content/en/TXT/PDF/?uri=CELEX%3A32022R2065) — Tier 1
- [DSA notice-and-action mechanism — European Commission](https://digital-strategy.ec.europa.eu/en/policies/dsa-notice-and-action-mechanism) — Tier 1
- [The Digital Services Act: Practical Implications — Latham & Watkins](https://www.lw.com/admin/upload/SiteAttachments/Digital-Services-Act-Practical-Implications-for-Online-Services-and-Platforms.pdf) — Tier 2
- Internal: `docs/PRD.md`, `docs/marketing-brief-portugal-ugc.md`, `docs/competitor-review-mining.md`, `BRAND.md`
