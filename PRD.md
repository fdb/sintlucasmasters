# Sint Lucas Masters Website - Product Requirements Document

A greenfield rewrite of the Sint Lucas Antwerpen Masters graduation showcase website. The system serves both web display and print production workflows.

## Goals

- Unified database of all student projects across all years
- Self-service student upload portal (replacing Google Forms workflow)
- Automated image validation for print requirements
- Admin workflow for review and print-ready approval
- Archive browsing by year and context
- Full Cloudflare stack: Workers for backend logic, D1 for database, Cloudflare Images for media hosting

## Tech Stack

| Component      | Technology                                   |
| -------------- | -------------------------------------------- |
| Platform       | Cloudflare Pages + Workers                   |
| Framework      | Hono (SSR with JSX)                          |
| Database       | Cloudflare D1 (SQLite)                       |
| Media Storage  | Cloudflare Images                            |
| Authentication | Magic link (email-based) via AWS SES         |
| Admin UI       | React + TypeScript SPA (Vite)                |
| CSS            | Minimal system font stack, dark mode support |

---

## Phase 1: Database & Data Migration

**Goal**: Validate the data model by importing all existing data

- [x] Design and create D1 schema locally
- [x] Write idempotent migration script to import existing markdown files
- [x] Verify all 307 projects import correctly
- [x] Test image ID extraction for both formats (full URLs and relative paths)
- [x] Year format normalized to "YYYY-YYYY"
- [x] Generate sort_name for proper alphabetical sorting

### Data Model

#### Project

| Field          | Type        | Required | Description                                  |
| -------------- | ----------- | -------- | -------------------------------------------- |
| id             | TEXT        | yes      | Primary key (deterministic hash)             |
| slug           | TEXT        | yes      | URL-safe identifier                          |
| student_name   | TEXT        | yes      | Full name of the student                     |
| sort_name      | TEXT        | yes      | ASCII-normalized name for sorting            |
| project_title  | TEXT        | yes      | Title of the master project                  |
| context        | TEXT        | yes      | One of the 5 contexts                        |
| academic_year  | TEXT        | yes      | Format: "2024-2025"                          |
| bio            | TEXT        | no       | Student biography/artist statement           |
| description    | TEXT        | yes      | Project description (markdown)               |
| main_image_id  | TEXT        | yes      | Cloudflare Images ID - used for print        |
| thumb_image_id | TEXT        | no       | Square thumbnail (falls back to main_image)  |
| tags           | TEXT (JSON) | no       | Material/medium tags as JSON array           |
| social_links   | TEXT (JSON) | no       | Portfolio, Instagram, etc. as JSON array     |
| status         | TEXT        | yes      | draft, submitted, ready_for_print, published |
| user_id        | TEXT        | no       | Foreign key to users table                   |
| created_at     | TEXT        | yes      | Timestamp                                    |
| updated_at     | TEXT        | yes      | Timestamp                                    |

#### ProjectImage

| Field         | Type    | Required | Description            |
| ------------- | ------- | -------- | ---------------------- |
| id            | TEXT    | yes      | Primary key            |
| project_id    | TEXT    | yes      | Foreign key to Project |
| cloudflare_id | TEXT    | yes      | Cloudflare Images ID   |
| sort_order    | INTEGER | yes      | Display order          |
| caption       | TEXT    | no       | Image caption          |

#### User

| Field         | Type | Required | Description               |
| ------------- | ---- | -------- | ------------------------- |
| id            | TEXT | yes      | Primary key               |
| email         | TEXT | yes      | Unique email address      |
| name          | TEXT | no       | Display name              |
| role          | TEXT | yes      | student, editor, or admin |
| created_at    | TEXT | yes      | Timestamp                 |
| last_login_at | TEXT | no       | Last login timestamp      |

#### AuthToken

| Field      | Type | Required | Description          |
| ---------- | ---- | -------- | -------------------- |
| id         | TEXT | yes      | Primary key          |
| email      | TEXT | yes      | Email address        |
| token      | TEXT | yes      | Magic link token     |
| created_at | TEXT | yes      | Timestamp            |
| expires_at | TEXT | yes      | Expiration timestamp |
| used_at    | TEXT | no       | When token was used  |

### Enums

**Contexts**: Autonomous Context, Applied Context, Digital Context, Socio-Political Context, Jewelry Context

**Status**: draft, submitted, ready_for_print, published

**Tags**: audio, ceramic, clay, digital, ink, installation, metal, paint, paper, performance, photography, screenprinting, sculpture, silver, textile, video

**Roles**: student, editor, admin

### Image Format Handling

**2021-2024** (full Cloudflare URLs):

```yaml
main_image: "https://imagedelivery.net/7-GLn6-56OyK7JwwGe0hfg/bf666892-6c85-4a27-b2f2-e46a66740e00"
```

Extract ID: `bf666892-6c85-4a27-b2f2-e46a66740e00`

**2025** (relative paths):

```yaml
main_image: alix-spooren/13TDsml0WUunYSaBjfJA1A0WXuz-5_bRn.jpg
```

ID is the full path: `alix-spooren/13TDsml0WUunYSaBjfJA1A0WXuz-5_bRn.jpg`

---

## Phase 2: Simple SSR Frontend

**Goal**: Validate the Hono + D1 approach works end-to-end

- [x] Create Hono app with SSR
- [x] Build list view showing all projects
- [x] Build detail view for single project
- [x] Minimal CSS (system fonts, basic spacing)
- [x] Dark mode support

### Project Structure

```
src/
├── index.tsx           # Hono app entry point
├── types.ts            # Type definitions + image URL helper
├── routes/
│   ├── home.tsx        # Year page (/:year/)
│   ├── project.tsx     # Project detail (/:year/students/:slug/)
│   ├── archive.tsx     # Archive page (/archive)
│   └── about.tsx       # About page (/about)
├── components/
│   ├── Layout.tsx      # HTML shell with CSS
│   ├── ProjectCard.tsx # Grid card component
│   └── AdminLayout.tsx # Auth page wrapper
├── middleware/
│   └── auth.ts         # Authentication middleware
└── lib/
    ├── jwt.ts          # JWT utilities
    ├── tokens.ts       # Magic token utilities
    ├── email.ts        # Email sending
    ├── aws-ses.ts      # AWS SES client
    └── names.ts        # Name normalization
```

### Routes

| Path                     | Description                         |
| ------------------------ | ----------------------------------- |
| `/`                      | Redirect to current year            |
| `/:year/`                | List projects for academic year     |
| `/:year/students/:slug/` | Project detail page                 |
| `/archive`               | Archive with year + context filters |
| `/about`                 | About page                          |

---

## Phase 3: Public Pages with Filtering

**Goal**: Complete the public-facing website

- [x] Current year page with context filter
- [x] Archive page with year selector and context filter
- [x] Responsive grid layout
- [x] SEO metadata (title, description, OG image)
- [x] Lightbox for gallery images

### Current Year Page (`/:year/`)

- Grid of project cards (main image + name + title)
- Context filter tabs (show all by default)
- Query parameter: `?context=Context Name`
- Sorted by student name (using sort_name)

### Archive Page (`/archive`)

- Year selector dropdown
- Context filter (same as current year)
- Dual filter navigation with URL parameters
- Shows year in project cards

### Project Detail Page (`/:year/students/:slug/`)

- Student name and project title
- Main image (large)
- Description
- Gallery images with lightbox
- Context and tags
- Social links
- Back navigation

---

## Phase 4: Admin Section

**Goal**: Replace Google Forms workflow with self-service portal

### Phase 4.1: Authentication Foundation

- [x] Magic link authentication via email
- [x] JWT token generation and verification
- [x] Session cookie management (httpOnly, secure)
- [x] Token expiration (15 minutes) and cleanup cron
- [x] User roles (student, editor, admin)

**Auth Routes**:

| Route              | Method | Description                        |
| ------------------ | ------ | ---------------------------------- |
| `/auth/login`      | GET    | Login page with email form         |
| `/api/auth/login`  | POST   | Send magic link email              |
| `/api/auth/me`     | GET    | Return current user info           |
| `/auth/verify`     | GET    | Verify token, set cookie, redirect |
| `/api/auth/logout` | POST   | Clear session cookie               |

**Auth Flow**:

1. User enters email at `/auth/login`
2. System generates token, stores in D1, emails link
3. User clicks link → `/auth/verify?token=xxx`
4. System validates token, creates/finds user, issues JWT cookie
5. Redirect to `/student` or `/admin` based on role

### Phase 4.2: Admin API (Read-Only)

- [x] Protected routes with admin/editor role check
- [x] Table browser API (`/api/admin/tables`, `/api/admin/table/:name`)
- [x] Project detail API (`/api/admin/projects/:id`)

### Phase 4.3: Admin SPA (React + Vite)

- [x] React + TypeScript SPA
- [x] Auth check on load
- [x] Table browser (users, projects, project_images)
- [x] Project detail view with images
- [x] Dark mode toggle
- [x] User menu with logout
- [x] Search and filter (year, context)
- [x] Responsive layout

**Admin SPA Structure**:

```
admin/
├── index.html
├── src/
│   ├── main.tsx          # SPA entry
│   ├── App.tsx           # Root component
│   └── api/client.ts     # Typed API client
├── vite.config.ts        # Dev proxy to Hono
└── tsconfig.json
```

### Phase 4.4: Admin API (Write Operations)

- [ ] `POST /api/admin/projects/:id/status` - Change project status
- [ ] `POST /api/admin/unlock-all` - Bulk unlock current year projects
- [ ] `GET /api/admin/users` - List all users
- [ ] `POST /api/admin/users` - Create new user
- [ ] `PATCH /api/admin/users/:id` - Update user (role, name)
- [ ] `DELETE /api/admin/users/:id` - Delete user

### Phase 4.5: Student Portal (SSR)

- [ ] Student dashboard (`/student`) showing user's project(s)
- [ ] Project edit form (`/student/project/:id`)
- [ ] Image upload with drag-and-drop
- [ ] Real-time image validation (resolution check for print)
- [ ] Preview of project page
- [ ] Submit for review button
- [ ] Edit restrictions based on status

**Student Routes**:

| Route                  | Method | Description                         |
| ---------------------- | ------ | ----------------------------------- |
| `/student`             | GET    | Dashboard showing user's project(s) |
| `/student/project/:id` | GET    | Edit form (if editable)             |
| `/student/project/:id` | POST   | Save changes                        |

**Edit Restrictions**:

- Students can edit while status is `draft` or `submitted`
- `ready_for_print` locks student edits
- Admin can bulk unlock to re-enable editing

### Phase 4.6: Print Workflow

- [ ] "Mark as ready for print" action in admin
- [ ] "Publish" action to make visible on public site
- [ ] Bulk actions (publish all ready projects)
- [ ] ZIP download for print production with high-res images

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

## Image Requirements

### Main Image (for print)

- Minimum resolution: 3000x3000px (or equivalent ~9MP)
- Formats: JPEG, PNG, TIFF
- Color space: sRGB or CMYK
- Used for printed catalog

### Gallery Images (web only)

- Minimum resolution: 1200px on longest side
- Formats: JPEG, PNG, GIF
- Automatically optimized by Cloudflare Images

### Thumbnail

- Square aspect ratio (1:1)
- Minimum 800x800px
- If not provided, crop from main_image center

### Cloudflare Images Variants

| Variant | Size      | Use              |
| ------- | --------- | ---------------- |
| thumb   | 600x600   | Grid cards       |
| medium  | 1000w     | Gallery display  |
| large   | 1600w     | Main image       |
| xl      | 2000x2000 | Lightbox / print |

---

## Cloudflare Configuration

- **Account hash**: `7-GLn6-56OyK7JwwGe0hfg`
- **Delivery URL**: `https://imagedelivery.net/7-GLn6-56OyK7JwwGe0hfg/{image_id}/{variant}`

### Cron Triggers

```toml
[triggers]
crons = ["0 0 * * *"]  # Daily token cleanup
```

---

## Security Considerations

- Magic link tokens: 15-minute expiry, single-use
- JWT: 7-day expiry, httpOnly cookie, secure in production
- All admin routes require admin/editor role
- Edit checks both ownership (user_id) and status lock
- Scheduled cleanup for expired/used auth_tokens

---

## Commands Reference

```bash
# Development
npm run dev                 # Start local dev server on http://localhost:8787

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
```

---

## Domain Configuration

- **Production URL**: `https://sintlucasmasters.com`
- **Email domain**: `sintlucasmasters.com` (verified in AWS SES)
- **From address**: `info@sintlucasmasters.com`

---

## Open Questions

- [ ] Should students be able to delete their project entirely?
- [ ] Do we need revision history for projects?
- [ ] Print deadline workflow - lock edits after certain date automatically?
- [ ] Image validation thresholds - what exactly should trigger warnings vs errors?

## Resolved Questions

- [x] How do students authenticate? → Magic link (email)
- [x] Should students be able to edit after submission? → Yes, until "ready for print"
- [x] What happens to projects after graduation? → Permanent archive
- [x] How do we handle initial "seeding" of students? → Students self-register, admins can create users
