# NomNom

Restaurant discovery through creators and locals — lists, map, discover, and paid list subscriptions.

## Stack

- Next.js (App Router) + React
- Supabase (Auth, Postgres)
- MUI theme + Stripe Connect
- Capacitor shells for Android/iOS

## Develop

```bash
npm install
cp .env.example .env.local   # fill in keys
npm run dev:webpack          # recommended; plain `npm run dev` uses Turbopack
```

App runs on [http://localhost:3032](http://localhost:3032).

## Common scripts

| Script | Purpose |
|--------|---------|
| `npm run dev:webpack` | Local Next server |
| `npm run build` | Production build |
| `npm test` | Node unit tests under `src/**/__tests__` |
| `npm run test:e2e` | Playwright |
| `npm run lint` | ESLint on `src` |
| `npm run generate-types` | Regenerate Supabase TS types |

## Layout

- `src/app` — routes + API
- `src/sections` — feature UI
- `src/libs` — domain helpers + server actions (lists under `src/libs/lists`)
- `src/auth` — auth context/guards; thin re-exports for legacy action paths
- `src/theme` — MUI theme
- `content/` + `src/content-platform` — SEO/MDX

See `DESIGN.md` / `BRAND.md` for visual direction.
