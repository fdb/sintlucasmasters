# AGENTS.md

This is the Sint Lucas Masters student exhibition website using Cloudflare Workers + Hono + D1 + Cloudflare Images + R2.

## Old Code

The previous Eleventy-based implementation is preserved in `old/` for reference. Folders `2021/` to `2025/` contain the old projects. Images are already stored on Cloudflare Images.

## Commands

```bash
# Local dev setup (destructive — drops & rebuilds DB, imports data, sets up secrets)
npm run init                # Safe to run repeatedly; always gives a clean state

# Development
npm run dev                 # Start local dev server on http://localhost:8787

# Tests
npm run test
npm run test:e2e

# Production (non-destructive — only applies unapplied migrations)
npm run init:remote         # Apply pending migrations to production D1
npm run deploy              # Deploy to Cloudflare (not auto-deployed on push)
```

## Local workflow

- Before starting a feature check if we have a clean slate: run all tests to verify. If not, tell me.
- Before hand-off, make sure tests all pass (`npm run format`, `npm run typecheck`, `npm run test`, `npm run test:e2e`)
- When fixing a bug using TDD with red/green workflow.
- Commit after each phase

## Multi-domain (sites)

One Worker serves three public domains: `sintlucasmasters.com` (MA_BK + PREMA_BK), `sintlucasfotografie.com` (BA_FO), and `sintlucasgraduates.com` (umbrella, all programmes). The hostname is resolved to a `SiteConfig` by `siteMiddleware` (`src/middleware/site.ts`) and read from `c.var.site` everywhere downstream.

Editable per site:

- **Header / footer / copy** — `src/components/sites/{Masters,Fotografie,Graduates}Template.tsx`. Each file owns one site's chrome.
- **Programmes / nav / hostname / OG image / logo** — `src/sites.ts`. Adding a new programme to graduates is a one-line edit to `SITES.graduates.programmes` and `SITES.graduates.nav`.

Project URLs (`/:locale/:year/students/:slug/`) work on every domain. Listing URLs use path-based filters: `/:locale/:year/:programme[/:context]/`. Programme slug ↔ DB code is in `programmeToSlug` / `slugToProgramme`.

### Local dev: switching sites

`localhost:8787` defaults to **graduates** (umbrella view — easiest to spot regressions across all programmes). Switch with the `?__site=` query parameter; the choice is sticky for the session via the `slam_dev_site` cookie:

```
http://localhost:8787/nl/                       # graduates (default)
http://localhost:8787/nl/?__site=masters        # masters chrome + filter
http://localhost:8787/nl/?__site=fotografie     # fotografie chrome + filter
```

The override is **dev-only** — production hosts ignore both the query param and the cookie. E2E tests can also use the `X-Site-Override: masters` header instead of the query string.

## Design

- Strict black/white palette with mid-gray shades for contrast.
- No rounded corners.
- Use CSS variables for colors.
- Admin supports light and dark mode.

## Database Migrations

Schema changes use Wrangler D1 migrations. Migration files live in `migrations/` and are tracked by a `d1_migrations` table.

- **Source of truth**: `migrations/*.sql` (not `schema.sql`, which is kept for reference only)
- **Migrations are append-only**: Never edit a migration after it has been applied to production
- **SQLite limitations**: `ALTER TABLE` only supports `ADD COLUMN` and `RENAME COLUMN`. Dropping columns requires the create-copy-drop-rename pattern.

## Environment Variables

See `.env.template` for the list of required secret environment variables.

## Admin State Management

The admin UI uses **TanStack Query** for server state and **Zustand** for local UI state. Look in `admin/src/api/queries.ts` for TanStack Query hooks and `admin/src/store/adminstore.ts` for Zustand UI state.

Any zustand selector that returns an object or array MUST be wrapped with `useShallow` from `zustand/shallow`. Without it, React 19's `useSyncExternalStore` sees a new reference on every render and triggers an infinite re-render loop.

## Testing

- Tests run in parallel by default.
- Create dedicated test data for tests that modify data, since parallel tests share the same db.
- Database has CHECK constraints
- For E2E, avoid index-based selectors.
