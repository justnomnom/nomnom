# Geographic & Market Entry Analysis: Portugal (NomNom)

**Agent:** D2 — Geographic & Market Entry
**Date:** 26 July 2026

---

## Target geography data

All population figures are INE resident-population estimates. Restaurant counts mix two different units — **enterprises** (CAE 56, INE/GEE, 2024 reference year, published Dec 2025) and **establishments** (INE SCIE 2023 via Câmara Municipal de Lisboa). These are not interchangeable; one enterprise can run several establishments. Where the unit differs it is labelled.

| City / Region | Population | Restaurants (CAE 56) | Tourist arrivals & nights (2025) | Resident : tourist demand | Competitive intensity | Source |
|---|---|---|---|---|---|---|
| **Portugal** | 11,424,031 (31 Dec 2025) | 74,524 enterprises; 324,130 employed; €15.7bn turnover (2024) | 32.5M guests / 82.1M nights; €7.15bn accommodation revenue | 69.4% of nights non-resident | DIG-IN, Google, TripAdvisor, Zomato-legacy | INE (Jun 2026); GEE/INE CAE 56 (Dec 2025); INE prelim. (Jan 2026) |
| **Grande Lisboa** (NUTS III) | 2,415,261 (2025) | 15,538 enterprises (20.8% of PT); 112,753 employed (34.8%); €5.85bn turnover (37.2%) | — | **81.4% of nights from foreign markets — highest on the mainland** | Highest in country | INE (Jun 2026); GEE/INE (Dec 2025); INE via RTP (Jan 2026) |
| **AML** (18 municipalities) | ~3,000,000 | 15,538 + 5,364 (Península de Setúbal) ≈ 20,900 enterprises | 9,531,087 guests (+5%); 21,268,789 nights (+1.2%); €2.16bn revenue | 16.84M foreign vs 4.43M domestic nights = **79% foreign** | Highest in country | CM Lisboa (2025); INE via Ambitur (2026) |
| **Lisboa (município)** | 658,236 (2025) | 7,549 **establishments** (restauração e similares, SCIE 2023) | ~16M nights — largest single municipality in Portugal | see arithmetic below | Highest in country | Pordata/INE (2025); CM Lisboa (2025); INE via JPN (Feb 2026) |
| **AMP** | ~1,800,000 (2023) | Norte region total 23,442 enterprises (31.5% of PT); AMP subset not isolated → **DATA GAP** | ~5M guests (AMP) | — | Moderate | GEE (2023); INE via JN (Apr 2026) |
| **Porto (município)** | 273,476 (2025) | **DATA GAP** (no municipality-level CAE 56 count found) | 3M+ guests (+2.84%); 6,602,600 nights (+5.2%); €501.1M revenue to Nov | — | Moderate | Pordata/INE (2025); CM Porto via JN (Feb 2026) |
| **V.N. Gaia** | — | — | 620k+ guests; 1M+ nights | — | Low | INE via JPN (Feb 2026) |
| **Matosinhos** | — | — | 350k+ guests; 595,303 nights (only AMP municipality to fall) | — | Low | INE via JPN (Feb 2026) |
| **Braga** | 203,519 (2024); +4.2% 2021–24 | Norte aggregate only → **DATA GAP** | **DATA GAP** | — | Low | Pordata/INE (2024) |
| **Coimbra** | 156,359 (2025) | Centro region 10,590 enterprises | **DATA GAP** | Centro region: only 31.8% of nights foreign | Low | Pordata/INE (2025); GEE (Dec 2025); INE (Jan 2026) |
| **Aveiro** | 88,154 (2024); +6.7% 2021–24 | Centro region aggregate | **DATA GAP** | as Centro | Very low | Pordata/INE (2024) |
| **Faro / Algarve** | Faro município **DATA GAP** | Algarve 6,719 enterprises (9.0% of PT); €1,476M turnover | Albufeira alone 7.5M nights; Algarve 81.4% foreign nights | Extreme tourist skew + hard seasonality | Low local, high transient | GEE (Dec 2025); INE via ECO (Aug 2025); INE via JPN (Feb 2026) |

**Ecosystem-relevant overlay:** Startup Portugal / Informa D&B (2025) count 5,091 active startups; **45% in Lisbon, 16% in Porto**, with Braga, Setúbal and Aveiro growing >5% YoY. Talent and creator supply concentrate where the startups already are.

---

## The tourism distortion problem

### Is Lisbon's restaurant market majority-tourist?

**Citywide, no. In the historic core, almost certainly yes.** This distinction is the single most important geographic finding in this report, and it changes the recommendation.

**The arithmetic** `[Estimate]` — no source publishes a tourist-vs-resident restaurant revenue split for Lisbon, so this is constructed from verified inputs:

*Resident meal demand, Lisboa município:*
- 658,236 residents (INE, 2025). Assume ~85% are of restaurant-going age → 559,500.
- Assume 3 restaurant/café meals eaten out per week (mid estimate for an urban Southern-European population).
- 559,500 × 3 × 52 = **~87.3M resident restaurant meals/year.**

*Tourist meal demand, Lisboa município:*
- ~16M registered accommodation nights (INE via JPN, Feb 2026) ÷ 365 = **~43,800 tourists physically present on an average night.**
- 16M tourist-days × 1.7 restaurant meals/day (tourists eat out far more than residents) = **~27.2M tourist meals/year.**
- Excludes cruise passengers, day-trippers from Cascais/Sintra/Setúbal, and business day visitors — all of which push this number up. Also excludes the counter-effect flagged in *SOL* (Mar 2026): Alfama residents report that AL guests cook in their apartment kitchenettes and "spend little or nothing in the restaurants," which pushes it down.

*Result:* **~24% of Lisbon restaurant meals are tourist meals.** Adjusting for a higher tourist average ticket (assume 1.5×), tourist **revenue** share ≈ **32%**.

So Lisbon is a **roughly two-thirds resident** restaurant market by revenue at city scale. The "Lisbon is a tourist city, therefore a local-recommendation product cannot work there" objection is, at the city aggregate, **wrong**.

### But the average is a lie, because the distortion is spatially concentrated

The verified freguesia-level data destroys the aggregate:

- **Santa Maria Maior (Baixa, Alfama, Mouraria, Sé) has lost 28% of its resident population in just over ten years**, and holds **35 hotels (12.4% of Lisbon's total) and 4,425 short-term-rental units (23.2% of the city's supply)** — Junta de Freguesia de Santa Maria Maior figures, 2025, reported by *A Mensagem* (Jan 2026).
- Residents there report the commercial fabric has fully converted: *"Todos os espaços comerciais, neste momento, são restaurantes e estas lojas de souvenirs"* — and that proximity commerce has vanished to the point where one resident names a single remaining neighbourhood café.
- *SOL* (Mar 2026) on Alfama: *"É um bairro onde os turistas vêm visitar turistas porque as pessoas de cá já não moram cá."*

**In those freguesias the resident social graph has been physically evacuated.** A product whose core value is "people who live near you saved this" has no substrate there. Not because the product is wrong, but because the people are gone.

Meanwhile ~600,000 Lisboetas still live in the city, overwhelmingly *outside* the historic core, and they eat out. The resident market is intact — it has just been pushed 2–4 km outward from where the restaurant *content* is produced.

### The willingness-to-pay inversion (both sides, as required)

This is the sharpest strategic tension in the whole geography, and NomNom's product already straddles it without apparently intending to:

| | Tourist user | Resident user |
|---|---|---|
| Willingness to pay for a curated list | **High.** US visitors are the #1 AML market at 1,199,773 guests (17.2%); AML RevPAR €114.46/night, ADR €155.87. Someone paying €155/night will pay €5 for a good list. | **Low.** Portuguese median net monthly wage ~€980 (INE, 2024); average net €1,333 (Q1 2026). Only ~12% of Portuguese pay for digital news. |
| Retention | **Near zero.** They leave in 3–5 days and never return. | **The entire business.** |
| Contribution to the social graph | **Negative.** Their saves pollute local signal with tourist-trap consensus — precisely the failure mode *Time Out Lisboa* documented when it sent chefs Vítor Adão and Zé Paulo Rocha into Rua das Portas de Santo Antão and found *"não houve uma experiência que tivesse valido a pena."* | **Positive and compounding.** |

**Observation NomNom should confront:** the one-time **"Snapshot"** SKU is a *tourist* product and the monthly **"Subscription"** SKU is a *resident* product. They serve opposite users with opposite retention profiles and opposite effects on data quality. Shipping both without deciding which one is the business is how this product ends up as a slightly better TripAdvisor.

### Verdict

**Tourism does not break the Lisbon thesis — it breaks the "launch in central Lisbon" thesis, and it strengthens the positioning.**

The "locals eat here / avoid the trap" signal is not a marketing idea NomNom would have to invent and teach the market. It is **already a live, mainstream, felt cultural argument in Portuguese-language Lisbon dining discourse in 2026**, and it is being made by the highest-credibility voices in the city:

- *Time Out Lisboa* ran a chef-accompanied tourist-trap investigation: seven self-described "tradicional português" restaurants in 500m of one street with near-identical menus.
- *Taste of Lisboa* (Portuguese-language) frames the whole problem structurally: in Baixa, Chiado and Alfama *"muitos restaurantes já não competem pela fidelização dos clientes, mas pelo fluxo constante de visitantes"* — a business selling *"a ideia de Lisboa"* rather than Lisbon.
- Consumer-facing 2026 guides explicitly instruct readers to *"procure tascas onde se ouça falar português."*

That last sentence is NomNom's product spec written by someone else. **Demand for a verified locals signal exists and is currently being served by blog posts and heuristics** ("no photos on the menu", "short handwritten menu", "walk two streets away"). Those heuristics are exactly what a social graph replaces with data. This is the single strongest positioning finding in this report.

---

## Is Portugal big enough?

**For a venture-scale consumer-subscription business: no. For a defensible, fundable, profitable business built on the restaurant-industry side of the market: plausibly yes.** The two answers are different because the two revenue pools are two different sizes, and the smaller one is the one NomNom currently intends to lean on.

### Consumer-subscription ceiling `[Estimate]`

- Portugal 24–34 cohort ≈ 12% of 11.42M ≈ **1.37M people** nationally; AML ≈ 3M × 12% ≈ **360,000**; Lisboa município ≈ 658,236 × ~13% (capital skews young) ≈ **85,000**.
- A niche discovery app realistically ceilings at 10–15% penetration of its target cohort after several years. Nationally: **137,000–206,000 MAU.** AML only: **36,000–54,000 MAU.**
- Consumer social apps convert **2–5%** to paid. At 3%: **4,100–6,200 national payers.**
- At €4/month: 5,000 × €48 = **~€240,000 GMV/year.** Platform take at 25% = **~€60,000/year.**

**That is not a company.** Even tripling every assumption gets to ~€180k/year of platform revenue at full national saturation. The creator-list monetisation intent is, on Portuguese consumer economics, a feature — not a business model. Portuguese purchasing power is the binding constraint: median net wage ~€980, minimum wage €920 (2026), and housing costs absorbing up to half of young people's budgets.

### Sponsored-placement / restaurant-side ceiling `[Estimate]`

- CAE 56 turnover: **€15.7bn nationally, €5.85bn in Grande Lisboa alone** (INE/GEE, 2024).
- If restaurants spend ~1% of turnover on marketing, the Grande Lisboa marketing pool is ~€58.5M/year.
- Capturing 0.5% of that = **€292k/year**; 2% = **€1.17M/year**; nationally at 2% = **€3.1M/year.**

**The restaurant-side pool is 5–20× the consumer-subscription pool.** That is the real answer to "is Portugal big enough": Portugal is big enough if the payer is the restaurant, and it is not big enough if the payer is the diner.

**But this creates the central strategic contradiction of the business:** the positioning that works ("locals eat here, not tourist traps, trustworthy because real people saved it") is directly eroded by the monetisation that scales (sponsored placements). Marking placements as sponsored mitigates but does not eliminate this. Every incumbent that took the restaurant-side money lost the trust signal; that is precisely the gap NomNom would be exploiting in the first place.

### Three caveats that cut the other way

1. **The sector is in genuine distress, which cuts both ways.** Jan–May 2026: **6,446 openings vs 9,279 closures = net −2,833 establishments** (DIG-IN platform data via AHRESP, Jul 2026). ~75% of operators expect flat or lower summer 2026 revenue. AHRESP: 91% microenterprises, 51% sole traders. Distressed micro-operators have *no* marketing budget — but they also have acute, unmet demand for footfall and no ability to buy it from Google. *(Conflicting evidence: Informa D&B via ECO, Jan 2026, records only 1,048 closures and 193 insolvencies in 2025 with net company creation, versus DIG-IN's establishment-level figures. Different units and different methodologies; both are cited below. Do not treat the −2,833 figure as company-level.)*
2. **Portugal-only is not automatically a death sentence.** Vinted proved its model to 1M users in Lithuania (2.8M people) before expanding, and Bolt built in Estonia (1.3M) precisely because larger competitors were absent. Portugal at 11.4M is 4× Lithuania. The relevant question is not the country's size but whether the *node* reaches liquidity.
3. **Expansion contradicts density less than it appears.** Density is a property of a node, not a country. Expanding from Lisbon to Porto does not thin Lisbon's graph — but it does thin the *team*, and the ~€780M–€1.8bn Portuguese VC market (sources conflict; see Data Gaps) will not fund a multi-country land grab.

---

## The density threshold

The question — *how many active local users before "people you follow saved this" produces non-empty results* — has **two different answers for NomNom**, and conflating them is the most likely way to mis-plan the launch.

### The model

Let:
- `R_eff` = restaurants anyone would realistically save in the catchment
- `F` = accounts a user follows who are active in that catchment
- `S` = average saved places per followed account

Probability that at least one followed account has saved a given restaurant:

```
P(signal) = 1 − (1 − S/R_eff)^F
```

For **Lisboa município**: 7,549 establishments exist, but the discovery-relevant set — places a curator would actually recommend — is far smaller. `[Estimate] R_eff ≈ 1,500`.

**Case A — peer graph (F = real friends on the app):**

| F (friends on app) | S = 25 | S = 40 |
|---|---|---|
| 5 | 8.0% | 12.5% |
| 15 | 22.1% | 33.1% |
| 30 | 39.6% | 55.3% |
| 50 | 56.6% | 74.1% |

Below ~15 followed friends the feature is **empty most of the time** and the user concludes the app is dead. Saves are power-law distributed, so for genuinely popular restaurants the hit rate is far higher than the table (perhaps 80%+ at F=30) and for the long tail it is near zero — which is survivable, since the head is where discovery demand actually sits.

**The hard part is F, not S.** To get 15–30 *real friends* on the app, you need roughly **50%+ penetration of a bounded social cluster** — because dining circles are small and closed. If a user's real dining circle is ~40 people, you need ~20 of them. You cannot reach 50% of a cluster by spreading 5,000 users across a city of 658,236; you reach it by saturating one cluster of a few thousand people who already know each other.

**Case B — creator graph (F = local creators followed):**

This is NomNom's actual design, and it is **dramatically cheaper**. A creator with 40 curated saves is worth 40 friends' worth of coverage, and creators are followed by strangers, so `F ≈ 20–40` is achievable on day one from a supply-side recruitment effort rather than a demand-side network effect.

- 40 creators × 50 saved places = **2,000 place-entries**, covering `R_eff ≈ 1,500` at ~1.3× — enough that most searches return at least one curated result.
- At F = 25 followed creators with S = 50: `P(signal) = 1 − (1 − 50/1500)^25 = 57%`. Non-empty most of the time.

### The threshold, stated

`[Estimate]`

| Layer | Threshold for a single city node | Implication |
|---|---|---|
| **Creator layer** (launch requirement) | **~40 active local creators, ~2,000 curated place-entries** | Achievable by hand. This is a recruitment problem, not a network-effects problem. Solve it first. |
| **Peer layer** (retention requirement) | **~1,000–3,000 MAU concentrated in one cluster, generating ~15,000–40,000 saves**, with median user following ≥15 active local accounts | Requires cluster saturation, not city coverage. |
| **Self-sustaining node** | Above thresholds **plus** organic-invite-driven growth without paid acquisition | Only then open the next node. |

### Cross-check against documented playbooks

- **Uber:** expansion gate was **30 drivers with sub-15-minute ETA per market**. Not thousands. A specific, small, measurable supply number.
- **Airbnb:** **~20% listing penetration at neighbourhood level** — Mission District first, then the rest of San Francisco. Explicitly *not* city-wide.
- **Beli** (the closest analogue — social-graph restaurant app, dual "Rec Score" and "Friend Score", friends-only reviews): launched **city-by-city — Boston, NYC, Nantucket, LA** — invite-only, forcing users to invite four people at onboarding. **Nantucket is an island of roughly ten thousand year-round residents.** Beli chose it deliberately. That is the strongest single piece of evidence in this report that **a small, bounded, high-density community is an *easier* cold start than a large city, not a harder one.**

### Does this make a small city easier or harder?

**Easier, conditionally.** Coimbra (156,359) or Braga (203,519) need a smaller absolute number of users to saturate a cluster, and Centro has only 31.8% foreign-market dependence versus Grande Lisboa's 81.4% — so the resident graph is intact. The conditions are (a) enough restaurants for discovery to have a point, and (b) creators who already have local audiences. Coimbra's student population creates the cluster density but also the worst possible payment profile and annual churn. **Small ≠ easier by default; bounded ≠ small.** A bounded cluster inside a big city has both properties.

---

## Local competitive & startup dynamics

### The food-tech landscape

**DIG-IN is the fact that matters most.** It is the ex-Zomato Portugal business: Zomato exited Portugal, the local leadership executed an MBO in 2021 acquiring all existing data points, rebranded to DIG-IN in late 2023, acquired its technology partner in 2022, and raised its first round in 2024 (Portugal Ventures). It is described as *"a plataforma de restaurantes mais utilizada em Portugal."*

Three lessons, in order of importance:

1. **A global player looked at Portuguese consumer restaurant discovery and left.** Zomato's exit is direct evidence that consumer-only discovery in Portugal was not worth an international operator's attention. This corroborates the ARPU arithmetic above.
2. **DIG-IN survived by pivoting to B2B data.** It now sells restaurant/FMCG market intelligence ("DIG-IN Biz"), consulting, and reservation/takeaway software, and states an ambition to become "Europe's leading F&B data provider." The consumer app became the data-collection layer for a B2B business. **This is the most likely commercially viable shape for NomNom in Portugal too, and NomNom should know that the incumbent already found it.**
3. **DIG-IN owns the industry narrative.** AHRESP cited **DIG-IN's own platform data** for the 2026 opening/closing figures. Being the source that the national industry association quotes is a real moat that a new entrant does not have.

Others: **Kitch** (Lisbon, 2019, $5.08M seed from Seedcamp, Mustard Seed and eight others, last round May 2021 — B2B ordering infrastructure, no round in five years). **Pleez** (delivery data aggregation), **Comidas.pt**, **EatTasty**, **Comer Em Casa** (all delivery/ops, not discovery). **Ondish Foods** (StartUP Voucher Innovate 2025–2026, IAPMEI/COMPETE 2030). Tracxn (Oct 2025, Tier 3) counts **103 food-tech startups in Portugal, 23 funded, 6 at Series A+**.

**Critical gap:** *no Portuguese consumer app is doing creator-led social restaurant discovery.* Everything is either delivery logistics, restaurant back-office, or generic discovery (DIG-IN, Google, TripAdvisor). This is a genuine open lane — and also a lane nobody has monetised, which should be treated as a warning as much as an opportunity.

**What died and why — DATA GAP.** I found no documented Portuguese consumer restaurant-discovery failure with a published post-mortem. Zomato's Portugal exit is the closest available signal but was a strategic global retrenchment, not a documented failure of the Portuguese consumer thesis specifically. This gap matters and warrants direct founder interviews.

### Funding availability

- **5,091 active startups (2025, +8% YoY)**; 89% micro-enterprises; 63% of turnover in ICT; **45% Lisbon, 16% Porto** (Startup Portugal / Informa D&B).
- **Pre-seed: €100k–€300k** is the standard Portuguese band. Bynd Venture Capital targets €100k–€1M and closes in 4–6 weeks. Portugal Ventures pre-seed cheques run roughly $107k–$658k.
- Seed: €500k–€2M (Indico, Portugal Ventures). **Series A €3M–€10M usually requires international participation** — the ecosystem cannot fund growth stage domestically. Feedzai, Unbabel and OutSystems all went abroad for Series B+.
- **Domestic funds generally want €10k–€50k MRR before a seed round.** On the consumer-subscription arithmetic above, NomNom would need ~2,500–12,500 paying subscribers to hit that bar in Portugal — implausible. **This is a concrete, near-term financing risk: the local seed gate is set at a revenue level the consumer model cannot reach in Portugal.** It reinforces that the restaurant-side revenue line is not optional.
- Accelerators: **Startup Lisboa** (Mercado da Ribeira), **Beta-i**, **Faber**, **Fábrica de Startups**, **Building Global Innovators**, **UPTEC** (Porto), **IPN** (Coimbra). Lisbon Challenge provides ~€10k. StartUP Voucher covers €5k–€15k in services. **SIFIDE** R&D tax credits offset up to 82.5% of eligible R&D spend; **Portugal 2030** and PRR funds are live.

---

## Beachhead recommendation

### The recommendation

**Do not launch "Lisbon." Launch a single resident-dense, low-tourism inner-Lisbon cluster — the residential belt outside the historic core — anchored on ~40 hand-recruited local creators, and explicitly exclude the Baixa / Chiado / Alfama / Santa Maria Maior tourist core from launch scope.**

The unit of launch is a **cluster of 2,000–10,000 people who plausibly know each other and eat in the same 200–400 restaurants**, not a municipality of 658,236.

Candidate clusters, in priority order — **all require verification before commitment** (see Data Gaps):
1. **The Arroios / Penha de França / Anjos axis** — high residential density, young, diverse, an active restaurant scene that serves residents rather than visitors.
2. **Campo de Ourique / Estrela** — settled young-professional density, strong neighbourhood-restaurant identity, minimal tourist saturation.
3. **Alvalade / Avenidas Novas** — the highest-income young-professional concentration, closest to actual willingness to pay.

A fourth, structurally different candidate: **the Lisbon tech/startup community itself** (45% of Portugal's 5,091 startups). It is bounded, densely interconnected, over-indexed on eating out, over-indexed on app adoption, geographically concentrated, and reachable through a handful of Slack groups and events. It is the fastest cluster to saturate and the easiest to measure. Its weakness is that it is not representative — winning it proves less about the general market than winning a residential freguesia would.

### Why this one

1. **The resident graph exists there and does not exist in the core.** Santa Maria Maior lost 28% of residents in a decade and holds 23.2% of the city's short-term-rental stock. You cannot build a resident social graph in a neighbourhood the residents have left. The outer belt still has ~600,000 people.
2. **The positioning is pre-validated in exactly this frame.** "Where locals actually eat, not the trap" is already the dominant Portuguese-language framing of Lisbon dining in 2026 — argued by Time Out, by chefs, by food-tour operators, by residents' associations. The product does not have to create the belief; it has to instrument it.
3. **Creator supply is highest in Lisbon.** 45% of the national startup base, the largest media and creator concentration, Web Summit. A 40-creator cold start is a weeks-long recruitment project in Lisbon and a much longer one in Braga.
4. **It matches the density threshold arithmetic.** ~1,000–3,000 MAU in one cluster is reachable. ~85,000 Lisbon 24–34-year-olds spread thin is not.
5. **The data model already supports it.** Portuguese administrative geography — municipalities *and localities* — is already modelled in PostGIS. A freguesia-level beachhead requires no new seed data and no schema change. Sub-city targeting is free; international expansion is not.

### THE STRONGEST COUNTER-ARGUMENT

> **"You are deliberately excluding the highest-value users and the only content anyone wants. Tourists are the segment that will actually pay — 1.2M US visitors a year at €155/night ADR who will happily pay €5 for a curated list, versus Portuguese 26-year-olds on €980 net a month who pay for nothing (only ~12% pay for digital news). And the restaurants people make content about, that creators build audiences on, and that carry any aspirational pull are in Chiado, Príncipe Real, Baixa and Cais do Sodré — the exact areas you're excluding. Meanwhile the outer-belt neighbourhood tasca has no marketing budget (91% microenterprises, 51% sole traders, net −2,833 establishments in five months of 2026), so nobody in your beachhead can pay you either. You have chosen the beachhead with the lowest revenue on both sides of the marketplace."**

This is the correct objection and it is largely factually right.

### Response

**On the money: the counter-argument wins the first year of revenue and loses the company.** Tourist ARPU is real but it is *transactional*, not *retained* — a tourist is a one-shot €5 with zero repeat and zero graph contribution. A product monetised on tourists is a content shop, not a network, and it has no defensibility whatsoever against a Google result or a TripAdvisor list. Worse, tourist saves actively **degrade** the asset: they converge on precisely the consensus places that Time Out's chefs found were not worth eating at, which destroys the one signal that differentiates NomNom.

**The resolution is sequencing, not exclusion.** Build the resident graph first — it is the asset. Then sell the *output* of that asset to tourists as a one-time Snapshot at a high margin. The tourist becomes the **monetisation surface**, never the **data source**. This inverts the counter-argument's logic rather than rejecting it: it captures tourist willingness-to-pay *without* letting tourists into the graph. Notably, this makes NomNom's existing two SKUs coherent for the first time — Subscription for residents who build the graph, Snapshot for visitors who buy from it.

**On the content objection, a partial concession.** The counter-argument is right that creators build audiences on aspirational places, and that a launch confined to neighbourhood tascas would be content-starved. **Amendment: exclude the tourist core from the *user-acquisition* and *social-graph* scope, not from the restaurant catalogue.** Creators can and should list Chiado and Príncipe Real. What must be excluded is *recruiting users in* and *optimising for* the evacuated freguesias.

**On the restaurant-side revenue objection, a real concession.** It is true that distressed micro-operators cannot pay much. But the pool is €5.85bn of Grande Lisboa restaurant turnover, and even 0.5–2% of a 1% marketing spend is €292k–€1.17M/year — 5–20× the consumer pool. It is not the neighbourhood tasca that pays; it is the mid-market group with 3–10 sites, and those exist across the whole city.

### What winning here proves

1. That the **creator-graph cold start is solvable with ~40 creators and ~2,000 curated places** — the single riskiest unvalidated assumption in the business.
2. That **Portuguese residents will use a social save-and-follow layer for restaurants at all**, with retention distinguishable from a directory.
3. That the **"locals eat here" signal converts** — that verified resident endorsement changes where people actually go, not merely what they save.
4. That the model is **replicable by cluster**, which is the only expansion mechanism the density threshold permits.

It does **not** prove monetisation. That must be tested separately and early, because the ARPU ceiling is the binding constraint on the entire business and is unaffected by anything that happens in the beachhead.

### Expansion path with triggers

| Step | Target | Trigger to proceed |
|---|---|---|
| **0. Node 1** | One inner-Lisbon residential cluster | — |
| **1. Node 2–4** | Adjacent Lisbon clusters (the other candidates above) | Node 1 at ≥1,000 MAU, median user following ≥15 active local accounts, ≥50% of restaurant views returning a followed-account signal, and ≥40% M3 retention. **Do not proceed on user count alone.** |
| **2. Lisboa município** | City-wide, incl. tourist core as catalogue | ≥3 self-sustaining clusters growing organically without paid acquisition; ≥6,000 curated place-entries. |
| **3. AML** | Almada, Oeiras, Cascais, Sintra, Setúbal (Península de Setúbal: 5,364 enterprises, and notably the *lowest* foreign-market dependence in the metro) | Lisboa município node self-sustaining; first restaurant-side revenue proven with ≥20 paying venues. |
| **4. Porto / AMP** | 273,476 city, ~1.8M metro, ~5M guests, 6.6M nights | AML contribution-positive; playbook documented and repeatable by someone who is not a founder. Porto is a *replication* test, not a growth engine. |
| **5. Coimbra / Braga / Aveiro** | Only if a bounded cluster exists (university, tech hub) with resident creators already active | Porto reached liquidity in ≤2/3 the time Lisbon took. If Porto is not faster than Lisbon, the playbook is not real and further expansion destroys focus. Braga/Setúbal/Aveiro show >5% YoY startup growth — creator supply may exist. |
| **6. Algarve / Faro–Lagos** | Seasonal, tourist-dominated (81.4% foreign nights) | **Treat as a monetisation surface only.** Sell Snapshots to visitors. Do not attempt a resident graph. |
| **7. International** | Requires new PostGIS seed data | Only if Portuguese contribution margin is positive *and* an international investor is funding it. Portuguese Series A (€3M–€10M) requires foreign capital by definition. |

---

## Market Entry Risks

1. **ARPU ceiling (critical).** Consumer-subscription arithmetic caps out around €60k/year of platform revenue at full national saturation. The business must find restaurant-side revenue or it is a hobby. *Mitigation: test restaurant-side monetisation in the beachhead, not after national rollout.*
2. **Trust/monetisation contradiction (critical).** Sponsored placements erode the "locals eat here" signal that is the only defensible asset. *Mitigation: hard separation between graph data and paid surfaces; never let sponsorship influence ranking.*
3. **Local seed-funding gate.** Domestic funds want €10k–€50k MRR; the consumer model cannot reach it in Portugal. *Mitigation: pre-seed (€100k–€300k) plus SIFIDE/Portugal 2030 non-dilutive funding; plan for international capital at seed.*
4. **DIG-IN.** Funded (Portugal Ventures, 2024), holds the full Zomato Portugal data legacy, is the platform AHRESP quotes, and is already selling the B2B revenue line NomNom will need. *Mitigation: compete on the social graph, which DIG-IN does not have and cannot retrofit from review data.*
5. **Restaurant-sector contraction.** Net −2,833 establishments Jan–May 2026; ~75% expect flat or worse summer revenue. Supply-side churn means catalogue decay and unhappy paying venues. *Mitigation: freshness/closure detection as a product requirement, not a nice-to-have.*
6. **Tourist contamination of the graph.** Uncontrolled tourist saves converge on tourist traps and destroy the signal. *Mitigation: resident verification, or weight saves by user tenure and local save density.*
7. **Cluster mis-selection.** Picking a cluster that is not actually bounded means never reaching F≥15 and concluding wrongly that the product does not work. *Mitigation: verify freguesia-level demographics and creator presence before committing — see Data Gaps.*
8. **Creator supply concentration.** ~40 creators is a small number of people with real leverage. Losing 10 of them mid-launch collapses the node.
9. **Porto is not a second Lisbon.** 273,476 residents versus 658,236, and no evidence of an equivalent creator base. Sequencing Porto second may be wrong; a second *Lisbon cluster* is almost certainly cheaper.

---

## Source Quality Assessment

| Claim | Source | Tier | Date |
|---|---|---|---|
| Portugal population 11,424,031; Grande Lisboa 2,415,261 | INE, Estimativas de População Residente 2025 | 1 | 22 Jun 2026 |
| Lisboa município 658,236; Porto 273,476; Coimbra 156,359 | Pordata / INE, Retratos dos Municípios | 1 | 2025 (pub. 2026) |
| Braga 203,519; Aveiro 88,154 | Pordata / INE | 1 | 2024 |
| AML ~3M inhabitants; Lisboa city 7,549 restaurant establishments; 18,014 total commercial | CM Lisboa, *Economia de Lisboa em Números 2025* (citing INE SCIE 2023) | 1 | 2025 (data 2023) |
| CAE 56: Portugal 74,524 enterprises, 324,130 employed, €15.7bn turnover; Grande Lisboa 15,538 / €5.85bn; Algarve 6,719; Norte 23,442; Centro 10,590; P. Setúbal 5,364 | GEE (Gabinete de Estratégia e Estudos) / INE, Síntese Estatística Setorial | 1 | data 2024; pub. 11 Dec 2025 |
| Portugal 2025: 32.5M guests, 82.1M nights, €7.15bn; 69.4% non-resident nights | INE preliminary, via RTP / Expresso / GEE | 1 (INE via 2) | Jan 2026 |
| AML 2025: 9,531,087 guests, 21,268,789 nights, €2.16bn; 16.84M foreign vs 4.43M domestic; US 17.2% / 1,199,773 guests; RevPAR €114.46, ADR €155.87 | INE via Ambitur / ATL | 1 (INE via 2) | 2026 |
| Grande Lisboa 81.4% of nights from foreign markets (82.9% H1 2025) | INE via RTP / ECO | 1 (INE via 2) | Jan 2026 / Aug 2025 |
| Lisboa município ~16M nights; Porto 3M+ guests, 6,602,600 nights (+5.2%), €501.1M | INE / CM Porto via JN, JPN | 1 (via 2) | Feb 2026 |
| AMP ~5M guests 2025; AMP population ~1.8M (2023) | INE via JN; GEE Estatísticas Regionais | 1 (via 2) | Apr 2026 / 2023 |
| Santa Maria Maior: −28% residents in ~10 yrs; 35 hotels (12.4% of city); 4,425 AL units (23.2% of city) | Junta de Freguesia de Santa Maria Maior (2025) via *A Mensagem* | 1 (via 2) | 21 Jan 2026 |
| Alfama resident displacement; AL guests self-catering | *SOL / VERSA* | 2 | 12 Mar 2026 |
| Tourist-trap concentration on Rua das Portas de Santo Antão (7 near-identical "traditional" restaurants in 500m) | *Time Out Lisboa*, with chefs Vítor Adão and Zé Paulo Rocha | 2 | undated article |
| Baixa/Chiado/Alfama restaurants competing on visitor flow, not loyalty | Taste of Lisboa (operator blog, PT-language) | 3 | 2025/26 |
| "Locals eat here" is mainstream consumer advice | Visit Lisboa Blog; *Postal* citing PhotoAiD/HuffPost | 3 | Feb 2026 |
| Restaurant closures Jan–May 2026: 6,446 openings / 9,279 closures (net −2,833); ~75% expect flat/lower summer | AHRESP citing DIG-IN platform data, via *Jornal Económico* | 1–2 | Jul 2026 |
| 2025: 1,048 closures, 193 insolvencies, 3,324 new companies (−8%) | Informa D&B via ECO | 2 | 23 Jan 2026 |
| 91% microenterprises, 51% sole traders; "silent closures" | AHRESP citing INE, via *Observador* / Magazine AHRESP | 1–2 | 21 Apr 2026 |
| One restaurant's mix: 50% foreign / 30% domestic tourist / 10% local | *Diário de Notícias* (single-operator anecdote, **not** representative) | 2 | undated |
| DIG-IN: Zomato MBO 2021, rebrand 2023, first round 2024, PT's most-used restaurant platform | Portugal Ventures portfolio; SBI Consulting; DIG-IN blog | 2 | 2024–2026 |
| Kitch: Lisbon 2019, $5.08M seed, Seedcamp/Mustard Seed, last round May 2021 | Tracxn | 3 | Oct 2025 |
| 103 PT food-tech startups, 23 funded, 6 Series A+ | Tracxn | 3 | Oct 2025 |
| 5,091 active startups (+8%); 45% Lisbon, 16% Porto; 89% micro | Startup Portugal / Informa D&B, Ecosystem Report 2025 | 1–2 | 2025 |
| Pre-seed €100k–€300k; seed €500k–€2M; Series A needs international; funds want €10k–€50k MRR | Grantbite | 3 | 2026 |
| Portugal Ventures pre-seed $107k–$658k | Shizune investor database | 3 | Jul 2026 |
| PT VC 2025: €780M **or** €1.8bn (conflicting) | The Portugal Brief (two articles, same publisher) | 3 | 2026 |
| Average gross monthly salary €1,694 (2025, +5.6%); median net ~€980 (2024) | INE via ECO / Santander / RHmagazine | 1 (via 2) | 13 Feb 2026 |
| Net average wage €1,333/mo Q1 2026; minimum wage €920–€1,073 | Trading Economics; Boundless | 3 | 2026 |
| ~12% of Portuguese pay for digital news | Search synthesis, primary source not verified | 3 | 2026 |
| Uber: 30 drivers / <15min ETA gate. Airbnb: ~20% neighbourhood listing penetration | SoftwareSeni (marketplace analysis) | 3 | undated |
| Beli: city-by-city (Boston, NYC, Nantucket, LA), invite-only, 4 forced invites, Rec Score + Friend Score, 70–75M ratings, $12M+ raised | 8x Blog; Demand Curve; SF Chronicle; Ivey Business Review | 2–3 | 2025–2026 |
| Vinted: Lithuania to 1M users before expansion; failed US exit 2020. Bolt: Estonia-first, avoided Uber head-on | Fundreef; Venturebeam | 3 | undated |

---

## Data Gaps

1. **No published tourist-vs-resident restaurant revenue split for Lisbon exists.** The ~24% meals / ~32% revenue figure is my own `[Estimate]` from verified inputs. The single strongest counter-evidence would be actual card-spend data — CM Porto publishes foreign-card spend (€833M+, +8.26% in 2025); an equivalent Lisbon series may exist and was not located.
2. **Freguesia-level demographics for the candidate beachhead clusters were not verified.** I have hard data for Santa Maria Maior (the *exclusion* case) but the Arroios / Campo de Ourique / Alvalade recommendations rest on general knowledge, not sourced 2025–26 figures. **This must be verified before committing to a cluster** — it is the load-bearing assumption of the recommendation.
3. **Municipality-level restaurant counts for Porto, Braga, Coimbra, Aveiro and Faro.** Only NUTS III / NUTS II aggregates were obtainable. Porto in particular is a material gap for step 4 of the expansion path.
4. **Faro município population and Algarve tourism seasonality curve** not retrieved at municipality resolution.
5. **Conflicting Portuguese VC totals for 2025: €780M vs €1.8bn**, from two articles by the same Tier-3 publisher. Neither is verifiable against a primary source here. Do not cite either without checking Dealroom directly.
6. **Conflicting restaurant closure data.** Informa D&B (company-level, 2025) shows net creation; DIG-IN via AHRESP (establishment-level, 2026) shows net −2,833. Different units, different periods, different methods. The direction of travel is negative but the magnitude is unresolved.
7. **No documented Portuguese consumer restaurant-discovery failure with a post-mortem.** The "what died and why" question is genuinely unanswered by public sources. Founder interviews with the DIG-IN and Kitch teams would be worth more than further desk research.
8. **Higher-education enrolment by municipality** (Coimbra, Braga, Aveiro) was located as a Pordata dataset but the actual figures were not extracted. This matters for evaluating university-cluster beachheads.
9. **Creator-supply data.** No source quantifies how many Portuguese food creators with meaningful local audiences exist in Lisbon or Porto. The "40 creators" threshold is an `[Estimate]` derived from coverage arithmetic, not from an observed supply count. **This is the second load-bearing unverified assumption.**
10. **`R_eff ≈ 1,500`** (discovery-relevant Lisbon restaurants) is an assumption, not a measurement. It could plausibly be 800 or 3,000, and the density threshold scales roughly linearly with it.
