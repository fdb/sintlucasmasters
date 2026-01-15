# Phase 4: Admin Section

Specification for adding authentication and admin functionality to Sint Lucas Masters website.

## Requirements Summary

- **Student auth**: Magic link (email-based) via Resend
- **Admin auth**: Same system, with admin flag in database
- **Admin UI**: React + TypeScript SPA built with Vite (no SSR)
- **Public/student**: Remain Hono SSR (admin is the only SPA)
- **Edit policy**: Editable until admin marks "ready for print"; admin can bulk unlock
- **MVP scope**: Review + publish only (no ZIP export yet)
- **Testing**: Unit (Vitest) + E2E (Playwright) are required

---

## Database Schema Changes

Add new tables and modify existing:

```sql
-- Users table (students and admins)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    is_admin INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_login_at TEXT
);

-- Magic link tokens
CREATE TABLE IF NOT EXISTS auth_tokens (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    used_at TEXT
);

-- Link users to their projects (for student portal)
ALTER TABLE projects ADD COLUMN user_id TEXT REFERENCES users(id);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_auth_tokens_token ON auth_tokens(token);
CREATE INDEX idx_projects_user_id ON projects(user_id);
```

---

## Project Structure

New files to create:

```
admin/
├── index.html
├── src/
│   ├── main.tsx          # SPA entry
│   ├── App.tsx
│   ├── routes/           # Admin pages (dashboard, project, users)
│   ├── components/       # Admin UI components (e.g., AdminProjectCard)
│   └── api/client.ts     # Typed API client wrappers
├── vite.config.ts        # Includes dev proxy to Hono
└── tsconfig.json

src/
├── middleware/
│   └── auth.ts           # JWT verification, session handling
├── routes/
│   ├── auth.tsx          # /auth/* routes (login, verify, logout)
│   ├── student.tsx       # /student/* routes (dashboard, edit project)
│   └── admin.ts          # /api/admin/* routes (JSON only)
├── components/
│   ├── LoginForm.tsx     # Email input for magic link
│   ├── StudentDashboard.tsx
│   └── ProjectForm.tsx   # Edit form for students
├── lib/
│   ├── email.ts          # Resend email sending
│   ├── jwt.ts            # JWT sign/verify utilities
│   └── tokens.ts         # Token generation/validation
└── index.tsx             # Add new route imports
```

---

## Implementation Phases

### Phase 4.1: Authentication Foundation

1. **Install dependency**: `npm install resend`

2. **Add bindings** to `src/index.tsx`:
   ```typescript
   type Bindings = {
     DB: D1Database;
     RESEND_API_KEY: string;
     JWT_SECRET: string;
     APP_BASE_URL: string;
   };
   ```

3. **Create `src/lib/jwt.ts`**:
   - `signToken(payload, secret)` - Create JWT with 7-day expiry
   - `verifyToken(token, secret)` - Verify and decode JWT
   - Payload: `{ userId, email, isAdmin }`

4. **Create `src/lib/tokens.ts`**:
   - `generateMagicToken()` - Random 32-char token
   - `storeMagicToken(db, email, token)` - Save to auth_tokens with 15min expiry
   - `verifyMagicToken(db, token)` - Check valid & unused, mark as used

5. **Create `src/lib/email.ts`**:
   - `sendMagicLink(resendKey, email, token, baseUrl)`
   - Simple HTML template with login link

6. **Create `src/middleware/auth.ts`**:
   - `authMiddleware` - Parse JWT from cookie, attach user to context
   - `requireAuth` - Redirect to login if not authenticated
   - `requireAdmin` - Check isAdmin flag, 403 if not

### Phase 4.2: API Routes (Auth + Admin)

**Create `src/routes/auth.tsx`** (server endpoints only; admin UI is SPA). Export two routers:

- `authApiRoutes` → mounted at `/api/auth`
- `authVerifyRoutes` → mounted at `/auth` (magic link verify + redirect)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/login` | POST | Send magic link email |
| `/api/auth/me` | GET | Return current user info |
| `/auth/verify` | GET | Verify token, create session (sets cookie, redirects) |
| `/api/auth/logout` | POST | Clear session cookie |

**Flow**:
1. Admin SPA posts email to `/api/auth/login`
2. System generates token, stores in D1, emails link
3. User clicks link → `/auth/verify?token=xxx`
4. System validates token, creates/finds user, issues JWT cookie
5. Redirect to `/student` or `/admin` based on isAdmin

### Phase 4.3: Admin SPA (React + Vite)

**Create `admin/` app**:

- React + TypeScript SPA built with Vite
- Calls Hono API routes under `/api/*`
- Auth relies on httpOnly JWT cookie set by `/auth/verify`
- SPA routes live under `/admin/*` with index.html fallback

**Vite dev proxy** (avoid CORS, keep same-origin semantics):

```ts
// admin/vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
      '/auth': 'http://localhost:8787'
    }
  }
});
```

**Build output**:
- Output to `static/admin/` (served via Hono static middleware)
- Add `static/admin/` to `.gitignore`
- Ensure `/admin/*` routes fallback to `admin/index.html`

### Phase 4.4: Student Portal (SSR)

**Create `src/routes/student.tsx`**:

| Route | Method | Description |
|-------|--------|-------------|
| `/student` | GET | Dashboard showing user's project(s) |
| `/student/project/:id` | GET | Edit form (if editable) |
| `/student/project/:id` | POST | Save changes |

**Edit restrictions**:
- Check `status !== 'ready_for_print'` before allowing edits
- Show read-only view if locked

**sort_name generation**:
- When saving a project, auto-generate `sort_name` from `student_name`
- Use the `sortName()` utility from `src/lib/names.ts`
- This ensures proper alphabetical sorting for names with diacritics (e.g., "Çifel" sorts with "C")

### Phase 4.5: Admin API (JSON)

**Create `src/routes/admin.ts`**:

| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/projects` | GET | Project list (filter/sort) |
| `/api/admin/projects/:id` | GET | Review single project |
| `/api/admin/projects/:id/status` | POST | Change status (ready_for_print, published) |
| `/api/admin/unlock-all` | POST | Bulk unlock current year projects |
| `/api/admin/users` | GET | List all users |
| `/api/admin/users` | POST | Create new user (student or admin) |

**Admin dashboard features**:
- Filter by: status, context, year
- Sort by: student name, status, updated date
- Status badges: draft, submitted, ready_for_print, published
- Quick actions: mark ready, publish

---

## Status Flow

```
draft → submitted → ready_for_print → published
                  ↑                 ↓
                  └── (admin unlock) ←┘
```

- **Students**: Can edit while `draft` or `submitted`
- **Admin "ready for print"**: Locks student edits
- **Admin "unlock all"**: Bulk resets current year to `submitted`
- **Admin "publish"**: Makes visible on public site

---

## Routes Summary

Add to `src/index.tsx`:

```typescript
// Auth routes
app.route('/api/auth', authApiRoutes);
app.route('/auth', authVerifyRoutes);

// Protected routes
app.use('/student/*', authMiddleware, requireAuth);
app.route('/student', studentRoutes);

app.use('/api/admin/*', authMiddleware, requireAdmin);
app.route('/api/admin', adminRoutes);

// Admin SPA static assets
// Serve /admin/* from static/admin with index.html fallback
```

---

## Security Considerations

- Magic link tokens: 15-minute expiry, single-use
- JWT: 7-day expiry, httpOnly cookie, secure in production
- All admin routes check `isAdmin` flag
- Edit checks both ownership (user_id) and status lock
- Add scheduled cleanup for expired/used auth_tokens (see below)

---

## Token Cleanup (Cron)

Yes — Cloudflare Workers supports scheduled Cron triggers. Add a scheduled handler to delete expired or used tokens and keep the auth table small.

**Worker scheduled handler**:

```ts
export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(env.DB.prepare(
      `DELETE FROM auth_tokens
       WHERE used_at IS NOT NULL
          OR expires_at <= datetime('now')`
    ).run());
  }
};
```

**wrangler.toml**:

```toml
[triggers]
crons = ["0 0 * * *"] # every 24 hours
```

---

## Bootstrap & Migration

### CLI Tool: `npm run create-admin`

Interactive command to create the first admin user (bootstrap):

```bash
npm run create-admin
# Prompts for: email, name
# Creates user with is_admin = 1
# Works with both --local and --remote flags
```

**Script**: `scripts/create-admin.mjs`

```javascript
// Usage: node scripts/create-admin.mjs --local
// Usage: node scripts/create-admin.mjs --remote

// 1. Prompt for email and name
// 2. Generate deterministic user ID from email
// 3. INSERT OR REPLACE into users table with is_admin = 1
// 4. Output success message with login instructions
```

This admin can then create additional admins via the Admin UI.

### Existing Data Migration

- Existing projects remain unassigned (user_id = NULL)
- Students register via magic link, create new projects
- Future: Admin could manually assign orphaned projects to students

---

## Verification Plan

1. **Unit tests** (Vitest):
   - JWT + token utilities (worker)
   - Admin SPA state + API client (front-end)
2. **E2E tests** (Playwright):
   - Login flow (enter email → receive link → verify → dashboard)
   - Student can edit own project
   - Student cannot edit after "ready for print"
   - Admin can change status
   - Admin can bulk unlock
3. **Manual testing**:
   - Check email delivery via Resend dashboard
   - Test on mobile devices
   - Verify cookie handling across browsers

---

## Files Summary

### Files to Modify

| File | Changes |
|------|---------|
| `schema.sql` | Add users, auth_tokens tables; add user_id to projects |
| `src/index.tsx` | Add bindings, import route modules |
| `wrangler.toml` | Add env var bindings if needed |
| `package.json` | Add resend dependency, Vite/React tooling, test scripts |

### New Files

| File | Purpose |
|------|---------|
| `admin/vite.config.ts` | Vite config + proxy |
| `admin/src/main.tsx` | SPA entry |
| `admin/src/App.tsx` | Root admin app |
| `admin/src/api/client.ts` | API wrappers |
| `src/lib/jwt.ts` | JWT utilities |
| `src/lib/tokens.ts` | Magic token utilities |
| `src/lib/email.ts` | Resend email sending |
| `src/lib/names.ts` | Name normalization for sorting (already created) |
| `src/middleware/auth.ts` | Auth middleware |
| `src/routes/auth.tsx` | Login/verify/logout |
| `src/routes/student.tsx` | Student dashboard |
| `src/routes/admin.ts` | Admin API routes |
| `src/components/LoginForm.tsx` | Login UI |
| `src/components/StudentDashboard.tsx` | Student UI |
| `src/components/ProjectForm.tsx` | Edit form |
| `scripts/create-admin.mjs` | CLI tool to bootstrap first admin user |

---

## Open Questions (from original spec)

These questions from the original spec are now resolved:

- [x] How do students authenticate? → **Magic link (email)**
- [x] Should students be able to edit after submission? → **Yes, until "ready for print"**
- [ ] Should students be able to delete their project entirely? → TBD
- [ ] What happens to projects after graduation? → Permanent archive (implied)
- [ ] Do we need revision history for projects? → Not in MVP
- [ ] Print deadline workflow - lock edits after certain date? → Admin manual lock via "ready for print"
- [ ] How do we handle initial "seeding" of students for each academic year? → Students self-register
