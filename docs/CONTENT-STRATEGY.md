# NomNom — Content strategy

Created 2026-07-12 by /content-strategy. Companion to [marketing-brief-portugal-ugc.md](marketing-brief-portugal-ugc.md) (personas/ICPs) and [BRAND.md](../BRAND.md) (voice). When this doc and those disagree, they win.

---

## 0. Context and assumptions

**What NomNom is:** restaurant discovery through creators and real people — save spots into NomNom Lists, follow your NomNom Circle, spin NomNom Roulette. Creators monetise lists via Snapshots and Subscriptions.

**Assumptions this strategy is built on** (correct these and the priorities shift):

1. **Primary goal: demand-side user acquisition in Lisbon** (ICP 1 "descobridora social", P0), with creator acquisition (ICP 3) as the supporting motion. Not brand awareness for its own sake, not B2B restaurants yet.
2. **PT-PT is the primary content language**; English is a secondary layer for expats, visiting friends ("amigos de fora" is a stated trigger), and the creator-economy pillar. The site is already bilingual.
3. **Small team, AI-assisted production.** Realistic cadence: ~2 pieces/week of editorial plus the programmatic layer. Prioritise formats that repurpose (article → NomNom List → Remotion reel).
4. **Existing infrastructure is the skeleton, not a blank page:** Tina blog at `/post`, MDX `use-cases` (creators, foodies, restaurants) and `resources`, programmatic `/countries/[country]/[city]` + collections + influencers, public `/roleta`.

**Searchable vs shareable split:** roughly 70% searchable (capture "onde comer" demand and feed the programmatic layer) / 30% shareable (own the "real people, not algorithms" position). Search is the compounding foundation; shareable pieces earn the links that make the searchable layer rank.

---

## 1. Content pillars

Four pillars. Restaurants (B2B) is deliberately **deferred** — the use-case page is enough until supply-side and demand-side content is working.

### Pillar 1 — Onde comer em Lisboa (city and neighbourhood guides)

*Searchable · demand-side (Inês) · feeds `/countries/portugal/lisboa` and collections*

The core demand-capture pillar. Neighbourhood, occasion, and dish-level guides — never generic "os 50 melhores de Lisboa" lists (that's the exact pain named in the persona brief). Every guide ships with a public NomNom List so the CTA is "Guarda a lista", not "read more". Differentiation is **visitable context**: who recommended it, metro/parking, late-dinner hours, group policy — the practical details the brief says are always outdated elsewhere.

Clusters: por bairro (Alfama, Bairro Alto, Cais do Sodré, Marvila, Alvalade…) · por ocasião (jantar tarde, brunch, jantar a dois, grupos grandes, com miúdos) · por prato/cozinha · EN mirror for the highest-value guides only.

### Pillar 2 — Decidir onde comer (group decisions and free tools)

*Searchable + shareable · demand-side (Tiago) · feeds public `/roleta`*

Content for the moment of indecision — the group chat that can't decide, the person organising a birthday dinner by Wednesday. NomNom Roulette is the free-tool anchor: "restaurant roulette" / "roda a roleta" is inherently shareable into the group chats the persona already lives in. Spoke content: how to pick a spot for a group, shareable short-list templates in `/resources`, seasonal decision guides (verão no Sul, jantar de Natal da equipa).

### Pillar 3 — Confiança: estrelas, reviews e recomendações reais (trust)

*Shareable · brand-defining · earns links and press*

The thought-leadership pillar that names what everyone feels: star ratings have stopped meaning anything, and you can't tell paid posts from real recommendations. This is where original data lives (review-inflation analysis of Lisbon restaurants, ad-vs-organic labelling studies). **Guardrails from the marketing brief apply hard here:** NomNom has marked sponsored placements, so never claim "sem publicidade"; per BRAND.md, position by what we do — no competitor-bashing by name.

### Pillar 4 — Criadores: do "onde é?" ao rendimento (creator economy)

*Searchable + shareable · supply-side (Beatriz) · feeds `/use-cases/creators` and `/countries/*/influencers`*

Acquisition content for micro food creators (3k–150k, local engagement). Anchored in their two named pains: DMs asking "onde é?" and platforms swallowing discovery. Clusters: monetisation ("como criadores de comida ganham dinheiro", Snapshot/Subscription explainers), craft ("como criar um guia que os seguidores pagam"), and — once real earnings data exists — meta content ("o que os primeiros criadores NomNom ganharam"), which doubles as Pillar 3 proof.

---

## 2. Topic cluster map

```
/post (blog hub, PT-PT default, EN where marked)
│
├── P1 · Onde comer em Lisboa
│   ├── Hub: "Onde comer em Lisboa" (editorial hub → links programmatic city page)
│   ├── Bairros: Alfama · Bairro Alto · Cais do Sodré · Marvila · Alvalade …
│   ├── Ocasiões: grupos grandes · jantar a dois <€50 · brunch sem fila · jantar tarde
│   ├── Pratos: melhores [prato] em Lisboa
│   └── EN: "Where to eat in Lisbon like a local" (+ top 3 neighbourhood mirrors)
│         ↓ every guide → public NomNom List → Remotion reel (RestaurantReviewsReel)
│
├── P2 · Decidir onde comer
│   ├── Free tool: /roleta (PT) · "restaurant roulette" (EN)
│   ├── "Como decidir onde jantar em grupo (sem 40 mensagens no WhatsApp)"
│   ├── /resources: modelo de lista curta para jantar de grupo
│   └── Sazonal: Natal da equipa · verão no Algarve · S. Valentim
│
├── P3 · Confiança
│   ├── "Porque é que 4,6 estrelas já não significa nada" (PT + EN)
│   ├── DATA: inflação de estrelas nos restaurantes de Lisboa (original research)
│   ├── "Como distinguir #pub de recomendação real"
│   └── (later) meta: números reais do NomNom
│
└── P4 · Criadores
    ├── Hub: /use-cases/creators (exists — strengthen + interlink)
    ├── "Menos DMs 'onde é?': cria o guia dos teus sítios"
    ├── "Como criadores de comida ganham dinheiro em 2026" (PT + EN)
    ├── Snapshot vs Subscription explainer
    └── (later) case study: primeira criadora a monetizar uma lista

Programmatic layer (already scaffolded — separate /programmatic-seo pass):
/countries/portugal/lisboa · /collections/[slug] · /influencers/[slug] · /restaurants · /lists
Editorial guides interlink INTO these pages; they are the long-tail rank surface.
```

---

## 3. Priority topics — first 90 days

Scored per the content-strategy rubric: customer impact 40% · content-market fit 30% · search potential 20% · resources 10%.

| # | Topic | Pillar | Type | Buyer stage | Impact | Fit | Search | Res | **Total** |
|---|-------|--------|------|------------|--------|-----|--------|-----|-----------|
| 1 | Como exportar os guardados do Google Maps (e o que fazer com eles) — PT + EN | P1/P2 | How-to, searchable | Implementation | 9 | 10 | 8 | 9 | **9.1** |
| 2 | Onde comer em [bairro] — first 4: Bairro Alto, Alfama, Cais do Sodré, Marvila | P1 | Use-case guide, searchable | Awareness | 9 | 9 | 8 | 7 | **8.6** |
| 3 | Restaurantes para grupos grandes em Lisboa (com política de reservas e metro) | P1/P2 | Guide, searchable | Awareness | 8 | 9 | 7 | 8 | **8.1** |
| 4 | Não sabes onde jantar? — Roulette free-tool page + supporting post (PT + EN) | P2 | Free tool, both | Awareness | 8 | 9 | 6 | 8 | **7.9** |
| 5 | Porque é que 4,6 estrelas já não significa nada | P3 | Thought leadership, shareable | Awareness | 8 | 9 | 5 | 8 | **7.7** |
| 6 | Menos DMs "onde é?": como criar o guia dos teus sítios | P4 | Use-case, both | Consideration (creator) | 7 | 9 | 5 | 8 | **7.3** |
| 7 | Melhores apps para descobrir restaurantes em 2026 (comparação honesta) | P2 | Comparison, searchable | Consideration | 6 | 8 | 8 | 8 | **7.2** |
| 8 | A inflação de estrelas em Lisboa — original data study | P3 | Data-driven, shareable | Awareness | 7 | 9 | 4 | 4 | **6.7** |
| 9 | Como criadores de comida ganham dinheiro em 2026 | P4 | Guide, searchable | Awareness (creator) | 6 | 8 | 6 | 7 | **6.7** |
| 10 | Jantar a dois em Lisboa por menos de €50 | P1 | Occasion guide, searchable | Awareness | 6 | 7 | 6 | 8 | **6.5** |

**Why #1 wins:** "export Google Maps saved places" is a real, evergreen, weakly-served query in both languages; NomNom literally has a Google Maps import feature, so it's the highest-intent bridge from the stated persona stack ("Guardados + Google Maps + screenshots") straight into the product. Near-zero research cost.

**Sequencing note:** ship #1–#4 before #8 (the data study). The study is the link-earner that lifts everything, but it needs the searchable base to lift and it's the most expensive piece (needs review-data scraping and analysis).

---

## 4. Production system

- **One unit of content = three assets:** blog guide (`/post`) → public NomNom List (the product CTA) → 20–45s reel via the existing Remotion `RestaurantReviewsReel` template ("3 sítios que guardei esta semana" format from the UGC brief). Never publish a guide without its List.
- **Voice:** BRAND.md is binding — PT-PT conversational, no "melhor de Portugal", no superlatives without a number and source, sentence case, "spots/sítios" vocabulary.
- **Interlinking rule:** every editorial guide links to (a) its NomNom List, (b) the relevant programmatic city/collection page, (c) one sibling in its cluster. Creators mentioned in guides link to their `/u/[handle]` or `/influencers/[slug]` page — this seeds the creator flywheel.
- **EN policy:** translate only proven winners (top GSC performers after ~8 weeks) plus the creator-economy pieces, which have a global audience.
- **Cadence:** 1 P1 guide/week · 1 rotating piece/week (P2→P4→P3) · data study as a monthly-scale project.

## 5. Measurement

- **Search:** GSC clicks/impressions on PT queries per cluster; ranking for "[bairro] restaurantes" terms.
- **Product:** sign-ups and List-saves attributed to content UTMs (analytics-tracking-matrix.md covers the event layer); Roulette spins from `/roleta` organic entries.
- **Supply:** creator applications/claims from P4 content.
- **Shareable:** referring domains earned by P3 pieces; organic shares of Lists (if instrumented).
- Review quarterly, aligned with the persona-validation cadence in the marketing brief.

## 6. Open questions (answers reshape priorities)

1. **Capacity:** is ~2 pieces/week realistic, or should this cut to the top 5 topics only?
2. **EN/tourist scope:** in or out for year 1? (Currently: thin EN layer only.)
3. **Data study feasibility:** is scraping/analysing public Lisbon review data acceptable and resourced? It's the biggest link-building lever but the most expensive item.
4. **Creator case study:** is any creator live and monetising yet? The moment one is, "primeira criadora a monetizar" jumps to the top of P4.
5. **Porto timing:** the P1 cluster templates are city-portable — when Porto activates, the same bairro/ocasião structure replays there.
