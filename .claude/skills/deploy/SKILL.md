---
name: deploy
description: Deploy the Sint Lucas Masters app to Cloudflare Workers — verifies main is clean and pushed, applies pending D1 migrations, deploys, and verifies via health endpoint
---

# Deploy — Verify, Migrate & Ship to Cloudflare

Safely deploy the Sint Lucas Masters application to production. Verifies the working tree is clean and `main` is pushed, applies pending database migrations, deploys the worker, and verifies the deployment is healthy. **The skill never commits or pushes on the user's behalf — that must already be done.**

**CRITICAL SAFETY RULES:**
- This skill NEVER drops, rebuilds, or re-initializes the database. It only applies *pending* migrations via `npm run init:remote`. The production database contains live student data.
- Deploys only from the `main` branch. If on any other branch, **stop** and tell the user.
- **NEVER deploys from a dirty working tree.** All changes must be committed AND pushed to `origin/main` before deploying. If there are uncommitted changes, untracked files, or unpushed commits, **stop** and tell the user to commit and push first. This skill must not create commits or push on the user's behalf — the deployed commit must be a deliberate human action.

## Steps

### 1. Verify we're on main

```bash
git branch --show-current
```

If the branch is NOT `main`, **stop immediately** and tell the user: "Can only /deploy from the main branch. You're on `<branch>`. Merge to main first."

### 2. Pre-flight checks

Run these checks before deploying:

```bash
npm run typecheck
npm run test
```

If either fails, **stop** — do not deploy broken code.

### 3. Verify clean working tree and synced with origin/main

**This is a hard gate.** The skill must NOT create commits, stage files, or push on behalf of the user. Only verify, and refuse if anything is off.

First, fetch the latest remote state so the comparison is accurate:

```bash
git fetch origin main
```

Then check three things:

```bash
# 1. Working tree must be fully clean (no staged, unstaged, or untracked files)
git status --porcelain

# 2. Local main must exactly match origin/main
git rev-parse HEAD
git rev-parse origin/main
```

**Stop and refuse to deploy if any of these are true:**

- `git status --porcelain` produces ANY output → there are uncommitted or untracked changes. Tell the user: "Working tree is dirty. Commit (or stash/clean) all changes before deploying. /deploy will not commit on your behalf."
- `HEAD` ≠ `origin/main` → either local is ahead (unpushed commits) or behind (need to pull). Tell the user: "Local `main` is not in sync with `origin/main`. Push (or pull) before deploying."

Only proceed to step 4 when the working tree is clean AND `HEAD` exactly equals `origin/main`.

### 4. Apply pending D1 migrations

Run migrations against the **remote** (production) database:

```bash
npm run init:remote
```

This runs `wrangler d1 migrations apply sintlucasmasters --remote`, which only applies **unapplied** migrations. It never drops or recreates tables.

If this fails, **stop** — do not deploy. Report the migration error to the user.

### 5. Deploy to Cloudflare

```bash
npm run deploy
```

This builds the admin frontend and deploys the worker. Watch the output for:
- Build errors (admin Vite build)
- Upload failures
- Wrangler errors

If the deploy fails, report the error and stop.

### 6. Verify deployment health

After deploy completes, wait 5 seconds for propagation, then hit the health endpoint:

```bash
curl -s https://sintlucasmasters.com/api/health 2>/dev/null || curl -s https://sintlucasmasters.nodebox.workers.dev/api/health
```

Expected response: `{"status":"ok","db":"connected","version":"<git-short-hash>"}`

If the health check fails or returns an error:
1. Report the failure to the user
2. Suggest checking Cloudflare dashboard logs
3. Do NOT automatically roll back — let the user decide

### 7. Smoke test the public site

```bash
curl -s -o /dev/null -w "%{http_code}" https://sintlucasmasters.com/nl/ 2>/dev/null || curl -s -o /dev/null -w "%{http_code}" https://sintlucasmasters.nodebox.workers.dev/nl/
```

Expected: HTTP 200. If not 200, report to the user.

### 8. Report

Summarize:
- Commit (new commit hash or "already clean")
- Push status
- Migration status (how many applied, or "already up to date")
- Deploy status (success/failure)
- Health check result (status, project count)
- Public site HTTP status
