
## Health Stack

- typecheck: tsc --noEmit
- lint: eslint "src/**/*.{js,jsx}"
- test: `npm test` — NOT bare `node --test "src/**/__tests__/*.test.mjs"`. The real script
  is `node --import ./scripts/register-node-test-loader.mjs --test ...`; without that loader
  26 suites fail to load and ~200 tests silently never run, which reads as pre-existing
  failures. Expected: 847 pass, 0 fail.
- e2e: `npm run test:e2e:all` (Playwright; boots a dev server on :3032 and seeds the linked
  Supabase project via service role)
- deadcode: npx knip

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
