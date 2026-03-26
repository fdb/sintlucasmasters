---
name: deploy
description: Deploy the Sint Lucas Masters app to Cloudflare Workers — commits, pushes, applies pending D1 migrations, deploys, and verifies via health endpoint
---

# Deploy — Commit, Push, Migrate & Ship to Cloudflare

Safely deploy the Sint Lucas Masters application to production. Ensures everything is committed and pushed, applies pending database migrations, deploys the worker, and verifies the deployment is healthy.

**CRITICAL SAFETY RULES:**
- This skill NEVER drops, rebuilds, or re-initializes the database. It only applies *pending* migrations via `npm run init:remote`. The production database contains live student data.
- Deploys only from the `main` branch. If on any other branch, **stop** and tell the user.

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

### 3. Commit and push

Check for uncommitted changes:

```bash
git status
git diff
git diff --staged
```

If there are staged or unstaged changes:

1. Stage relevant files by name (`git add <file>...`). Never stage files that look like secrets (`.env`, credentials, keys).
2. Generate a concise commit message following the repo's style (`git log --oneline -5`). Summarize the "why" not the "what".
3. Commit using a HEREDOC:

```bash
git commit -m "$(cat <<'EOF'
Your commit message here.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

Then push:

```bash
git push
```

If the working tree is already clean, just ensure we're up to date with remote:

```bash
git push
```

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
