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
# Local dev setup (destructive — drops & rebuilds DB, imports data, sets up secrets)
npm run init                # Safe to run repeatedly; always gives a clean state

# Development
npm run dev                 # Start local dev server on http://localhost:8787

# Tests
npm run test:e2e            # Builds admin, starts wrangler on 5174, runs Playwright

# Production (non-destructive — only applies unapplied migrations)
npm run init:remote         # Apply pending migrations to production D1
npm run deploy              # Deploy to Cloudflare (not auto-deployed on push)

# Admin
npm run create-admin <email>         # Create admin user locally
npm run create-admin:remote <email>  # Create admin user on production

## Local workflow

- Run `npm run typecheck` every time a change is made.
- `npm run dev` serves admin from `static/admin`; changes are picked up by the Vite build watcher and require a refresh.
```

## Database Migrations

Schema changes use [Wrangler D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/). Migration files live in `migrations/` and are tracked by a `d1_migrations` table.

- **Source of truth**: `migrations/*.sql` (not `schema.sql`, which is kept for reference only)
- **Migrations are append-only**: Never edit a migration after it has been applied to production
- **SQLite limitations**: `ALTER TABLE` only supports `ADD COLUMN` and `RENAME COLUMN`. Dropping columns requires the create-copy-drop-rename pattern.

### Creating a new migration

```bash
npm run db:migration:create -- add_video_url   # Creates migrations/0001_add_video_url.sql
# Edit the file with your ALTER TABLE / CREATE TABLE statements
npm run init                                    # Apply locally (rebuilds from scratch)
npm run test:e2e                                # Verify
# Commit the migration file with your code changes
# After merge:
npm run init:remote                             # Apply to production
npm run deploy
```

## Environment Variables

See `.env.template` for the list of required secret environment variables.

## Deployment

Pushing to `main` does **not** automatically deploy. To deploy changes to production, run:

```bash
npm run deploy
```

## Working with Claude Code

- **Commit after each phase**: When implementing multi-phase features, commit after completing each phase before moving to the next.
- **Admin UI style**: Avoid rounded corners. Keep a strict black/white palette with mid‑gray shades for contrast.
- **Dark mode support**: All design updates must work in both light and dark mode. Check `static/admin.css` for the theme variable patterns.

## Admin UI Components

- **ConfirmDialog**: Use `admin/src/components/ConfirmDialog.tsx` for delete confirmations and other destructive actions. Never use the browser's `confirm()` dialog.

## Before Completing a Task

**IMPORTANT**: Before handing control back to the user, always run:

1. `npm run format` - Format code using Prettier
2. `npm run typecheck` - Ensure all TypeScript types are correct
3. `npm run test:e2e` - Ensure all E2E tests pass

All checks must pass before informing the user that the task is complete. If tests fail:

- Fix the issues if they are related to your changes
- If the failure is unrelated to your changes or requires user input, inform the user about the failing tests and what attention is needed

## Admin State Management

The admin UI uses **TanStack Query** for server state and **Zustand** for local UI state.

### TanStack Query (Server State)

All data fetching uses TanStack Query hooks in `admin/src/api/queries.ts`:

- `useSession()` - Current user and available tables
- `useTable(tableName)` - Table data (projects, users)
- `useProject(projectId)` - Project detail with images
- `useUser(userId)` - User detail
- `useStudentProjects(userId)` - Projects for a specific student

Mutations are in `admin/src/api/mutations.ts` and automatically invalidate relevant queries.

### Zustand (Local UI State)

Zustand in `admin/src/store/adminStore.ts` handles:

- Selection state (`activeTable`, `selectedProjectId`, `selectedUserId`)
- Form editing state (`editDraft`, `editImages`, `printImage`)
- UI toggles (`darkMode`, `userMenuOpen`, `editModalOpen`)
- Filter state (`selectedYear`, `selectedContext`, `searchQuery`)

### Zustand Selector Rule (useShallow)

**Any zustand selector that returns an object or array MUST be wrapped with `useShallow`** from `zustand/shallow`. Without it, React 19's `useSyncExternalStore` sees a new reference on every render and triggers an infinite re-render loop (error #185).

```tsx
// WRONG — causes infinite re-renders with React 19
const { foo, bar } = useAdminStore((s) => ({ foo: s.foo, bar: s.bar }));

// CORRECT — useShallow does shallow comparison
const { foo, bar } = useAdminStore(useShallow((s) => ({ foo: s.foo, bar: s.bar })));

// Also fine — single primitive selectors don't need useShallow
const foo = useAdminStore((s) => s.foo);
```

### Migration Lessons (Do NOT Repeat These Mistakes)

When refactoring state management:

1. **Trace all consumers before removing state**: When removing sync patterns (e.g., `useEffect` that copies TanStack Query data to Zustand), search for ALL components that read from the old state source. A component reading stale/default values will fail silently until tests catch it.

2. **Check default values**: If a component checks `status === "ready"` and you remove the code that sets status to "ready", the condition will never be true. Verify what happens when state isn't populated.

3. **Local form state vs server state**: When a mutation succeeds (e.g., submit project), the server state updates but local form state (`editDraft`) doesn't automatically update. Add `onSuccess` callbacks to sync local state:

   ```tsx
   mutation.mutate(undefined, {
     onSuccess: () => updateEditField("status", "submitted"),
   });
   ```

4. **Run tests early and often**: Don't batch multiple refactoring changes. Test after each component migration to catch issues early.

### E2E Testing Best Practices

1. **Create dedicated test data for tests that modify data**: Don't use existing seed data (like "Bob Jones" or "Submit Student") for tests that edit/save. Parallel tests share the same database, so modifying shared data causes race conditions. Add a dedicated project to `scripts/seed-e2e.mjs` for such tests.

2. **Check database constraints before writing save tests**: The database has CHECK constraints (e.g., `program` must be one of 'BA_FO', 'BA_BK', 'MA_BK', 'PREMA_BK'). Seed data may have NULL for optional fields, but saving sends empty strings which fail constraints. Ensure test projects have valid values for all constrained fields.

3. **Understand test parallelism**: Tests run in parallel by default. Serial test blocks (`test.describe.serial`) run sequentially within the block but can still race with tests outside the block. If your test modifies data used by serial tests, create isolated test data.

4. **Check existing test usage**: Before using a project in a new test, grep for its name in `e2e/` to see what other tests depend on it.

5. **Avoid index-based selectors**: Never use `.nth(N)` on generic class selectors like `.filter-select` — inserting a new element shifts all indices and silently breaks tests. Instead, use semantic selectors: `aria-label`, `data-testid`, `role` attributes, or text content. For example, prefer `page.getByLabel("Context")` over `page.locator(".filter-select").nth(2)`. When adding new interactive elements, give them a distinguishing attribute so tests can target them directly.

## Development Phases

1. **Phase 1**: D1 schema + import script (import old data)
2. **Phase 2**: Simple Hono SSR frontend (list/detail views)
3. **Phase 3**: Public pages with context filtering
4. **Phase 4**: Admin section (future)
