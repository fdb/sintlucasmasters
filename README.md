# Sint Lucas Masters Website

Student exhibition website for Sint Lucas Antwerpen Masters program.

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono (SSR with JSX)
- **Database**: Cloudflare D1 (SQLite)
- **Media Storage**: Cloudflare Images

## Development

`npm run dev` runs `wrangler dev` and a Vite build watcher that outputs admin assets to `static/admin`. Refresh `/admin` to see changes.

```bash
# Install dependencies
npm install

# Setup secrets (requires 1Password CLI)
npm run setup-secrets

# Create local D1 database schema
npm run db:init

# Import student data from old markdown files
npm run import

# Start development server (port 8787)
# Visit http://localhost:8787
npm run dev

# (Optional) run the admin Vite dev server with HMR
# Visit http://localhost:5173
npm run dev:admin:serve

# Run end-to-end tests (builds admin first, then starts wrangler on 5174)
npm run test:e2e
```

## Deploying to Cloudflare

```bash
# First time setup only:
npm run db:init:remote       # Create schema on production D1
npm run import:remote        # Import data to production D1
npm run setup-secrets:remote # Upload secrets to Cloudflare

# Every time you deploy:
npm run deploy
```

## Project Structure

```text
src/
├── index.tsx          # Hono app entry point
├── components/        # JSX components (Layout, ProjectCard)
└── types.ts           # TypeScript types

scripts/
├── import-to-d1.mjs   # Import old markdown data to D1
└── setup-secrets.mjs  # Setup local/remote secrets

old/                   # Legacy Eleventy site (data source for import)
├── 2021-2025/         # Student markdown files by year
└── ...

schema.sql             # D1 database schema
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
