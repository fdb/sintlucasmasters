# AGENTS.md

This file provides guidance to Codex CLI when working with code in this repository.

## Project Overview

This is the Sint Lucas Masters student exhibition website, being rewritten from Eleventy to Cloudflare Workers + Hono + D1.

**Current status**: Greenfield rewrite in progress. See `specs/cloudflare-rewrite.md` for the full specification.

## Domain

- **Production URL**: `https://sintlucasmasters.com`
- **Email domain**: `sintlucasmasters.com` (verified in AWS SES)
- **From address**: `info@sintlucasmasters.com`

## Tech Stack (New)

- **Platform**: Cloudflare Pages + Workers
- **Framework**: Hono (SSR with JSX)
- **Database**: Cloudflare D1 (SQLite)
- **Media Storage**: Cloudflare Images (existing)

## Old Code Reference

The previous Eleventy-based implementation is preserved in `old/` for reference during migration:

```
old/
├── 2021/              # Year folders with student markdown files
├── 2022/
├── 2023/
├── 2024/
├── 2025/
├── admin/             # Decap CMS configuration
├── scripts/           # CSV import scripts
├── _data/             # Eleventy data files
├── _uploads/          # Uploaded images
└── package.json       # Old dependencies (Eleventy)
```

### Student Data Model (Old)

Student markdown files in `old/{year}/students/*.md` use this frontmatter:

```yaml
student_name: "Name"
project_title: "Title"
context: "Digital Context" | "Autonomous Context" | "Applied Context" | "Socio-Political Context" | "Jewelry Context"
year: "2024-2025"
main_image: "slug/image-id.jpeg"  # or full Cloudflare URL for 2021-2024
images: []
social_links: []
```

### Image Formats

- **2021-2024**: Full Cloudflare URLs (`https://imagedelivery.net/7-GLn6-56OyK7JwwGe0hfg/{id}`)
- **2025**: Relative paths (`student-slug/image-id.jpg`)

## Commands

```bash
# Development
npm run dev                 # Start local dev server on http://localhost:8787

# Tests
npm run test:e2e            # Starts wrangler on 5174, runs Playwright

# Database
npm run db:init             # Create schema locally
npm run db:init:remote      # Create schema on production D1
npm run import              # Import old data to local D1
npm run import:remote       # Import old data to production D1
npm run db:rebuild          # Drop tables, recreate schema, and import (local)
npm run db:rebuild:remote   # Drop tables, recreate schema, and import (remote)

# Build & Deploy
npm run build               # Dry-run deploy
npm run deploy              # Deploy to Cloudflare

# Admin
npm run create-admin <email>         # Create admin user locally
npm run create-admin:remote <email>  # Create admin user on production

## Local workflow

- Run `npm run typecheck` every time a change is made.
- `npm run dev` starts only Wrangler (no separate build step needed).
- Admin pages are server-rendered with Hono JSX.
- Client-side JS in `static/admin/` provides drag-drop and dark mode.
```

## Environment Variables

See `.env.template` for the list of required secret environment variables.

## Working with Claude Code

- **Commit after each phase**: When implementing multi-phase features, commit after completing each phase before moving to the next.
- **Admin UI style**: Avoid rounded corners. Keep a strict black/white palette with mid‑gray shades for contrast.
- **Dark mode support**: All design updates must work in both light and dark mode. Check `static/admin.css` for the theme variable patterns.

## Before Completing a Task

**IMPORTANT**: Before handing control back to the user, always run:

1. `npm run format` - Format code using Prettier
2. `npm run typecheck` - Ensure all TypeScript types are correct
3. `npm run test:e2e` - Ensure all E2E tests pass

All checks must pass before informing the user that the task is complete. If tests fail:

- Fix the issues if they are related to your changes
- If the failure is unrelated to your changes or requires user input, inform the user about the failing tests and what attention is needed

## Development Phases

1. **Phase 1**: D1 schema + import script (import old data) - DONE
2. **Phase 2**: Simple Hono SSR frontend (list/detail views) - DONE
3. **Phase 3**: Public pages with context filtering - DONE
4. **Phase 4**: Admin section with SSR - DONE
