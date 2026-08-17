
## Health Stack

- typecheck: tsc --noEmit
- lint: eslint "src/**/*.{js,jsx}"
- test: `npm test` — NOT bare `node --test "src/**/__tests__/*.test.mjs"`. The real script
  is `node --import ./scripts/register-node-test-loader.mjs --test ...`; without that loader
  26 suites fail to load and ~200 tests silently never run, which reads as pre-existing
  failures. Expected: 1327 pass, 0 fail (62 suites).
- e2e: `npm run test:e2e:all` (Playwright; boots a dev server on :3032 and seeds the linked
  Supabase project via service role)
- deadcode: npx knip
- db contract: `npm run db:check:all` — asserts the tables/RPCs the shipped code calls
  actually exist on dev AND production. Run before/after any migration-bearing deploy.

## Two databases — the migration trap

There are TWO Supabase projects: `.env.local` → `jxknitagufcuyeozlazc` (dev) and
`.env.production` → `hjknsbgtjzgjsfkkaktm` (production, serves justnomnom.com).

`supabase/migrations/*.sql` is **gitignored** and `npm run supabase:link` is hardcoded to the
dev ref, so `supabase db push` can only ever reach dev. Vercel ships the app independently of
the database, so a feature can go fully live with its tables and RPCs missing on production.
That is exactly how Tonight shipped broken: every night RPC was absent on prod, PostgREST
returned PGRST202, and the error mapper collapsed it to "Something went wrong. Try again."

After any migration-bearing feature, run `npm run db:check:all`. To apply migrations to
production: `.env.production` holds `POSTGRES_PASSWORD` (not `SUPABASE_DB_PASSWORD`), so
connect with the `pg` package to `db.<ref>.supabase.co:5432` as user `postgres` with
`ssl: { rejectUnauthorized: false }`. The Supabase CLI cannot reach prod — the logged-in
account 403s on that project ref.

## Design & shared components

Two source-of-truth docs at the repo root:
- `DESIGN.md` — visual system (color, typography, spacing, anti-patterns)
- `COMPONENTS.md` — shared component catalog. Before building any UI, check
  `COMPONENTS.md` for an existing component (HubNavRow, SettingsSelectionRow,
  ProfileListItemRow, ResponsiveSheet, useSkeletonThemeColors,
  PasswordVisibilityAdornment, etc.) and theme tokens (SPACE, RADIUS,
  Z_INDEX, touchTargetSx, tabularNumsSx).

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Reels/content batches → invoke /content-machine
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
