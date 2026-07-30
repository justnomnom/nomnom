## Cursor Cloud specific instructions

### Quick reference

| Task | Command |
|------|---------|
| Dev server (webpack) | `npm run dev:webpack` |
| Dev server (turbopack) | `npm run dev` |
| Lint | `npm run lint` |
| Lint + fix | `npm run lint:fix` |
| Unit tests | `npm test` |
| E2E tests | `npm run test:e2e` |
| Build | `npm run build` |
| Prettier | `npm run prettier` |
| Android Play one-time setup | `npm run cap:android:setup` |
| Android Play release (.aab) | `npm run cap:android:release` |
| Capacitor sync (release) | `CAPACITOR_SERVER_URL=https://… npm run cap:sync:release` |
| Open Android Studio | `npm run cap:open:android` |
| Portugal geography audit | `npm run geo:pt:audit` |
| API table grants audit | `npm run db:audit-grants` |
| Apply API table grants | `npm run db:apply-grants` |
| Portugal geography generators | `npm run geo:pt:adm2`, `geo:pt:concelhos`, `geo:pt:adm3` (see `.cursor/prompts/geography-database-seed.md`) |

### Dev server

Use `npm run dev:webpack` (port 3032). The default `npm run dev` uses Turbopack, which may fail due to routing constraints. Webpack mode is the stable option for local development.

### Route conflict: `lists/[id]` vs `lists/[creatorHandle]`

The codebase originally had two dynamic route directories at the same level under the lists route group:
- `[id]/page.js` — serves `/lists/<uuid>`
- `[creatorHandle]/[listSlug]/page.js` — serves `/lists/<handle>/<slug>`

Next.js 16 does not allow different dynamic segment names at the same route level. The build succeeds (Vercel deploys each route as a serverless function), but `next dev` and `next start` crash at router initialization.

The fix merged `[id]/page.js` into `[creatorHandle]/page.js`, aliasing `params.creatorHandle` to `id` locally. Both routes now share the `[creatorHandle]` segment name. This is a naming-only change; all business logic is preserved.

### Environment variables

Secrets are injected as environment variables by the cloud agent infrastructure. A `.env.local` file must be generated at setup time from these env vars (the update script handles this). Key required secrets: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`.

### Backend dependencies

The app uses **hosted Supabase** (not local) for auth, database, and storage. No Docker or local database setup is needed. Stripe, Resend, Web Push (VAPID), Sentry, and PostHog are optional integrations controlled by `INTEGRATION_FLAGS` / config in `src/config-global.js`.

### Testing

- **Unit tests**: `npm test` runs Node.js native test runner against `src/**/__tests__/*.test.mjs` (214 tests).
- **E2E tests**: `npm run test:e2e` uses Playwright with Chromium. Requires `npm run test:e2e:install` first and E2E-specific env vars (`E2E_TEST_USER_EMAIL`, `E2E_TEST_USER_PASSWORD`).
- **Support unit tests** (no Supabase): `npm run test:e2e:support-unit`.

### TinaCMS

Optional. Run `npm run tina:dev` to start the local TinaCMS GraphQL server on port 4001 for content editing. Not required for general development.

### Capacitor / Google Play (Android)

The native app is a Capacitor WebView shell that loads the **hosted** Next.js app (`CAPACITOR_SERVER_URL` at sync time). It is not a static export of `next build`.

**One-time setup**

1. Install [Android Studio](https://developer.android.com/studio) and accept SDK licenses; set `ANDROID_HOME` or let Android Studio write `android/local.properties`.
2. `npm run cap:android:setup` — creates `android/nomnom-upload.keystore`, `android/keystore.properties`, and a gitignored `android/.play-signing-secrets.txt` backup (store passwords in a password manager).
3. Create the app in [Google Play Console](https://play.google.com/console) with package name `com.nomnom.app`.
4. Set `CAPACITOR_SERVER_URL` or `NEXT_PUBLIC_SITE_URL` in `.env.local` to your production HTTPS origin.

**Each release**

1. Deploy the web app to production (Vercel) so the URL in `.env.local` is live.
2. `npm run cap:android:release` — bumps patch version in `package.json` by default, preflight, sync, signed `.aab`.
   - `npm run cap:android:release -- --no-bump` to keep the current version
   - `npm run cap:android:release -- --bump minor` or `--version 5.8.0`
3. Upload `android/app/build/outputs/bundle/release/app-release.aab` to Play Console (internal testing first, then production).

**Local device testing (LAN)** — `CAPACITOR_SERVER_URL=http://192.168.x.x:3032 npm run cap:sync` plus `npm run dev:webpack`, then `npm run cap:open:android`.
