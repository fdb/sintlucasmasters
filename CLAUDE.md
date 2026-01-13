# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the Sint Lucas Masters student exhibition website, being rewritten from Eleventy to Cloudflare Workers + Hono + D1.

**Current status**: Greenfield rewrite in progress. See `specs/cloudflare-rewrite.md` for the full specification.

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

## Commands (New - TBD)

```bash
# Development
npm run dev

# Run migration from old data
npm run migrate

# Build
npm run build
```

## Development Phases

1. **Phase 1**: D1 schema + migration script (import old data)
2. **Phase 2**: Simple Hono SSR frontend (list/detail views)
3. **Phase 3**: Public pages with context filtering
4. **Phase 4**: Admin section (future)
