# Agent skills (nomnom)

This document lists every skill under [`.claude/skills/`](.claude/skills/) **by category**, with paths and how to use each. Repo-wide rules live in [`AGENTS.md`](AGENTS.md).

## How skills are loaded

- **Location:** each skill is a folder containing `SKILL.md` (and sometimes `references/`, `AGENTS.md`, or other assets).
- **Discovery:** Cursor and Claude Code load these automatically from `.claude/skills/` when you work in this repository.
- **How to invoke:** describe the task in natural language (see **When to use** per skill). Some skills expect the agent to **read `SKILL.md` first** and follow its workflow; a few reference slash-style commands (e.g. `/impeccable`) that map to opening that skill’s instructions.
- **User-invocable skills:** several design skills expose `user-invocable: true` and optional `argument-hint` in their frontmatter—treat those as “named passes” you can request explicitly (e.g. “run **polish** on the checkout page”).

---

## Taste dials (shared)

In **`design-taste-frontend`** and **`high-end-visual-design`**, the top of `SKILL.md` defines **DESIGN_VARIANCE**, **MOTION_INTENSITY**, and **VISUAL_DENSITY** (typically 1–10). Adjust them in the skill file to match the surface (e.g. marketing vs. dense dashboard), unless the product brief overrides them.

---

## Skills by category

### Core UI systems and visual foundations

Default palettes and systems for building or restyling interfaces. Align with **`DESIGN.md`** in this repo unless the brief says otherwise.

| Skill | One-line role |
| --- | --- |
| `design-taste-frontend` | Senior UI bar: architecture, metrics, hardware-accelerated CSS. |
| `high-end-visual-design` | Agency-grade type, spacing, shadows, cards, motion; blocks generic AI UI. |
| `frontend-design` | Distinctive web UI—pages, dashboards, components. |
| `impeccable` | Polished implementation; **craft** / **teach** / **extract** workflows; shared context for other skills. |
| `minimalist-ui` | Calm editorial UI—warm monochrome, bento grids, muted accents. |
| `industrial-brutalist-ui` | Brutalist / terminal-adjacent—only when the product fits. |

#### `design-taste-frontend`

- **Path:** [`.claude/skills/design-taste-frontend/SKILL.md`](.claude/skills/design-taste-frontend/SKILL.md)
- **When to use:** Default “senior UI” bar—component architecture, metrics-based rules, hardware-accelerated CSS, balanced design engineering. Primary pair with **`DESIGN.md`** for this repo.

#### `high-end-visual-design`

- **Path:** [`.claude/skills/high-end-visual-design/SKILL.md`](.claude/skills/high-end-visual-design/SKILL.md)
- **When to use:** Agency-grade visual defaults—type, spacing, shadows, cards, motion—while blocking “cheap AI UI” tropes.

#### `frontend-design`

- **Path:** [`.claude/skills/frontend-design/SKILL.md`](.claude/skills/frontend-design/SKILL.md)
- **When to use:** Building or restyling web UI (pages, dashboards, components) with distinctive, non-generic aesthetics.

#### `impeccable`

- **Path:** [`.claude/skills/impeccable/SKILL.md`](.claude/skills/impeccable/SKILL.md)
- **When to use:** Polished UI implementation; other skills often defer to it for **craft** / **teach** / **extract** workflows and shared design context.

#### `minimalist-ui`

- **Path:** [`.claude/skills/minimalist-ui/SKILL.md`](.claude/skills/minimalist-ui/SKILL.md)
- **When to use:** Calm editorial UI—warm monochrome, bento grids, muted accents, minimal chrome (see skill for banned defaults).

#### `industrial-brutalist-ui`

- **Path:** [`.claude/skills/industrial-brutalist-ui/SKILL.md`](.claude/skills/industrial-brutalist-ui/SKILL.md)
- **When to use:** Intentional brutalist / terminal-adjacent aesthetics—grids, stark type, utilitarian color—only when the product direction fits.

---

### Design planning, specs, and documentation

Structured work before or alongside implementation.

| Skill | One-line role |
| --- | --- |
| `shape` | Discovery interview → design brief before code. |
| `prd` | PRDs for software and AI features—stories, specs, risks. |
| `full-output-enforcement` | Complete outputs—no placeholders; long-output splits. |

#### `shape`

- **Path:** [`.claude/skills/shape/SKILL.md`](.claude/skills/shape/SKILL.md)
- **When to use:** Before coding—structured discovery and a design brief for a feature.

#### `prd`

- **Path:** [`.claude/skills/prd/SKILL.md`](.claude/skills/prd/SKILL.md)
- **When to use:** Product requirements for software or AI features—stories, specs, risks, executive summary.

#### `full-output-enforcement`

- **Path:** [`.claude/skills/full-output-enforcement/SKILL.md`](.claude/skills/full-output-enforcement/SKILL.md)
- **When to use:** Large or exhaustive deliverables—complete code, no placeholders, clean splits when output is long.

---

### Targeted design passes

Verb-driven improvements on an existing screen, flow, or component. Many pair with **`impeccable`** for context.

| Skill | One-line role |
| --- | --- |
| `adapt` | Responsive layouts, breakpoints, touch targets. |
| `animate` | Motion and micro-interactions with purpose. |
| `audit` | A11y, performance, theming, responsive, anti-patterns—scored report. |
| `bolder` | More visual impact when the UI feels too safe. |
| `clarify` | UX copy, errors, labels, instructions. |
| `colorize` | Strategic color when things feel gray or flat. |
| `critique` | Structured UX critique—often with **`impeccable`**. |
| `delight` | Personality and memorable touches. |
| `distill` | Remove noise; simpler, clearer UI. |
| `layout` | Spacing, rhythm, alignment, hierarchy. |
| `optimize` | Slow/janky UI—load, render, animation, bundle. |
| `overdrive` | High-ambition motion and effects when “wow” is the goal. |
| `polish` | Pre-ship alignment, spacing, micro-details. |
| `quieter` | Tone down loud or overwhelming visuals. |
| `typeset` | Typography—fonts, hierarchy, readability. |

#### `adapt`

- **Path:** [`.claude/skills/adapt/SKILL.md`](.claude/skills/adapt/SKILL.md)
- **When to use:** Responsive design, breakpoints, fluid layouts, touch targets, cross-device or cross-platform adaptation.
- **How to use:** Ask for adaptation to specific targets (e.g. mobile, tablet). Preparation may reference **`impeccable`**; gather target platforms before changing layouts.

#### `animate`

- **Path:** [`.claude/skills/animate/SKILL.md`](.claude/skills/animate/SKILL.md)
- **When to use:** Purposeful motion: transitions, micro-interactions, hover states, making the UI feel alive without noise.

#### `audit`

- **Path:** [`.claude/skills/audit/SKILL.md`](.claude/skills/audit/SKILL.md)
- **When to use:** Technical quality review—a11y, performance, theming, responsive behavior, anti-patterns—with severity (e.g. P0–P3) and an actionable plan.

#### `bolder`

- **Path:** [`.claude/skills/bolder/SKILL.md`](.claude/skills/bolder/SKILL.md)
- **When to use:** Designs feel bland, safe, or generic; you want more character and impact while keeping usability.

#### `clarify`

- **Path:** [`.claude/skills/clarify/SKILL.md`](.claude/skills/clarify/SKILL.md)
- **When to use:** UX copy, errors, labels, instructions—making interfaces easier to understand.

#### `colorize`

- **Path:** [`.claude/skills/colorize/SKILL.md`](.claude/skills/colorize/SKILL.md)
- **When to use:** Interfaces that are too gray or flat; strategic color and warmth while respecting brand constraints.

#### `critique`

- **Path:** [`.claude/skills/critique/SKILL.md`](.claude/skills/critique/SKILL.md)
- **When to use:** Structured design critique—hierarchy, IA, cognitive load, scoring, personas. Often pairs with **`impeccable`** for context.

#### `delight`

- **Path:** [`.claude/skills/delight/SKILL.md`](.claude/skills/delight/SKILL.md)
- **When to use:** Personality, memorable moments, joyful micro-interactions—without breaking clarity.

#### `distill`

- **Path:** [`.claude/skills/distill/SKILL.md`](.claude/skills/distill/SKILL.md)
- **When to use:** Simplification—remove noise, fewer elements, clearer focus.

#### `layout`

- **Path:** [`.claude/skills/layout/SKILL.md`](.claude/skills/layout/SKILL.md)
- **When to use:** Spacing, rhythm, alignment, hierarchy, composition fixes.

#### `optimize`

- **Path:** [`.claude/skills/optimize/SKILL.md`](.claude/skills/optimize/SKILL.md)
- **When to use:** Slow or janky UI—load time, render path, animations, images, bundle weight.

#### `overdrive`

- **Path:** [`.claude/skills/overdrive/SKILL.md`](.claude/skills/overdrive/SKILL.md)
- **When to use:** High-ambition visuals—shaders, scroll-driven effects, spring physics, flagship “wow” moments.

#### `polish`

- **Path:** [`.claude/skills/polish/SKILL.md`](.claude/skills/polish/SKILL.md)
- **When to use:** Pre-ship pass—alignment, spacing, consistency, micro-details.

#### `quieter`

- **Path:** [`.claude/skills/quieter/SKILL.md`](.claude/skills/quieter/SKILL.md)
- **When to use:** UI feels loud, garish, or overwhelming; dial down intensity while keeping quality.

#### `typeset`

- **Path:** [`.claude/skills/typeset/SKILL.md`](.claude/skills/typeset/SKILL.md)
- **When to use:** Typography hierarchy, font choice, sizing, weight, readability.

---

### Motion, animation, and craft philosophy

| Skill | One-line role |
| --- | --- |
| `emil-design-eng` | Emil Kowalski–style polish: motion choices, component feel, craft reviews. |

#### `emil-design-eng`

- **Path:** [`.claude/skills/emil-design-eng/SKILL.md`](.claude/skills/emil-design-eng/SKILL.md)
- **When to use:** UI polish philosophy—motion decisions, component feel, “why does this feel off?” Not required on every small change; use for craft-heavy passes.

---

### Product, growth, and positioning

| Skill | One-line role |
| --- | --- |
| `customer-persona` | Personas, ICP, JTBD, journeys, anti-personas. |
| `pricing-strategy` | Tiers, trials, packaging, monetization, pricing pages. |
| `ai-seo` | Visibility in AI search / answer engines and LLM citations. |

#### `customer-persona`

- **Path:** [`.claude/skills/customer-persona/SKILL.md`](.claude/skills/customer-persona/SKILL.md)
- **When to use:** Personas, ICP, JTBD, journey mapping, anti-personas for marketing, product, or content strategy.

#### `pricing-strategy`

- **Path:** [`.claude/skills/pricing-strategy/SKILL.md`](.claude/skills/pricing-strategy/SKILL.md)
- **When to use:** Packaging, tiers, trials, monetization, willingness-to-pay framing, pricing page strategy.

#### `ai-seo`

- **Path:** [`.claude/skills/ai-seo/SKILL.md`](.claude/skills/ai-seo/SKILL.md)
- **When to use:** AI search / answer engines—AEO, GEO, LLMO, citations in ChatGPT/Perplexity/Claude/Gemini, “show up in AI answers,” zero-click visibility. Not a substitute for classic technical SEO audits (use dedicated SEO tooling if needed).

---

### Web: Next.js, React, and composition

| Skill | One-line role |
| --- | --- |
| `next-best-practices` | Next.js App Router conventions, RSC, metadata, errors, bundling. |
| `vercel-react-best-practices` | React/Next performance patterns. |
| `vercel-composition-patterns` | Compound components, context, fewer boolean props; React 19 notes. |

#### `next-best-practices`

- **Path:** [`.claude/skills/next-best-practices/SKILL.md`](.claude/skills/next-best-practices/SKILL.md)
- **When to use:** Next.js App Router conventions, RSC boundaries, data fetching, metadata, errors, route handlers, images/fonts, bundling. Linked reference docs live beside this skill.

#### `vercel-react-best-practices`

- **Path:** [`.claude/skills/vercel-react-best-practices/SKILL.md`](.claude/skills/vercel-react-best-practices/SKILL.md)
- **When to use:** React/Next performance while authoring or reviewing components, data fetching, and bundles.

#### `vercel-composition-patterns`

- **Path:** [`.claude/skills/vercel-composition-patterns/SKILL.md`](.claude/skills/vercel-composition-patterns/SKILL.md)
- **When to use:** Refactors away from boolean prop explosion; compound components, context, explicit variants; includes React 19 notes. See also [`AGENTS.md`](.claude/skills/vercel-composition-patterns/AGENTS.md) in that folder.

---

### Mobile: React Native, Expo, and Capacitor

| Skill | One-line role |
| --- | --- |
| `vercel-react-native-skills` | RN/Expo performance, lists, animations, native APIs. |
| `capacitor-best-practices` | Capacitor structure, plugins, security, deployment. |
| `capacitor-performance` | Bundle, rendering, memory, native bridge, profiling. |
| `capacitor-security` | Hardening and Capsec-style security rules. |

#### `vercel-react-native-skills`

- **Path:** [`.claude/skills/vercel-react-native-skills/SKILL.md`](.claude/skills/vercel-react-native-skills/SKILL.md)
- **When to use:** React Native / Expo performance, lists, animations, native modules, platform APIs. Large rule set; pair with actual app code paths.

#### `capacitor-best-practices`

- **Path:** [`.claude/skills/capacitor-best-practices/SKILL.md`](.claude/skills/capacitor-best-practices/SKILL.md)
- **When to use:** Capacitor project structure, plugins, performance, security, deployment—reviews and new setups.

#### `capacitor-performance`

- **Path:** [`.claude/skills/capacitor-performance/SKILL.md`](.claude/skills/capacitor-performance/SKILL.md)
- **When to use:** Bundle size, rendering, memory, native bridge, profiling for Capacitor apps.

#### `capacitor-security`

- **Path:** [`.claude/skills/capacitor-security/SKILL.md`](.claude/skills/capacitor-security/SKILL.md)
- **When to use:** Hardening Capacitor apps; aligns with Capsec-style scanning across secrets, storage, network, auth, crypto, and platform issues.

---

### Data: Postgres and Supabase

| Skill | One-line role |
| --- | --- |
| `supabase-postgres-best-practices` | Queries, schema, indexes, pooling, RLS performance. |

#### `supabase-postgres-best-practices`

- **Path:** [`.claude/skills/supabase-postgres-best-practices/SKILL.md`](.claude/skills/supabase-postgres-best-practices/SKILL.md)
- **When to use:** Postgres query tuning, schema design, indexing, pooling, RLS performance—Supabase-flavored guidance with deep `references/`.

---

### Deploy and Vercel platform

| Skill | One-line role |
| --- | --- |
| `deploy-to-vercel` | Deploy, previews, go-live; may include bundled scripts. |
| `vercel-cli-with-tokens` | Token-based, non-interactive CLI (env, deploy automation). |

#### `deploy-to-vercel`

- **Path:** [`.claude/skills/deploy-to-vercel/SKILL.md`](.claude/skills/deploy-to-vercel/SKILL.md)
- **When to use:** Deploying to Vercel, preview URLs, “push live,” preview deployments. May reference bundled scripts under the skill folder.

#### `vercel-cli-with-tokens`

- **Path:** [`.claude/skills/vercel-cli-with-tokens/SKILL.md`](.claude/skills/vercel-cli-with-tokens/SKILL.md)
- **When to use:** Non-interactive Vercel CLI flows—tokens, env vars, automation-friendly deploys.

---

### Uplifting existing products

| Skill | One-line role |
| --- | --- |
| `redesign-existing-projects` | Upgrade live UI to premium quality without a full rewrite. |

#### `redesign-existing-projects`

- **Path:** [`.claude/skills/redesign-existing-projects/SKILL.md`](.claude/skills/redesign-existing-projects/SKILL.md)
- **When to use:** Upgrading an existing app’s visual quality without a full rewrite—works across CSS stacks.

---

### Codebase intelligence and knowledge graph

| Skill | One-line role |
| --- | --- |
| `graphify` | Turn the repo (code, docs, content) into a queryable knowledge graph. |

#### `graphify`

- **Path:** [`.claude/skills/graphify/SKILL.md`](.claude/skills/graphify/SKILL.md)
- **When to use:** Any question about the codebase, its architecture, file relationships, or project content. Prefer `graphify query "<question>"` (plus `path`/`explain`) over raw grep when `graphify-out/graph.json` exists; run `/graphify .` to build the graph and `graphify update .` after code changes. Managed by the `graphify` CLI (`uv tool install graphifyy`), not `npx skills add`, so it is intentionally absent from `skills-lock.json`.

---

## Alphabetical index

Quick lookup: skill → category.

| Skill | Category |
| --- | --- |
| `adapt` | Targeted design passes |
| `ai-seo` | Product, growth, and positioning |
| `animate` | Targeted design passes |
| `audit` | Targeted design passes |
| `bolder` | Targeted design passes |
| `capacitor-best-practices` | Mobile: React Native, Expo, and Capacitor |
| `capacitor-performance` | Mobile: React Native, Expo, and Capacitor |
| `capacitor-security` | Mobile: React Native, Expo, and Capacitor |
| `clarify` | Targeted design passes |
| `colorize` | Targeted design passes |
| `critique` | Targeted design passes |
| `customer-persona` | Product, growth, and positioning |
| `delight` | Targeted design passes |
| `deploy-to-vercel` | Deploy and Vercel platform |
| `design-taste-frontend` | Core UI systems and visual foundations |
| `distill` | Targeted design passes |
| `emil-design-eng` | Motion, animation, and craft philosophy |
| `frontend-design` | Core UI systems and visual foundations |
| `full-output-enforcement` | Design planning, specs, and documentation |
| `graphify` | Codebase intelligence and knowledge graph |
| `high-end-visual-design` | Core UI systems and visual foundations |
| `impeccable` | Core UI systems and visual foundations |
| `industrial-brutalist-ui` | Core UI systems and visual foundations |
| `layout` | Targeted design passes |
| `minimalist-ui` | Core UI systems and visual foundations |
| `next-best-practices` | Web: Next.js, React, and composition |
| `optimize` | Targeted design passes |
| `overdrive` | Targeted design passes |
| `polish` | Targeted design passes |
| `prd` | Design planning, specs, and documentation |
| `pricing-strategy` | Product, growth, and positioning |
| `quieter` | Targeted design passes |
| `redesign-existing-projects` | Uplifting existing products |
| `shape` | Design planning, specs, and documentation |
| `supabase-postgres-best-practices` | Data: Postgres and Supabase |
| `typeset` | Targeted design passes |
| `vercel-cli-with-tokens` | Deploy and Vercel platform |
| `vercel-composition-patterns` | Web: Next.js, React, and composition |
| `vercel-react-best-practices` | Web: Next.js, React, and composition |
| `vercel-react-native-skills` | Mobile: React Native, Expo, and Capacitor |

---

## Installing or updating skills

Community skills are often added with tooling such as **`npx skills add`** (see links in [`AGENTS.md`](AGENTS.md)). After adding a new folder under `.claude/skills/`, add it under the right category above and extend the alphabetical index.
