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
- **Media Storage**: Cloudflare Images (already integrated)
- **Authentication**: TBD (Cloudflare Access? Custom auth?)

---

## Data Model

### Project

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | uuid | yes | Primary key |
| student_name | string | yes | Full name of the student |
| project_title | string | yes | Title of the master project |
| context | enum | yes | One of the 5 contexts (see below) |
| academic_year | string | yes | Format: "2024-2025" |
| bio | text | no | Student biography/artist statement |
| description | text | yes | Project description (markdown) |
| main_image_id | string | yes | Cloudflare Images ID - used for print |
| thumb_image_id | string | no | Square thumbnail (falls back to main_image) |
| tags | TEXT (JSON) | no | Material/medium tags as JSON array |
| social_links | TEXT (JSON) | no | Portfolio, Instagram, etc. as JSON array |
| status | enum | yes | draft, submitted, ready_for_print, published |
| created_at | datetime | yes | |
| updated_at | datetime | yes | |

### ProjectImage

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | uuid | yes | Primary key |
| project_id | uuid | yes | Foreign key to Project |
| cloudflare_id | string | yes | Cloudflare Images ID |
| sort_order | int | yes | Display order |
| caption | string | no | Image caption |

### Contexts (enum)

- Autonomous Context
- Applied Context
- Digital Context
- Socio-Political Context
- Jewelry Context

### Status (enum)

- `draft` - Student is still editing
- `submitted` - Student has submitted for review
- `ready_for_print` - Admin (Nicolas) approved for print
- `published` - Visible on public website

### Tags (enum)

Based on existing CMS config:
audio, ceramic, clay, digital, ink, installation, metal, paint, paper, performance, photography, screenprinting, sculpture, silver, textile, video

---

## Image Requirements

### Main Image (for print)
- Minimum resolution: 3000x3000px (or equivalent ~9MP)
- Formats: JPEG, PNG, TIFF
- Color space: sRGB or CMYK
- This image is used for the printed catalog

### Gallery Images (web only)
- Minimum resolution: 1200px on longest side
- Formats: JPEG, PNG, GIF
- Automatically optimized by Cloudflare Images

### Thumbnail
- Should be square (1:1 aspect ratio)
- Minimum 800x800px
- If not provided, crop from main_image center

---

## User Roles

### Student
- Can create/edit their own project
- Can upload images
- Can submit project for review
- Can edit after print (but changes won't affect printed version)

### Admin (Nicolas)
- Can view all projects
- Can mark projects as "ready for print"
- Can edit any project
- Can filter/search projects

### Super Admin (Chloé)
- All admin permissions
- Can download ZIP exports with high-res images
- Can manage student accounts

---

## Features & Tasks

### 1. Database & API

- [ ] Design D1 schema with migrations
- [ ] Create Project CRUD API endpoints
- [ ] Create ProjectImage API endpoints
- [ ] Implement image upload endpoint with Cloudflare Images
- [ ] Add image dimension validation (reject if below minimum)
- [ ] Create bulk export endpoint (ZIP with high-res images)

### 2. Authentication

- [ ] Decide on auth approach (Cloudflare Access vs custom)
- [ ] Student login/registration flow
- [ ] Admin login flow
- [ ] Role-based access control middleware

### 3. Student Portal

- [ ] Project creation form
- [ ] Image upload with drag-and-drop
- [ ] Real-time image validation feedback (resolution check)
- [ ] Preview of project page
- [ ] Submit for review button
- [ ] Edit mode after submission (with warning about print)

### 4. Admin Portal

- [ ] Dashboard with project list (filterable by status, context, year)
- [ ] Project detail view with edit capability
- [ ] "Mark as ready for print" action
- [ ] "Publish" action
- [ ] Bulk actions (publish all ready projects)
- [ ] ZIP download for print production

### 5. Public Website

- [ ] Homepage with grid of current year projects
- [ ] Project detail page
- [ ] Archive page with year selector
- [ ] Filter by context
- [ ] Filter by tags
- [ ] Responsive design
- [ ] SEO metadata

### 6. Data Migration

- [ ] Create migration script to parse all student markdown files (307 files across 2021-2025)
- [ ] Handle two image reference formats (see below)
- [ ] Generate UUIDs for Project and ProjectImage records
- [ ] Insert projects into D1 database
- [ ] Insert project images with correct sort order
- [ ] Validate migrated data (counts, required fields, image accessibility)
- [ ] Create rollback script in case of issues

#### Image Format Handling

The existing markdown files use two different image reference formats:

**2021-2024 format** (full Cloudflare URLs):
```yaml
main_image: 'https://imagedelivery.net/7-GLn6-56OyK7JwwGe0hfg/bf666892-6c85-4a27-b2f2-e46a66740e00'
images:
  - https://imagedelivery.net/7-GLn6-56OyK7JwwGe0hfg/84c53e0b-a621-4c69-724c-9b5c66f91000
```
Extract Cloudflare ID: `bf666892-6c85-4a27-b2f2-e46a66740e00`

**2025 format** (relative paths):
```yaml
main_image: alix-spooren/13TDsml0WUunYSaBjfJA1A0WXuz-5_bRn.jpg
images:
  - alix-spooren/1OervsXFuXVsr6XICtkQqoaxevUomFr9C.jpg
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
| `context` | `Project.context` | Validate against enum |
| `year` | `Project.academic_year` | Normalize format (e.g., "2020—2021" → "2020-2021") |
| `bio` | `Project.bio` | Optional, may be empty |
| Body content | `Project.description` | Markdown content after frontmatter |
| `main_image` | `Project.main_image_id` | Extract Cloudflare ID |
| `thumb_image` | `Project.thumb_image_id` | Optional, extract ID if present |
| `tags` | `Project.tags` | JSON array |
| `social_links` | `Project.social_links` | JSON array |
| `images[]` | `ProjectImage` records | One record per image, with sort_order |
| — | `Project.status` | Set to `published` for all migrated data |
| — | `Project.created_at` | Set to migration timestamp |
| — | `Project.updated_at` | Set to migration timestamp |

#### Migration Script Steps

1. **Parse**: Read all `*/students/*.md` files using gray-matter
2. **Transform**: Map frontmatter + body to Project schema
3. **Normalize**: Fix year format inconsistencies (em-dash vs hyphen)
4. **Extract IDs**: Convert image references to Cloudflare Image IDs
5. **Validate**: Check required fields, valid context enum, image accessibility
6. **Insert**: Batch insert into D1 (Projects first, then ProjectImages)
7. **Verify**: Count records, spot-check random entries, verify image URLs work

### 7. Infrastructure

- [ ] Set up Cloudflare Pages project
- [ ] Configure D1 database
- [ ] Set up Cloudflare Images bucket
- [ ] Configure custom domain
- [ ] Set up staging environment

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

### Cloudflare Images Account

- Account hash: `7-GLn6-56OyK7JwwGe0hfg`
- Delivery URL pattern: `https://imagedelivery.net/7-GLn6-56OyK7JwwGe0hfg/{image_id}/{variant}`
- Available variants: `xl`, `large`, `medium`, `thumb` (to be configured)

### Year Format Normalization

The `year` field has inconsistent formatting:
- 2021-2023: Uses em-dash: `"2020—2021"`, `"2022—2023"`
- 2024-2025: Uses hyphen: `"2023-2024"`, `"2024-2025"`

Migration should normalize all to hyphen format: `"YYYY-YYYY"`

### D1 Schema Notes

Since D1 is SQLite-based, arrays must be stored as JSON strings:
- `tags`: `TEXT` column containing JSON array, e.g., `'["photography","digital"]'`
- `social_links`: `TEXT` column containing JSON array

---

## Open Questions

- [ ] How do students authenticate? Magic link? Password? School SSO?
- [ ] Should students be able to delete their project entirely?
- [ ] What happens to projects after graduation? Permanent archive?
- [ ] Do we need revision history for projects?
- [ ] Print deadline workflow - lock edits after certain date?
