# Sint Lucas Masters Website

Student exhibition website for Sint Lucas Antwerpen Masters program.

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono (SSR with JSX)
- **Database**: Cloudflare D1 (SQLite)
- **Media Storage**: Cloudflare Images

## Local Development Setup

```bash
npm install
npm run init        # Drops & rebuilds DB, imports data, writes local dev vars, creates fake users
npm run dev         # Start dev server on http://localhost:8787
```

`npm run init` is **destructive** — it drops and recreates the local database from scratch every time. Safe to run repeatedly; it always gives you a clean state.

Regular local development does not require 1Password or live service secrets. `npm run init` writes `.dev.vars` with localhost auth, a deterministic dev JWT secret, and fake translation enabled.

Run `npm run setup-secrets` only when you intentionally want local dev to use live-service credentials from 1Password, such as SES email, Cloudflare Images/account credentials, and Anthropic translation.

`npm run dev` runs `wrangler dev` and a Vite build watcher that outputs admin assets to `static/admin`. Refresh `/admin` to see changes.

```bash
# Other local commands
npm run test:e2e    # Build admin, start wrangler on 5174, run Playwright tests
npm run typecheck   # Type-check both worker and admin code
```

## Production

Production deploys are **automatic**: merging a pull request into `main` triggers a
Cloudflare Workers Build that applies pending D1 migrations, deploys the Worker, and
verifies the deployed version via the health endpoint. No local credentials or manual
steps are needed — anyone who can merge a PR can ship.

The pipeline (configured in the Cloudflare dashboard, Workers & Pages → sintlucasmasters
→ Settings → Builds):

| Setting                      | Value                                                                                                                                                                             |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production branch            | `main`                                                                                                                                                                            |
| Build command                | `npm run build:admin`                                                                                                                                                             |
| Deploy command               | `npm run deploy:ci`                                                                                                                                                               |
| Non-production branch builds | **disabled** (preview versions would share the production D1 binding)                                                                                                             |
| API token                    | custom token — the auto-generated one lacks D1 permissions. Scopes: Account Settings:Read, Workers Scripts:Edit, **D1:Edit**, Workers R2 Storage:Edit; Zone → Workers Routes:Edit |
| Build variables              | `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` (secrets — without them sourcemaps are neither uploaded to Sentry nor stripped from the bundle)                               |

`npm run deploy:ci` runs `init:remote` (applies **unapplied** migrations only — never
drops tables or deletes data), then `wrangler deploy`, then `scripts/verify-deploy.mjs`,
which polls `/api/health` until the deployed version equals the built commit SHA and
smoke-tests the public site. A failed migration aborts the deploy; a failed verification
marks the build red in the dashboard and on the commit.

Branch protection on `main` requires the CI workflow (typecheck, unit tests, e2e) to
pass on every PR before merge, so a deploy can only start from a commit that passed CI.

### Manual deploy (fallback)

If the Workers Build pipeline is unavailable:

```bash
# Apply pending database migrations (non-destructive, safe to run repeatedly)
npm run init:remote

# Deploy the application
npm run deploy
```

`npm run init:remote` only applies **unapplied** migrations. It never drops tables or deletes data. Run it before every deploy that includes a new migration.

```bash
# One-time production setup (first deploy only)
npm run init:remote                          # Apply migrations
node scripts/import-to-d1.mjs --remote      # Import data
npm run setup-secrets:remote                 # Upload secrets to Cloudflare
npm run create-admin:remote <email>          # Create first admin user
npm run deploy
```

## Database Migrations

Schema changes use Wrangler D1 migrations. Source of truth is `migrations/*.sql`.

```bash
# Create a new migration
npm run db:migration:create -- add_video_url

# Edit migrations/0001_add_video_url.sql with your SQL
# Apply locally and test
npm run init
npm run test:e2e

# Merging the PR applies the migration to production automatically
# (the deploy pipeline runs `init:remote` before `wrangler deploy`)
```

Migrations are **append-only** — never edit a migration after it has been applied to production.

## Project Structure

```text
src/                   # Hono app (SSR with JSX)
admin/                 # React admin SPA (Vite)
migrations/            # D1 migration SQL files (source of truth for schema)
scripts/               # Import, seed, and setup scripts
old/                   # Legacy Eleventy site (data source for import)
schema.sql             # Reference copy of current schema (not executed)
```

## Public Locales

- Public pages are locale-prefixed: `/nl/...` and `/en/...` (mapped to `nl_BE` and `en_BE`).
- Legacy unprefixed public routes redirect permanently (`301`) to `/nl/...`.

## Bilingual Project Content

Project content is stored in both Dutch and English:

- `project_title_en`, `project_title_nl`
- `bio_en`, `bio_nl`
- `description_en`, `description_nl`
- `location_en`, `location_nl`

The `context` field uses canonical keys in the database: `autonomous`, `applied`, `digital`, `sociopolitical`, `jewelry`.
