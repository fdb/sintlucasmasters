# Sint Lucas Masters Website

Student exhibition website for Sint Lucas Antwerpen Masters program.

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono (SSR with JSX)
- **Database**: Cloudflare D1 (SQLite)
- **Media Storage**: Cloudflare Images

## Development

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
