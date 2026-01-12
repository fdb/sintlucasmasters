# Sint Lucas Masters Website Rewrite

A greenfield rewrite of the Sint Lucas Antwerpen Masters graduation showcase website. The system serves both web display and print production workflows.

## Goals

- Unified database of all student projects across all years (currently spread across year folders)
- Self-service student upload portal (replacing Google Forms workflow)
- Automated image validation for print requirements
- Admin workflow for review and print-ready approval
- Archive browsing by year and context
- **Full Cloudflare stack**: Workers for backend logic, D1 for database, Cloudflare Images for media hosting

## Tech Stack

- **Platform**: Cloudflare Pages + Workers
- **Database**: Cloudflare D1 (SQLite)
- **Media Storage**: Cloudflare Images (original variant for print export)
- **Frontend (Portals)**: React SPA with Vite, deployed on Cloudflare Pages
- **Frontend (Public)**: Static site generation, SEO-optimized, lightweight (no heavy frameworks)
- **Email**: Resend (magic link authentication)
- **Analytics**: Cloudflare Analytics (privacy-first, no cookies)
- **Configuration**: `config.ts` for environment-specific settings

---

## Data Model

### Project

| Field | Type | Required | Max Length | Description |
|-------|------|----------|------------|-------------|
| id | uuid | yes | — | Primary key |
| slug | string | yes | — | URL-safe identifier (auto-generated from name) |
| student_name | string | yes | — | Full name of the student |
| student_email | string | yes | — | Email for magic link auth |
| project_title | string | yes | 100 chars | Title of the master project |
| context_id | uuid | yes | — | Foreign key to Context |
| academic_year_id | uuid | yes | — | Foreign key to AcademicYear |
| bio | text | no | — | Student biography/artist statement (about the artist) |
| summary | text | yes | 300 chars | Short summary for print catalog |
| description | text | yes | 1500 chars | Project description (about this specific project) |
| main_image_id | string | yes | — | Cloudflare Images ID - used for print |
| main_image_caption | string | no | 200 chars | Caption for the main image |
| thumb_image_id | string | no | — | Square thumbnail (falls back to main_image) |
| tags | TEXT (JSON) | no | — | Material/medium tags as JSON array |
| social_links | TEXT (JSON) | no | — | Array of URLs, platform auto-detected |
| status | enum | yes | — | draft, image_missing, submitted, ready_for_print, published |
| created_at | datetime | yes | — | |
| updated_at | datetime | yes | — | |

### ProjectImage

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | uuid | yes | Primary key |
| project_id | uuid | yes | Foreign key to Project |
| cloudflare_id | string | yes | Cloudflare Images ID |
| sort_order | int | yes | Display order (upload sequence) |
| caption | string | no | Image caption |

### AcademicYear

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | uuid | yes | Primary key |
| year | string | yes | Format: "2024-2025" |
| is_active | boolean | yes | Whether students can submit |
| created_at | datetime | yes | |

### Context

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | uuid | yes | Primary key |
| name | string | yes | e.g., "Digital Context" |
| slug | string | yes | e.g., "digital-context" |
| academic_year_id | uuid | yes | Foreign key to AcademicYear |

### User

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | uuid | yes | Primary key |
| email | string | yes | Login identifier |
| role | enum | yes | student, admin, super_admin |
| created_at | datetime | yes | |

### MagicLinkToken

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | uuid | yes | Primary key |
| user_id | uuid | yes | Foreign key to User |
| token | string | yes | Secure random token |
| expires_at | datetime | yes | Expiration timestamp |
| used | boolean | yes | Whether token has been used |

### AlumniEditToken

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | uuid | yes | Primary key |
| project_id | uuid | yes | Foreign key to Project |
| token | string | yes | Secure random token |
| expires_at | datetime | yes | Expiration (e.g., 1 month) |
| created_by | uuid | yes | Admin who created the link |

### Default Contexts

For new academic years, these contexts should be pre-populated (admin can modify during year setup):

- Autonomous Context
- Applied Context
- Digital Context
- Socio-Political Context
- Jewelry Context

### Status Workflow

```
draft ──────────────────┐
   │                    │
   ▼                    │
image_missing ──────────┤ (missing main image or below resolution)
   │                    │
   ▼                    │
submitted ◄─────────────┘ (student submits for review)
   │
   ▼
ready_for_print (admin approves, project LOCKED for student edits)
   │
   ▼ (after designers export ZIP)
published (visible on website, student can edit freely, changes go live immediately)
```

### Tags (fixed global list)

audio, ceramic, clay, digital, ink, installation, metal, paint, paper, performance, photography, screenprinting, sculpture, silver, textile, video

---

## Image Requirements

### Main Image (for print)

- Minimum resolution: 3000x3000px (or equivalent ~9MP)
- Formats: JPEG, PNG, TIFF
- Color space: sRGB or CMYK
- **Validation**: Projects without valid main image are set to `image_missing` status
- Students can update other fields but cannot submit until image is valid

### Gallery Images (web only)

- Minimum resolution: 1200px on longest side
- Formats: JPEG, PNG, GIF
- Order: Fixed by upload sequence (no reordering in v1)

### Cloudflare Images Variants

| Variant | Width | Use Case |
|---------|-------|----------|
| small | 480w | Mobile |
| medium | 800w | Tablet |
| large | 1200w | Laptop |
| xl | 1600w | Desktop |
| ultra | 2000w | Retina/High-res |

### Original Images

Cloudflare Images stores originals. Use the `original` variant for print export ZIP files.

---

## User Roles

### Student

- Receives magic link email when admin creates their account
- Can create/edit their own project (one per academic year)
- Can upload images with real-time resolution validation
- Can save draft with incomplete fields
- Can submit project for review (all required fields must be complete)
- **Cannot edit** when status is `ready_for_print`
- **Can edit freely** when status is `published` (changes go live immediately)

### Admin

- Can view all projects
- Can mark projects as "ready for print" (locks student edits)
- Can mark projects as "published"
- Can edit any project
- Can filter/search projects by status, context, year
- Can create new academic years with context setup
- Can import students via CSV upload
- Can generate time-limited edit links for alumni
- **Cannot** manage admin accounts

### Super Admin

- All admin permissions
- Can download ZIP exports with high-res images
- Can manage admin accounts (create/delete admins)
- Can perform destructive operations
- Can manage system configuration

---

## Authentication

### Magic Link Flow (No Passwords)

1. Admin creates student account (email + name + context assignment)
2. System sends email via Resend with magic link
3. Student clicks link, gets authenticated session
4. Sessions persist via secure cookie

### Email Configuration

- **Provider**: Resend
- **From address**: info@sintlucasmasters.com
- **Environment variable**: `RESEND_API_KEY` in `.dev.vars`

### Alumni Edit Links

- Admin can generate time-limited edit links for graduated students
- Links are reusable within the time window (e.g., 1 month)
- Only allows editing the specific project, nothing else
- Stored in `AlumniEditToken` table

---

## Features & Tasks

### 1. Database & API

- [ ] Design D1 schema with migrations (including new tables: AcademicYear, Context, MagicLinkToken, AlumniEditToken)
- [ ] Create Project CRUD API endpoints
- [ ] Create ProjectImage API endpoints
- [ ] Implement image upload endpoint with Cloudflare Images
- [ ] Add image dimension validation (reject if below minimum, set `image_missing` status)
- [ ] Create bulk export endpoint (ZIP with original images)
- [ ] Create academic year management endpoints
- [ ] Create context management endpoints (per-year)

### 2. Authentication

- [ ] Magic link generation and sending via Resend
- [ ] Magic link verification endpoint
- [ ] Session management (secure cookies)
- [ ] Alumni edit token generation and verification
- [ ] Role-based access control middleware
- [ ] GDPR: Student deletion request handling

### 3. Student Portal (React SPA, Mobile-First)

- [ ] Project creation/edit form with character limits
- [ ] Image upload with drag-and-drop
- [ ] Real-time image validation feedback (resolution check)
- [ ] **Live preview** of project page while editing
- [ ] Save as draft (even with incomplete fields)
- [ ] Submit for review button (validates all required fields)
- [ ] Visual indication of missing required fields
- [ ] Read-only view when status is `ready_for_print`
- [ ] Post-publish edit mode (changes go live immediately)

### 4. Admin Portal (React SPA)

- [ ] Dashboard with project list (filterable by status, context, year)
- [ ] Pending submissions count badge
- [ ] Project detail view with edit capability
- [ ] "Mark as ready for print" action (locks student edits)
- [ ] "Publish" action
- [ ] **Bulk publish**: Set all `ready_for_print` projects to `published`
- [ ] **Bulk export**: ZIP download for print production
- [ ] Academic year creation with context setup wizard
- [ ] CSV import for student list (columns: name, email, context)
- [ ] Alumni edit link generation (with expiry date picker)
- [ ] Admin slug collision warning during student import

### 5. Super Admin Features

- [ ] Admin account management (create/delete)
- [ ] System configuration panel
- [ ] ZIP export with original images

### 6. Public Website (Static, SEO-Optimized)

- [ ] Static site generation triggered on project publish
- [ ] Homepage with grid of current year projects
- [ ] Project detail page at `/{year}/{student-slug}`
- [ ] Archive page with year selector
- [ ] Filter by context
- [ ] Filter by tags
- [ ] Basic text search (student name, project title)
- [ ] Responsive design
- [ ] SEO metadata (title, description, Open Graph)
- [ ] Smart prefetching for fast navigation
- [ ] Cloudflare Analytics integration

### 7. ZIP Export Format

Structure for print vendor (non-technical recipient):

```
export-2024-2025/
├── jan-de-vries/
│   ├── main.jpg (original resolution)
│   ├── gallery-1.jpg
│   ├── gallery-2.jpg
│   └── info.txt
├── maria-santos/
│   ├── main.jpg
│   └── info.txt
└── manifest.csv (optional overview)
```

`info.txt` format (Markdown):

```markdown
# Jan De Vries
## Project Title Here

**Context:** Digital Context
**Year:** 2024-2025
**Tags:** photography, digital, installation

### Summary
Short summary text for print catalog (max 300 chars)...

### Description
Full project description...

### Main Image Caption
Caption text here...

### Links
- https://instagram.com/jandevries
- https://jandevries.com
```

### 8. Data Migration

- [ ] Create idempotent migration script to parse all student markdown files (307 files across 2021-2025)
- [ ] Handle two image reference formats (full URLs vs relative paths)
- [ ] Generate UUIDs for Project and ProjectImage records
- [ ] Create AcademicYear records for 2021-2025
- [ ] Create Context records per year
- [ ] Insert projects into D1 database
- [ ] Insert project images with correct sort order
- [ ] Set all migrated projects to `published` status
- [ ] Validate migrated data (counts, required fields, image accessibility)
- [ ] Support dry-run mode to preview changes

#### Image Format Handling

**2021-2024 format** (full Cloudflare URLs):
```yaml
main_image: 'https://imagedelivery.net/7-GLn6-56OyK7JwwGe0hfg/bf666892-6c85-4a27-b2f2-e46a66740e00'
```
Extract Cloudflare ID: `bf666892-6c85-4a27-b2f2-e46a66740e00`

**2025 format** (relative paths):
```yaml
main_image: alix-spooren/13TDsml0WUunYSaBjfJA1A0WXuz-5_bRn.jpg
```
Cloudflare ID is the full path: `alix-spooren/13TDsml0WUunYSaBjfJA1A0WXuz-5_bRn.jpg`

**Migration logic:**
```javascript
function extractCloudflareId(imageRef) {
  const CF_BASE = 'https://imagedelivery.net/7-GLn6-56OyK7JwwGe0hfg/';
  if (imageRef.startsWith(CF_BASE)) {
    return imageRef.replace(CF_BASE, '').replace(/\/.*$/, ''); // Remove variant suffix
  }
  return imageRef; // Already a relative path/ID
}
```

#### Migration Data Mapping

| Source (Markdown) | Target (D1) | Notes |
|-------------------|-------------|-------|
| `student_name` | `Project.student_name` | Direct copy |
| `project_title` | `Project.project_title` | Direct copy |
| `context` | `Project.context_id` | Look up Context by name + year |
| `year` | `Project.academic_year_id` | Normalize format, look up AcademicYear |
| `bio` | `Project.bio` | Optional, may be empty |
| Body content | `Project.description` | Markdown content after frontmatter |
| — | `Project.summary` | Extract first 300 chars of description for migrated data |
| `main_image` | `Project.main_image_id` | Extract Cloudflare ID |
| `thumb_image` | `Project.thumb_image_id` | Optional, extract ID if present |
| `tags` | `Project.tags` | JSON array |
| `social_links` | `Project.social_links` | JSON array of URLs |
| `images[]` | `ProjectImage` records | One record per image, with sort_order |
| — | `Project.status` | Set to `published` for all migrated data |
| — | `Project.slug` | Generate from student_name |

### 9. Infrastructure

- [ ] Set up Cloudflare Pages project
- [ ] Configure D1 database
- [ ] Configure Cloudflare Images variants (small, medium, large, xl, ultra)
- [ ] Configure custom domain
- [ ] Set up Resend integration
- [ ] Create `config.ts` with environment-specific settings

---

## URL Structure

### Public Website

- `/` - Homepage (current year grid)
- `/2024-2025/` - Year archive
- `/2024-2025/jan-de-vries` - Project detail page
- `/archive` - All years overview
- `/context/digital-context` - Filter by context

### Student Portal

- `/portal` - Student dashboard (their project)
- `/portal/edit` - Edit project form

### Admin Portal

- `/admin` - Dashboard with project list
- `/admin/projects/:id` - Project detail/edit
- `/admin/years` - Academic year management
- `/admin/years/:id/setup` - Context setup for year
- `/admin/export` - ZIP export interface

### API

- `/api/auth/magic-link` - Request magic link
- `/api/auth/verify` - Verify magic link token
- `/api/projects` - Project CRUD
- `/api/projects/:id/images` - Image management
- `/api/admin/years` - Year management
- `/api/admin/export` - Generate export ZIP

---

## Configuration

`config.ts` should include:

```typescript
export const config = {
  email: {
    from: 'info@sintlucasmasters.com',
    replyTo: 'info@sintlucasmasters.com',
  },
  cloudflare: {
    accountHash: '7-GLn6-56OyK7JwwGe0hfg',
    imagesBaseUrl: 'https://imagedelivery.net/7-GLn6-56OyK7JwwGe0hfg',
  },
  validation: {
    mainImageMinWidth: 3000,
    mainImageMinHeight: 3000,
    galleryImageMinWidth: 1200,
    titleMaxLength: 100,
    summaryMaxLength: 300,
    descriptionMaxLength: 1500,
    mainImageCaptionMaxLength: 200,
  },
  alumniEditLinkDuration: 30, // days
};
```

---

## Migration Notes

### Source Data Summary

| Year | Students | Image Format |
|------|----------|--------------|
| 2021 | ~60 | Full Cloudflare URLs |
| 2022 | ~60 | Full Cloudflare URLs |
| 2023 | ~60 | Full Cloudflare URLs |
| 2024 | ~60 | Full Cloudflare URLs |
| 2025 | ~67 | Relative paths (student-slug/image-id.ext) |
| **Total** | **~307** | |

### Year Format Normalization

The `year` field has inconsistent formatting:
- 2021-2023: Uses em-dash: `"2020—2021"`, `"2022—2023"`
- 2024-2025: Uses hyphen: `"2023-2024"`, `"2024-2025"`

Migration should normalize all to hyphen format: `"YYYY-YYYY"`

### D1 Schema Notes

Since D1 is SQLite-based:
- Arrays stored as JSON strings (e.g., `tags`, `social_links`)
- UUIDs stored as TEXT
- Booleans stored as INTEGER (0/1)

---

## Security Considerations

- Magic link tokens: Single-use, short expiry (15 minutes)
- Alumni edit tokens: Longer expiry (configurable, default 30 days), reusable
- Session cookies: HttpOnly, Secure, SameSite=Strict
- CSRF protection on all mutating endpoints
- Rate limiting on auth endpoints
- Input sanitization for all user content
- Image uploads validated server-side (not just client)

---

## Data Retention & GDPR

- **Default**: Projects kept permanently as portfolio archive
- **Student deletion requests**: Students can request complete deletion of their project and personal data
- Deletion removes: Project, ProjectImages, User record, any tokens
- Cloudflare Images deletion via API

---

## Resolved Questions

- [x] How do students authenticate? → Magic links only (no passwords)
- [x] Should students be able to delete their project entirely? → Yes, via GDPR deletion request
- [x] What happens to projects after graduation? → Permanent archive, time-limited edit links available
- [x] Do we need revision history for projects? → No (v1)
- [x] Print deadline workflow - lock edits after certain date? → Lock on admin approval (`ready_for_print` status)

---

## Out of Scope (v1)

- Revision history / audit trail
- Real-time collaboration
- Commenting on projects
- Bulk image reordering
- Preview deployments / staging environment
- Multiple projects per student per year
- School SSO integration
- Image AI upscaling
